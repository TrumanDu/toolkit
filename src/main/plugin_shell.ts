import { BaseWindow } from 'electron';
import Store from 'electron-store';
import { getAssetPath } from './util';

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 770;
const SHELL_SIZE_KEY = 'plugin-shell-windowSize';
/** 插件未就绪时的窗口底色（配合 loading 遮罩） */
const SHELL_BG = '#e8e8e8';

/**
 * 插件宿主壳窗口：只建一次，内容由 WebContentsView 填充。
 * 关闭时 hide；壳内 View 由 PluginViewHost 在 hide 时自动销毁。
 */
class PluginShell {
  private window: BaseWindow | null = null;

  private store = new Store();

  private lastSize = { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };

  public getWindow(): BaseWindow | null {
    return this.window;
  }

  public ensure(): BaseWindow {
    if (this.window && !this.window.isDestroyed()) {
      return this.window;
    }

    const saved = this.store.get(SHELL_SIZE_KEY, {
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
    }) as { width: number; height: number };
    this.lastSize = { width: saved.width, height: saved.height };

    const win = new BaseWindow({
      width: saved.width,
      height: saved.height,
      show: false,
      autoHideMenuBar: true,
      backgroundColor: SHELL_BG,
      icon: getAssetPath('icon.png'),
    });

    win.on('resize', () => {
      if (win.isDestroyed()) return;
      const [width, height] = win.getSize();
      this.lastSize = { width, height };
      this.store.set(SHELL_SIZE_KEY, { width, height });
    });

    // 关闭改为隐藏，避免销毁壳与已缓存 View
    win.on('close', (event) => {
      event.preventDefault();
      win.hide();
    });

    this.window = win;
    return win;
  }

  public show() {
    const win = this.ensure();
    if (!win.isVisible()) win.show();
    win.focus();
  }

  /**
   * multi 模式：每次新建独立壳窗，关闭即销毁（与旧版多 BrowserWindow 一致）。
   */
  public createDetached(opts: {
    title: string;
    icon: string;
  }): BaseWindow {
    const saved = this.store.get(SHELL_SIZE_KEY, {
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
    }) as { width: number; height: number };

    const win = new BaseWindow({
      width: saved.width,
      height: saved.height,
      show: false,
      autoHideMenuBar: true,
      backgroundColor: SHELL_BG,
      title: opts.title,
      icon: opts.icon,
    });

    win.on('resize', () => {
      if (win.isDestroyed()) return;
      const [width, height] = win.getSize();
      this.store.set(SHELL_SIZE_KEY, { width, height });
    });

    return win;
  }

  public isVisible(): boolean {
    return !!this.window && !this.window.isDestroyed() && this.window.isVisible();
  }

  public hide() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.hide();
    }
  }

  public setTitle(title: string) {
    this.ensure().setTitle(title);
  }

  /**
   * 隐藏时 getContentSize 可能为 0，回退到上次有效尺寸，避免 View bounds 被设成 0 导致白屏。
   */
  public getContentSize(): { width: number; height: number } {
    const win = this.ensure();
    if (win.isVisible()) {
      const [width, height] = win.getContentSize();
      if (width > 1 && height > 1) {
        this.lastSize = { width, height };
        return { width, height };
      }
    }
    const [w, h] = win.getSize();
    if (w > 1 && h > 1) {
      // 粗略用外框尺寸，比 0 安全
      return { width: w, height: Math.max(h - 30, 100) };
    }
    return { ...this.lastSize };
  }

  public isDestroyed(): boolean {
    return !this.window || this.window.isDestroyed();
  }

  /** 应用退出时真正销毁 */
  public destroy() {
    if (!this.window || this.window.isDestroyed()) {
      this.window = null;
      return;
    }
    this.window.removeAllListeners('close');
    this.window.destroy();
    this.window = null;
  }
}

export default PluginShell;
