import { BaseWindow, WebContentsView, shell, Session } from 'electron';
import log from 'electron-log';
import PluginShell from './plugin_shell';
import type { ToolkitPlugin } from '../types/plugin';

/** single 壳内最多缓存几个非当前插件 View */
const MAX_CACHED_VIEWS = 1;

/** multi 悬停预热：每插件最多 1 个隐藏窗；移出即销毁 */
const MAX_MULTI_READY = 1;

/** 灰底 + CSS 转圈，冷启动时遮罩用 */
const LOADING_PAGE_URL = `data:text/html;charset=utf-8,${encodeURIComponent(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><style>
  html,body{margin:0;height:100%;background:#e8e8e8;
    display:flex;align-items:center;justify-content:center;
    font-family:system-ui,sans-serif;color:#666;user-select:none}
  .box{display:flex;flex-direction:column;align-items:center;gap:14px}
  .spin{width:36px;height:36px;border:3px solid #c8c8c8;border-top-color:#666;
    border-radius:50%;animation:r .7s linear infinite}
  @keyframes r{to{transform:rotate(360deg)}}
  .t{font-size:13px;letter-spacing:.02em}
</style></head><body><div class="box"><div class="spin"></div><div class="t">加载中…</div></div></body></html>`)}`;

export interface PluginViewHostDeps {
  getPlugin(name: string): ToolkitPlugin | undefined;
  resolvePluginUrl(name: string, plugin: ToolkitPlugin): Promise<string>;
  ensureSession(name: string): Session;
  getAppDir(): string;
  getIconPath(plugin: ToolkitPlugin): string;
  onViewDestroyed(name: string): void;
}

type MultiReady = { win: BaseWindow; view: WebContentsView };

/**
 * - single：单壳复用 View；关闭壳=隐藏并销毁全部 View
 * - multi：独立窗，关闭即销毁
 * - 悬停预热：移出卡片则终止并销毁预热实例
 */
class PluginViewHost {
  private shell = new PluginShell();

  private views = new Map<string, WebContentsView>();

  private lru: string[] = [];

  private activeName: string | null = null;

  private creating = new Map<string, Promise<WebContentsView>>();

  private resizeBound = false;

  private multiInstanceCount = new Map<string, number>();

  private detachedWindows = new Set<BaseWindow>();

  private detachedByPlugin = new Map<string, Set<BaseWindow>>();

  private detachedViews = new WeakMap<BaseWindow, WebContentsView>();

  private loadingByWindow = new WeakMap<BaseWindow, WebContentsView>();

  /** multi 悬停预热池（隐藏） */
  private multiReady = new Map<string, MultiReady[]>();

  private multiPreparing = new Set<string>();

  /** 递增后丢弃进行中的预热结果（鼠标移出） */
  private prepareEpoch = new Map<string, number>();

  /** single：标记为「仅预热、尚未正式打开」的 View，移出可销毁 */
  private singleHoverPrepared = new Set<string>();

  constructor(private deps: PluginViewHostDeps) {}

  /** 悬停预热 */
  public prepare(name: string) {
    const plugin = this.deps.getPlugin(name);
    if (!plugin) return;

    const epoch = (this.prepareEpoch.get(name) ?? 0) + 1;
    this.prepareEpoch.set(name, epoch);

    if (plugin.mode === 'single') {
      void this.ensureSinglePrepared(name, plugin, epoch);
    } else {
      void this.ensureMultiPrepared(name, plugin, epoch);
    }
  }

  /** 鼠标移出：终止预热并销毁预热实例 */
  public cancelPrepare(name: string) {
    this.prepareEpoch.set(name, (this.prepareEpoch.get(name) ?? 0) + 1);

    // multi 预热窗
    const pool = this.multiReady.get(name);
    if (pool?.length) {
      this.multiReady.delete(name);
      for (const item of pool) {
        this.destroyDetachedWindow(item.win);
      }
      log.info(`[prepare] cancelled multi: ${name}`);
    }

    // single：仅销毁「悬停预热且壳未在展示该插件」的 View
    if (this.singleHoverPrepared.has(name)) {
      const showing =
        this.activeName === name && this.shell.isVisible();
      if (!showing) {
        this.singleHoverPrepared.delete(name);
        this.destroyView(name);
        log.info(`[prepare] cancelled single: ${name}`);
      }
    }
  }

  public async activate(name: string): Promise<void> {
    const plugin = this.deps.getPlugin(name);
    if (!plugin) {
      log.error(`PluginViewHost.activate: plugin not found "${name}"`);
      return;
    }

    // 正式打开：预热不再视为可取消
    this.singleHoverPrepared.delete(name);
    this.prepareEpoch.set(name, (this.prepareEpoch.get(name) ?? 0) + 1);

    if (plugin.mode === 'single') {
      await this.activateSingle(name, plugin);
      return;
    }

    await this.openMultiInstance(name, plugin);
  }

  private async ensureSinglePrepared(
    name: string,
    plugin: ToolkitPlugin,
    epoch: number,
  ) {
    const existing = this.views.get(name);
    if (existing && !existing.webContents.isDestroyed()) return;

    this.shell.ensure();
    this.bindShellResizeOnce();

    let task = this.creating.get(name);
    if (!task) {
      task = this.createShellView(name, plugin).finally(() => {
        this.creating.delete(name);
      });
      this.creating.set(name, task);
    }

    try {
      const view = await task;
      if (this.prepareEpoch.get(name) !== epoch) {
        // 已移出：丢掉刚建好的 View
        if (!view.webContents.isDestroyed()) {
          this.disposeView(view, this.shell.getWindow());
        }
        this.views.delete(name);
        this.lru = this.lru.filter((n) => n !== name);
        this.deps.onViewDestroyed(name);
        return;
      }
      if (view.webContents.isDestroyed()) return;
      this.views.set(name, view);
      this.touchLru(name);
      this.evictIfNeeded(name);
      view.setVisible(false);
      this.singleHoverPrepared.add(name);
      log.info(`[prepare] single ready: ${name}`);
    } catch (err) {
      log.error(`[prepare] single failed: ${name}`, err);
    }
  }

  private async ensureMultiPrepared(
    name: string,
    plugin: ToolkitPlugin,
    epoch: number,
  ) {
    const pool = this.multiReady.get(name) ?? [];
    if (pool.length >= MAX_MULTI_READY) return;
    if (this.multiPreparing.has(name)) return;

    this.multiPreparing.add(name);
    let win: BaseWindow | null = null;
    try {
      const urlPromise = this.deps.resolvePluginUrl(name, plugin);
      const host = this.createDetachedHost(name, plugin);
      win = host.win;
      const { view } = host;

      const url = await urlPromise;
      if (this.prepareEpoch.get(name) !== epoch) {
        this.destroyDetachedWindow(win);
        return;
      }
      if (win.isDestroyed() || view.webContents.isDestroyed()) return;
      await this.waitDomReady(view, url);
      if (this.prepareEpoch.get(name) !== epoch) {
        this.destroyDetachedWindow(win);
        return;
      }
      if (win.isDestroyed() || view.webContents.isDestroyed()) return;

      win.hide();
      view.setVisible(true);
      this.pushMultiReady(name, { win, view });
      log.info(`[prepare] multi ready: ${name}`);
    } catch (err) {
      log.error(`[prepare] multi failed: ${name}`, err);
      if (win && !win.isDestroyed()) this.destroyDetachedWindow(win);
    } finally {
      this.multiPreparing.delete(name);
    }
  }

  private async activateSingle(name: string, plugin: ToolkitPlugin) {
    this.shell.ensure();
    this.bindShellResizeOnce();

    const existing = this.views.get(name);
    if (existing && !existing.webContents.isDestroyed()) {
      await this.reviveAndPresent(name, plugin, existing);
      return;
    }

    const win = this.shell.getWindow();
    this.shell.setTitle(plugin.pluginName || plugin.name);
    try {
      win?.setIcon(this.deps.getIconPath(plugin));
    } catch {
      /* ignore */
    }

    if (win && !win.isDestroyed()) {
      this.showLoadingOverlay(win);
      this.shell.show();
    }

    try {
      let task = this.creating.get(name);
      if (!task) {
        task = this.createShellView(name, plugin).finally(() => {
          this.creating.delete(name);
        });
        this.creating.set(name, task);
      }

      const view = await task;
      if (view.webContents.isDestroyed()) return;

      this.views.set(name, view);
      this.touchLru(name);
      this.evictIfNeeded(name);
      this.present(name, plugin);
    } finally {
      if (win && !win.isDestroyed()) this.hideLoadingOverlay(win);
    }
  }

  private async openMultiInstance(name: string, plugin: ToolkitPlugin) {
    const warmed = this.takeMultiReady(name);
    if (warmed) {
      this.trackDetached(name, warmed.win);
      this.showDetached(warmed.win, warmed.view);
      return;
    }

    const urlPromise = this.deps.resolvePluginUrl(name, plugin);
    const { win, view } = this.createDetachedHost(name, plugin);
    this.trackDetached(name, win);

    view.setVisible(false);
    this.showLoadingOverlay(win);
    if (!win.isDestroyed()) {
      win.show();
      win.focus();
    }

    try {
      const url = await urlPromise;
      await this.waitDomReady(view, url);
      if (win.isDestroyed() || view.webContents.isDestroyed()) return;
      view.setVisible(true);
      this.layoutDetached(win, view);
      view.webContents.focus();
    } catch (err) {
      log.error(`openMultiInstance load failed: ${name}`, err);
      if (!win.isDestroyed()) win.destroy();
    } finally {
      if (!win.isDestroyed()) this.hideLoadingOverlay(win);
    }
  }

  private takeMultiReady(name: string): MultiReady | null {
    const pool = this.multiReady.get(name);
    if (!pool || pool.length === 0) return null;
    const item = pool.shift()!;
    if (pool.length === 0) this.multiReady.delete(name);
    if (item.win.isDestroyed() || item.view.webContents.isDestroyed()) {
      return this.takeMultiReady(name);
    }
    return item;
  }

  private pushMultiReady(name: string, item: MultiReady) {
    let pool = this.multiReady.get(name);
    if (!pool) {
      pool = [];
      this.multiReady.set(name, pool);
    }
    pool.push(item);
    while (pool.length > MAX_MULTI_READY) {
      const overflow = pool.shift()!;
      this.destroyDetachedWindow(overflow.win);
    }
  }

  private createDetachedHost(name: string, plugin: ToolkitPlugin): {
    win: BaseWindow;
    view: WebContentsView;
  } {
    const ses = this.deps.ensureSession(name);
    const icon = this.deps.getIconPath(plugin);

    const win = this.shell.createDetached({
      title: plugin.pluginName || plugin.name,
      icon,
    });

    const view = new WebContentsView({
      webPreferences: {
        session: ses,
        webSecurity: false,
        contextIsolation: true,
        backgroundThrottling: false,
        preload: plugin.preload ? plugin.preloadPath : undefined,
        webviewTag: true,
        nodeIntegration: true,
        navigateOnDragDrop: true,
        experimentalFeatures: true,
        spellcheck: false,
        additionalArguments: [`--toolkit-app-dir=${this.deps.getAppDir()}`],
      },
    });

    win.contentView.addChildView(view);
    this.detachedViews.set(win, view);
    this.bindViewNavigation(view);
    win.on('resize', () => {
      this.layoutDetached(win, view);
      this.layoutLoadingIfAny(win);
    });
    this.layoutDetached(win, view);

    return { win, view };
  }

  private trackDetached(name: string, win: BaseWindow) {
    win.removeAllListeners('close');
    win.removeAllListeners('closed');

    this.detachedWindows.add(win);
    let group = this.detachedByPlugin.get(name);
    if (!group) {
      group = new Set();
      this.detachedByPlugin.set(name, group);
    }
    group.add(win);
    this.multiInstanceCount.set(
      name,
      (this.multiInstanceCount.get(name) ?? 0) + 1,
    );

    // 关闭即销毁（卸 View 再关窗，避免渲染进程残留）
    win.on('close', () => {
      this.hideLoadingOverlay(win);
      const view = this.detachedViews.get(win);
      if (view) this.disposeView(view, win);
    });

    win.on('closed', () => {
      this.detachedWindows.delete(win);
      this.detachedByPlugin.get(name)?.delete(win);
      if (this.detachedByPlugin.get(name)?.size === 0) {
        this.detachedByPlugin.delete(name);
      }
      const left = (this.multiInstanceCount.get(name) ?? 1) - 1;
      if (left <= 0) {
        this.multiInstanceCount.delete(name);
        this.deps.onViewDestroyed(name);
      } else {
        this.multiInstanceCount.set(name, left);
      }
      this.logProcessHint('detached-closed');
      if (global.gc) global.gc();
    });
  }

  /** 销毁未 track 的预热窗（或强制拆掉） */
  private destroyDetachedWindow(win: BaseWindow) {
    if (win.isDestroyed()) return;
    this.hideLoadingOverlay(win);
    const view = this.detachedViews.get(win);
    if (view) this.disposeView(view, win);
    // 若已 track，走正常 destroy；否则直接 destroy
    if (!win.isDestroyed()) win.destroy();
  }

  private showLoadingOverlay(win: BaseWindow): WebContentsView {
    const existing = this.loadingByWindow.get(win);
    if (existing && !existing.webContents.isDestroyed()) {
      this.bringToFront(win, existing);
      this.layoutInWindow(win, existing);
      existing.setVisible(true);
      return existing;
    }

    const view = new WebContentsView({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        backgroundThrottling: false,
        spellcheck: false,
      },
    });
    win.contentView.addChildView(view);
    this.layoutInWindow(win, view);
    this.loadingByWindow.set(win, view);
    view.webContents.loadURL(LOADING_PAGE_URL).catch((err) => {
      log.warn('loading overlay load failed', err);
    });
    return view;
  }

  private hideLoadingOverlay(win: BaseWindow) {
    const view = this.loadingByWindow.get(win);
    if (!view) return;
    this.loadingByWindow.delete(win);
    this.disposeView(view, win);
  }

  private layoutLoadingIfAny(win: BaseWindow) {
    const loading = this.loadingByWindow.get(win);
    if (loading && !loading.webContents.isDestroyed()) {
      this.layoutInWindow(win, loading);
    }
  }

  private bringToFront(win: BaseWindow, view: WebContentsView) {
    if (win.isDestroyed() || view.webContents.isDestroyed()) return;
    try {
      win.contentView.removeChildView(view);
      win.contentView.addChildView(view);
    } catch {
      /* ignore */
    }
  }

  private layoutInWindow(win: BaseWindow, view: WebContentsView) {
    if (win.isDestroyed() || view.webContents.isDestroyed()) return;
    const [width, height] = win.getContentSize();
    view.setBounds({
      x: 0,
      y: 0,
      width: width > 1 ? width : 1200,
      height: height > 1 ? height : 740,
    });
  }

  private disposeView(view: WebContentsView, parent?: BaseWindow | null) {
    if (view.webContents.isDestroyed()) return;
    if (parent && !parent.isDestroyed()) {
      try {
        parent.contentView.removeChildView(view);
      } catch {
        /* ignore */
      }
    }
    try {
      view.webContents.close();
    } catch {
      /* ignore */
    }
  }

  private logProcessHint(tag: string) {
    try {
      const shells = BaseWindow.getAllWindows().length;
      let ready = 0;
      for (const pool of this.multiReady.values()) ready += pool.length;
      log.info(
        `[mem] ${tag}: BaseWindow=${shells}, detached=${this.detachedWindows.size}, shellViews=${this.views.size}, multiReady=${ready}`,
      );
    } catch {
      /* ignore */
    }
  }

  private showDetached(win: BaseWindow, view: WebContentsView) {
    if (win.isDestroyed()) return;
    this.layoutDetached(win, view);
    view.setVisible(true);
    win.show();
    win.focus();
    view.webContents.focus();
  }

  private layoutDetached(win: BaseWindow, view: WebContentsView) {
    this.layoutInWindow(win, view);
  }

  public destroyView(name: string) {
    this.singleHoverPrepared.delete(name);
    const view = this.views.get(name);
    this.views.delete(name);
    this.lru = this.lru.filter((n) => n !== name);
    if (this.activeName === name) this.activeName = null;

    const pool = this.multiReady.get(name);
    if (pool) {
      this.multiReady.delete(name);
      for (const item of pool) {
        this.destroyDetachedWindow(item.win);
      }
    }

    const group = this.detachedByPlugin.get(name);
    if (group) {
      for (const win of [...group]) {
        if (!win.isDestroyed()) {
          this.hideLoadingOverlay(win);
          const detached = this.detachedViews.get(win);
          if (detached) this.disposeView(detached, win);
          win.destroy();
        }
      }
      this.detachedByPlugin.delete(name);
      this.multiInstanceCount.delete(name);
    }

    if (view && !view.webContents.isDestroyed()) {
      const shellWin = this.shell.getWindow();
      if (shellWin) this.hideLoadingOverlay(shellWin);
      this.disposeView(view, shellWin);
      return;
    }

    this.deps.onViewDestroyed(name);
  }

  public destroyAll() {
    const names = new Set([
      ...this.views.keys(),
      ...this.detachedByPlugin.keys(),
      ...this.multiReady.keys(),
    ]);
    for (const name of names) {
      this.destroyView(name);
    }
    for (const win of [...this.detachedWindows]) {
      if (!win.isDestroyed()) this.destroyDetachedWindow(win);
    }
    this.detachedWindows.clear();
    this.detachedByPlugin.clear();
    this.multiInstanceCount.clear();
    this.multiReady.clear();
    this.singleHoverPrepared.clear();
    const shellWin = this.shell.getWindow();
    if (shellWin && !shellWin.isDestroyed()) this.hideLoadingOverlay(shellWin);
    this.shell.destroy();
    this.resizeBound = false;
  }

  private async reviveAndPresent(
    name: string,
    plugin: ToolkitPlugin,
    view: WebContentsView,
  ) {
    const currentUrl = view.webContents.getURL();
    if (!currentUrl || currentUrl === 'about:blank') {
      const win = this.shell.getWindow();
      if (win && !win.isDestroyed()) {
        this.showLoadingOverlay(win);
        this.shell.show();
      }
      try {
        const url = await this.deps.resolvePluginUrl(name, plugin);
        await this.waitDomReady(view, url);
      } catch (err) {
        log.error(`revive view load failed: ${name}`, err);
      } finally {
        if (win && !win.isDestroyed()) this.hideLoadingOverlay(win);
      }
    }
    this.present(name, plugin);
  }

  private present(name: string, plugin: ToolkitPlugin) {
    const alreadyActive =
      this.activeName === name && this.shell.isVisible();

    this.activeName = name;
    this.touchLru(name);
    this.singleHoverPrepared.delete(name);

    this.shell.setTitle(plugin.pluginName || plugin.name);
    try {
      this.shell.getWindow()?.setIcon(this.deps.getIconPath(plugin));
    } catch {
      /* ignore */
    }

    this.shell.show();

    const win = this.shell.getWindow();
    const activeView = this.views.get(name);

    if (alreadyActive && activeView && !activeView.webContents.isDestroyed()) {
      this.layoutView(activeView);
      activeView.setVisible(true);
      activeView.webContents.focus();
      return;
    }

    for (const [n, v] of this.views) {
      if (v.webContents.isDestroyed()) continue;
      const active = n === name;
      if (active) {
        if (win && !win.isDestroyed()) {
          try {
            win.contentView.removeChildView(v);
            win.contentView.addChildView(v);
          } catch {
            /* ignore */
          }
        }
        this.layoutView(v);
        v.setVisible(true);
        v.webContents.focus();
      } else {
        v.setVisible(false);
      }
    }
  }

  private async createShellView(
    name: string,
    plugin: ToolkitPlugin,
  ): Promise<WebContentsView> {
    const urlPromise = this.deps.resolvePluginUrl(name, plugin);
    const ses = this.deps.ensureSession(name);

    const view = new WebContentsView({
      webPreferences: {
        session: ses,
        webSecurity: false,
        contextIsolation: true,
        backgroundThrottling: false,
        preload: plugin.preload ? plugin.preloadPath : undefined,
        webviewTag: true,
        nodeIntegration: true,
        navigateOnDragDrop: true,
        experimentalFeatures: true,
        spellcheck: false,
        additionalArguments: [`--toolkit-app-dir=${this.deps.getAppDir()}`],
      },
    });

    const win = this.shell.ensure();
    win.contentView.addChildView(view);
    view.setVisible(false);
    this.layoutView(view);
    this.bindViewNavigation(view);

    view.webContents.on('destroyed', () => {
      this.views.delete(name);
      this.lru = this.lru.filter((n) => n !== name);
      this.singleHoverPrepared.delete(name);
      if (this.activeName === name) this.activeName = null;
      this.deps.onViewDestroyed(name);
    });

    const url = await urlPromise;
    await this.waitDomReady(view, url);
    return view;
  }

  private bindViewNavigation(view: WebContentsView) {
    view.webContents.setWindowOpenHandler((data) => {
      shell.openExternal(data.url);
      return { action: 'deny' };
    });

    view.webContents.on('will-navigate', (event, navUrl) => {
      if (!navUrl.startsWith('file://')) {
        event.preventDefault();
        shell.openExternal(navUrl);
      }
    });
  }

  private waitDomReady(view: WebContentsView, url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const wc = view.webContents;
      let done = false;
      const timer = setTimeout(() => finish(), 8000);
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        cleanup();
        resolve();
      };
      const onFail = (_e: Electron.Event, _code: number, desc: string) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        cleanup();
        reject(new Error(`load failed: ${desc}`));
      };
      const cleanup = () => {
        wc.removeListener('dom-ready', finish);
        wc.removeListener('did-fail-load', onFail);
      };
      wc.once('dom-ready', finish);
      wc.once('did-fail-load', onFail);
      wc.loadURL(url).catch((err) => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          cleanup();
          reject(err);
        }
      });
    });
  }

  private bindShellResizeOnce() {
    if (this.resizeBound) return;
    const win = this.shell.getWindow();
    if (!win || win.isDestroyed()) return;
    this.resizeBound = true;

    win.on('resize', () => {
      for (const v of this.views.values()) {
        if (!v.webContents.isDestroyed()) this.layoutView(v);
      }
      this.layoutLoadingIfAny(win);
    });

    // 壳「关闭」实为 hide：释放全部 View（自动销毁）
    win.on('hide', () => {
      this.hideLoadingOverlay(win);
      for (const [n, view] of [...this.views]) {
        this.views.delete(n);
        this.lru = this.lru.filter((x) => x !== n);
        this.singleHoverPrepared.delete(n);
        this.disposeView(view, win);
        this.deps.onViewDestroyed(n);
      }
      this.activeName = null;
      this.logProcessHint('shell-hide');
      if (global.gc) global.gc();
    });
  }

  private layoutView(view: WebContentsView) {
    const { width, height } = this.shell.getContentSize();
    view.setBounds({ x: 0, y: 0, width, height });
  }

  private touchLru(name: string) {
    this.lru = this.lru.filter((n) => n !== name);
    this.lru.push(name);
  }

  private evictIfNeeded(keepName: string) {
    while (this.lru.length > MAX_CACHED_VIEWS) {
      const oldest = this.lru.find(
        (n) => n !== keepName && n !== this.activeName,
      );
      if (!oldest) break;
      log.info(`PluginViewHost LRU evict: ${oldest}`);
      this.destroyView(oldest);
    }
  }
}

export default PluginViewHost;
