import path from 'path';
import { execFile } from 'node:child_process';
import { pathToFileURL } from 'url';

import * as fs from 'fs';
import { session, Session } from 'electron';
import log from 'electron-log';
import Store from 'electron-store';
import WebContainer from './webContainer';
import PluginViewHost from './plugin_view_host';
import {
  deleteFolder,
  getAppDir,
  getAssetPath,
  readJsonObjFromFile,
} from './util';
import Setting from './setting';
import InitCheck from './init_check';
import type { ToolkitPlugin } from '../types/plugin';

// ─── Constants ───────────────────────────────────────────────────────────────

const SORT_SETTING_KEY = 'sortSettingId';

const IMAGE_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function imageToDataUri(filePath: string): string {
  try {
    const buf = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    return `data:${IMAGE_MIME[ext] || 'image/png'};base64,${buf.toString('base64')}`;
  } catch {
    try {
      const iconBuf = fs.readFileSync(getAssetPath('icon.png'));
      return `data:image/png;base64,${iconBuf.toString('base64')}`;
    } catch {
      return '';
    }
  }
}

function getSortData(store: Store): Map<string, number> {
  const raw = store.get(SORT_SETTING_KEY, {}) as Record<string, number>;
  return new Map(Object.entries(raw));
}

function saveSortData(store: Store, data: Map<string, number>) {
  store.set(SORT_SETTING_KEY, Object.fromEntries(data));
}

// ─── PluginManager ───────────────────────────────────────────────────────────

class PluginManager {
  private setting: Setting;

  private baseDir: string;

  private configDir: string;

  private appDir: string = getAppDir();

  private systemPreloadPath: string = path.join(
    __dirname,
    '../preload/index.js',
  );

  private container: WebContainer = new WebContainer();

  public allPlugins: ToolkitPlugin[] = [];

  private webContainers: Map<string, string> = new Map();

  private preparedSessions: Set<string> = new Set();

  private iconPathCache: Map<string, string> = new Map();

  private store = new Store();

  private viewHost: PluginViewHost;

  constructor(initCheck: InitCheck, setting: Setting) {
    this.setting = setting;
    this.baseDir = initCheck.pluginDir;
    this.configDir = initCheck.configDir;
    this.allPlugins = this.listPlugin();

    this.viewHost = new PluginViewHost({
      getPlugin: (name) => this.getPlugin(name),
      resolvePluginUrl: (name, plugin) => this.resolvePluginUrl(name, plugin),
      ensureSession: (name) => this.ensurePluginSession(name),
      getAppDir: () => this.appDir,
      getIconPath: (plugin) => this.resolveWindowIcon(plugin),
      onViewDestroyed: (name) => this.onPluginViewDestroyed(name),
    });

    // 空闲预热 persist session（轻量，不建窗）
    setImmediate(() => this.warmPluginSessions());
  }

  public warmPluginSessions() {
    for (const plugin of this.allPlugins) {
      this.ensurePluginSession(plugin.name);
    }
  }

  private ensurePluginSession(name: string): Session {
    const ses = session.fromPartition(`persist:<${name}>`);
    if (!this.preparedSessions.has(name)) {
      ses.setPreloads([this.systemPreloadPath]);
      this.preparedSessions.add(name);
    }
    return ses;
  }

  // ── Plugin listing ───────────────────────────────────────────────────────

  public listPlugin(): ToolkitPlugin[] {
    const files = fs.readdirSync(this.baseDir);
    const pluginList: ToolkitPlugin[] = [];

    for (const filename of files) {
      if (filename === 'cache') continue;
      const pluginPath = path.join(this.baseDir, filename);
      const pluginObj = this.readPluginMeta(pluginPath);
      if (pluginObj) pluginList.push(pluginObj);
    }

    this.applySortOrder(pluginList);
    this.allPlugins = pluginList;
    return pluginList;
  }

  private readPluginMeta(pluginPath: string): ToolkitPlugin | null {
    const packagePath = path.join(pluginPath, 'plugin.json');
    if (!fs.existsSync(packagePath)) return null;

    const packageJsonPath = path.join(pluginPath, 'package.json');
    const packageObj = readJsonObjFromFile(packageJsonPath) as Record<
      string,
      any
    >;
    const pluginObj = readJsonObjFromFile(packagePath) as Record<string, any>;

    if (packageObj) {
      pluginObj.name = packageObj.name;
      pluginObj.version = packageObj.version;
    }

    pluginObj.logoPath = pluginObj.logo
      ? imageToDataUri(path.join(pluginPath, pluginObj.logo))
      : imageToDataUri(getAssetPath('icon.png'));

    pluginObj.pluginPath = pluginPath;
    if (pluginObj.preload) {
      pluginObj.preloadPath = path.join(pluginPath, pluginObj.preload);
    }

    return pluginObj as ToolkitPlugin;
  }

  private applySortOrder(pluginList: ToolkitPlugin[]) {
    const { sort } = this.setting.getSetting();
    if (!sort) return;

    const sortData = getSortData(this.store);
    if (sortData.size === 0) return;

    pluginList.sort((a, b) => {
      const scoreA = sortData.get(a.name) ?? 0;
      const scoreB = sortData.get(b.name) ?? 0;
      return scoreB - scoreA;
    });
  }

  // ── Plugin operations ────────────────────────────────────────────────────

  public reloadPlugins() {
    this.listPlugin();
    setImmediate(() => this.warmPluginSessions());
  }

  public removePlugin(name: string) {
    this.viewHost.destroyView(name);

    try {
      const pluginPath = path.join(this.baseDir, name);
      if (fs.existsSync(pluginPath)) {
        deleteFolder(pluginPath);
      }
    } catch (error) {
      log.error('removePlugin has failed!', error);
    }
    this.reloadPlugins();
  }

  public getPlugin(name: string): ToolkitPlugin | undefined {
    return this.allPlugins.find((p) => p.name === name);
  }

  /** 在单壳 / 回收池策略下打开插件 */
  public async openPlugin(name: string): Promise<void> {
    setImmediate(() => this.trackPluginUsage(name));
    await this.viewHost.activate(name);
  }

  /** 悬停预热：预建 View / 隐藏窗，点击时可秒开 */
  public preparePlugin(name: string) {
    this.viewHost.prepare(name);
  }

  /** 鼠标移出：终止预热并销毁预热实例 */
  public cancelPreparePlugin(name: string) {
    this.viewHost.cancelPrepare(name);
  }

  public destroyAllViews() {
    this.viewHost.destroyAll();
  }

  private onPluginViewDestroyed(name: string) {
    if (this.webContainers.has(name)) {
      this.webContainers.delete(name);
      this.container.closePlugin(name);
    }
    if (global.gc) global.gc();
  }

  private trackPluginUsage(name: string) {
    const { sort } = this.setting.getSetting();
    if (!sort) return;

    const sortData = getSortData(this.store);
    const current = sortData.get(name) ?? 0;
    sortData.set(name, current + 1);
    saveSortData(this.store, sortData);
  }

  private resolveWindowIcon(pluginObj: ToolkitPlugin): string {
    const cacheKey = pluginObj.name;
    const cached = this.iconPathCache.get(cacheKey);
    if (cached) return cached;

    let iconPath = getAssetPath('icon.png');
    if (pluginObj.logo && pluginObj.pluginPath) {
      const logoFile = path.join(pluginObj.pluginPath, pluginObj.logo);
      if (fs.existsSync(logoFile)) iconPath = logoFile;
    }
    this.iconPathCache.set(cacheKey, iconPath);
    return iconPath;
  }

  private async resolvePluginUrl(
    name: string,
    pluginObj: ToolkitPlugin,
  ): Promise<string> {
    if (pluginObj.webContainer) {
      return this.resolveWebContainerUrl(name, pluginObj);
    }
    if (pluginObj.entry?.startsWith('http')) {
      return pluginObj.entry;
    }
    return pathToFileURL(path.join(pluginObj.pluginPath!, pluginObj.entry))
      .href;
  }

  private async resolveWebContainerUrl(
    name: string,
    pluginObj: ToolkitPlugin,
  ): Promise<string> {
    if (!this.webContainers.has(name)) {
      const port = await this.container.listenPlugin(
        name,
        pluginObj.pluginPath!,
      );
      const url = `http://127.0.0.1:${port}/${pluginObj.entry}`;
      this.webContainers.set(name, url);
    }
    return this.webContainers.get(name)!;
  }

  // ── Store ────────────────────────────────────────────────────────────────

  public async getStoreAppList(): Promise<Record<string, any[]>> {
    const toolkitAppPath = path.join(this.configDir, 'toolkit-app.json');
    if (fs.existsSync(toolkitAppPath)) {
      const str = fs.readFileSync(toolkitAppPath, 'utf8');
      return JSON.parse(str);
    }
    return {};
  }

  public async installPlugin(plugin: {
    name: string;
    version: string;
  }): Promise<{ code: number; data?: any }> {
    return new Promise((resolve) => {
      const moduleSpec = `${plugin.name}@${plugin.version}`;
      const cache = path.join(this.baseDir, 'cache');

      execFile(
        'npm',
        ['install', '--prefix', cache, moduleSpec],
        (error, _stdout, stderr) => {
          if (error) {
            log.error('install exec error:', error);
            resolve({ code: -1, data: error.message });
            return;
          }
          if (stderr) console.error(`stderr: ${stderr}`);

          try {
            const destinationPath = path.join(this.baseDir, plugin.name);
            if (fs.existsSync(destinationPath)) {
              deleteFolder(destinationPath);
            }
            fs.renameSync(
              path.join(cache, 'node_modules', plugin.name),
              destinationPath,
            );
            resolve({ code: 0 });
          } catch (err) {
            log.error('install plugin copy failed:', err);
            resolve({
              code: -1,
              data: 'copy plugin failed! maybe has already existed.',
            });
          }
        },
      );
    });
  }
}

export default PluginManager;
