/* eslint-disable class-methods-use-this */
import { dialog, BrowserWindow, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';

export default class AppUpdater {
  private mainWindow: BrowserWindow;

  private readonly isMac: boolean;

  constructor(window: BrowserWindow) {
    this.mainWindow = window;
    this.isMac = process.platform === 'darwin';
    this.init();
  }

  private init() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;

    // 检查更新出错
    autoUpdater.on('error', (error) => {
      log.error(['检查更新失败', error]);
    });

    // 检测到新版本
    autoUpdater.on('update-available', async (info) => {
      log.info('检测到新版本:', info);

      if (this.isMac) {
        // macOS 平台直接打开下载页面
        const { response } = await dialog.showMessageBox({
          type: 'info',
          title: '发现新版本',
          message: `发现新版本 ${info.version}\n是否前往下载页面？`,
          detail: info.releaseNotes?.toString() || '暂无更新说明',
          buttons: ['前往下载', '暂不更新'],
          cancelId: 1,
        });

        if (response === 0) {
          // 打开 GitHub release 页面
          shell.openExternal(
            'https://github.com/TrumanDu/toolkit/releases/latest',
          );
        }
      } else {
        // Windows 平台使用热更新
        const { response } = await dialog.showMessageBox({
          type: 'info',
          title: '发现新版本',
          message: `发现新版本 ${info.version}\n是否现在更新?`,
          detail: info.releaseNotes?.toString() || '暂无更新说明',
          buttons: ['现在更新', '暂不更新'],
          cancelId: 1,
        });

        if (response === 0) {
          // 用户同意更新，开始下载
          autoUpdater.downloadUpdate();
          // 显示进度条窗口
          this.mainWindow.webContents.send('show-progress-window');
        }
      }
    });

    // 没有可用更新
    autoUpdater.on('update-not-available', () => {
      log.info('当前已是最新版本');
    });

    // 更新下载进度 (仅 Windows)
    autoUpdater.on('download-progress', (progressObj) => {
      if (!this.isMac) {
        this.mainWindow.webContents.send('update-progress', {
          percent: progressObj.percent,
          transferred: progressObj.transferred,
          total: progressObj.total,
          bytesPerSecond: progressObj.bytesPerSecond,
        });
      }
    });

    // 更新下载完成 (仅 Windows)
    autoUpdater.on('update-downloaded', async (info) => {
      if (this.isMac) return;

      log.info('更新包下载完成:', info);

      // 关闭进度条窗口
      this.mainWindow.webContents.send('close-progress-window');

      // 显示安装确认对话框
      const { response } = await dialog.showMessageBox({
        type: 'info',
        title: '更新就绪',
        message: '新版本已下载完成，是否现在安装？',
        detail: '点击确定将重启应用并安装更新',
        buttons: ['现在安装', '下次安装'],
        cancelId: 1,
      });

      if (response === 0) {
        // 用户同意安装，退出并安装
        log.info('开始安装更新...');
        autoUpdater.quitAndInstall(false, true);
      } else {
        log.info('下次安装...');
      }
    });
  }

  public async checkForUpdates(): Promise<void> {
    try {
      log.info('开始检查更新...');
      await autoUpdater.checkForUpdates();
    } catch (error) {
      log.error('检查更新失败:', error);
    }
  }
}
