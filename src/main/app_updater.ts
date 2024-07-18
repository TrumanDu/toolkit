import { dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
    autoUpdater.on('error', (error) => {
      log.error(['检查更新失败', error]);
    });
    autoUpdater.on('update-available', (info) => {
      log.info('检查到有更新，开始下载新版本');
      log.info(info);
    });
    autoUpdater.on('update-not-available', () => {
      log.info('没有可用更新');
    });
    // 在更新下载完成的时候触发。
    autoUpdater.on('update-downloaded', (res) => {
      log.info('下载完毕！提示安装更新');
      log.info(res);
      dialog
        .showMessageBox({
          title: '升级提示！',
          message: '已为您下载最新应用，点击确定马上替换为最新版本！',
        })
        .then(() => {
          log.info('退出应用，安装开始！');
          // 重启应用并在下载后安装更新。 它只应在发出 update-downloaded 后方可被调用。
          autoUpdater.quitAndInstall();
          return null;
        })
        .catch((e) => {
          log.error(e);
        });
    });
  }
}
