/* eslint-disable class-methods-use-this */
import { dialog, BrowserWindow, shell, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';

const RELEASE_PAGE = 'https://github.com/TrumanDu/toolkit/releases/latest';

export default class AppUpdater {
  private readonly mainWindow: BrowserWindow;

  private readonly isMac: boolean;

  /** 用户是否已确认下载；未确认时不弹「可以安装」 */
  private userAcceptedDownload = false;

  /** 防止重复绑定 autoUpdater 事件 */
  private static listenersBound = false;

  constructor(window: BrowserWindow) {
    this.mainWindow = window;
    this.isMac = process.platform === 'darwin';
    this.init();
  }

  private ensureWindowReady() {
    if (this.mainWindow.isDestroyed()) return;
    if (!this.mainWindow.isVisible()) {
      this.mainWindow.show();
    }
    this.mainWindow.focus();
  }

  /** 转为可在页面中渲染的 HTML（去掉脚本，保留标签） */
  private toReleaseNotesHtml(releaseNotes: unknown): string {
    if (!releaseNotes) return '<p>暂无更新说明</p>';

    let html: string;
    if (typeof releaseNotes === 'string') {
      html = releaseNotes;
    } else if (Array.isArray(releaseNotes)) {
      html = releaseNotes
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') {
            const note = item as { version?: string; note?: string };
            const body = note.note || '';
            return note.version ? `<h4>${note.version}</h4>${body}` : body;
          }
          return '';
        })
        .filter(Boolean)
        .join('');
    } else {
      return '<p>暂无更新说明</p>';
    }

    const safe = html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .trim();

    return safe || '<p>暂无更新说明</p>';
  }

  /** 应用内 Modal 展示 HTML 更新说明，等待用户选择 */
  private askUserToUpdate(
    version: string,
    releaseNotesHtml: string,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const responseChannel = 'update-available-response';
      ipcMain.once(responseChannel, (_event, accepted: boolean) => {
        resolve(!!accepted);
      });

      this.ensureWindowReady();
      this.mainWindow.webContents.send('show-update-available', {
        version,
        releaseNotesHtml,
        // Mac 无应用内热更新，引导前往 Release 页
        acceptText: this.isMac ? '前往下载' : '现在更新',
      });
    });
  }

  private notifyCheckError(message: string) {
    if (this.mainWindow.isDestroyed()) return;
    this.mainWindow.webContents.send('update-check-error', { message });
  }

  private init() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    // 关闭自动下载：未点确认时不应后台下完再弹「可以安装」
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;

    if (AppUpdater.listenersBound) {
      return;
    }
    AppUpdater.listenersBound = true;

    autoUpdater.on('error', (error) => {
      log.error(['检查/更新失败', error]);
      const message =
        error?.message ||
        '检查更新失败，请稍后重试或前往 GitHub Release 手动下载';
      this.notifyCheckError(message);
    });

    autoUpdater.on('update-available', async (info) => {
      log.info('检测到新版本:', info);
      this.userAcceptedDownload = false;

      const accepted = await this.askUserToUpdate(
        info.version,
        this.toReleaseNotesHtml(info.releaseNotes),
      );

      if (!accepted) {
        this.userAcceptedDownload = false;
        autoUpdater.autoInstallOnAppQuit = false;
        log.info('用户选择暂不更新');
        return;
      }

      if (this.isMac) {
        // macOS：签名/公证未就绪时应用内安装不可靠，引导手动下载
        log.info('macOS 打开 Release 下载页');
        await shell.openExternal(RELEASE_PAGE);
        return;
      }

      // Windows：应用内热更新
      this.userAcceptedDownload = true;
      autoUpdater.autoInstallOnAppQuit = true;
      this.mainWindow.webContents.send('show-progress-window');
      try {
        await autoUpdater.downloadUpdate();
      } catch (error) {
        this.userAcceptedDownload = false;
        this.mainWindow.webContents.send('close-progress-window');
        log.error('下载更新失败:', error);
        this.notifyCheckError(
          error instanceof Error ? error.message : '下载更新失败',
        );
      }
    });

    autoUpdater.on('update-not-available', () => {
      log.info('当前已是最新版本');
    });

    autoUpdater.on('download-progress', (progressObj) => {
      if (!this.isMac && this.userAcceptedDownload) {
        this.mainWindow.webContents.send('update-progress', {
          percent: progressObj.percent,
          transferred: progressObj.transferred,
          total: progressObj.total,
          bytesPerSecond: progressObj.bytesPerSecond,
        });
      }
    });

    autoUpdater.on('update-downloaded', async (info) => {
      if (this.isMac) return;

      log.info('更新包下载完成:', info);
      this.mainWindow.webContents.send('close-progress-window');

      if (!this.userAcceptedDownload) {
        log.info('忽略未确认的更新包，不提示安装');
        autoUpdater.autoInstallOnAppQuit = false;
        return;
      }

      this.ensureWindowReady();
      const { response } = await dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: '更新就绪',
        message: '新版本已下载完成，是否现在安装？',
        detail: '点击确定将重启应用并安装更新',
        buttons: ['现在安装', '下次安装'],
        cancelId: 1,
        defaultId: 0,
      });

      if (response === 0) {
        log.info('开始安装更新...');
        autoUpdater.quitAndInstall(false, true);
      } else {
        log.info('用户选择暂不安装');
        autoUpdater.autoInstallOnAppQuit = false;
      }
    });
  }

  public async checkForUpdates(): Promise<void> {
    try {
      this.userAcceptedDownload = false;
      autoUpdater.autoDownload = false;
      autoUpdater.autoInstallOnAppQuit = false;
      log.info('开始检查更新...');
      await autoUpdater.checkForUpdates();
    } catch (error) {
      log.error('检查更新失败:', error);
      this.notifyCheckError(
        error instanceof Error
          ? error.message
          : '检查更新失败，请稍后重试或前往 GitHub Release 手动下载',
      );
    }
  }
}
