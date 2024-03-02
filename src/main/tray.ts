import { dialog, Menu, Tray, app, shell, BrowserWindow } from 'electron';
import pkg from '../../package.json';
import { getAppDir, getAssetPath } from './util';
import API from './api';

const isMac = process.platform === 'darwin';

function createTray(
  window: BrowserWindow,
  dashboard: BrowserWindow,
  api: API,
): Promise<Tray> {
  return new Promise((resolve) => {
    const iconPath = getAssetPath('icon.png');
    const appTray = new Tray(iconPath);
    const openSettings = () => {
      dashboard.webContents.executeJavaScript(
        `window.toolkit && window.toolkit.openMenu && window.toolkit.openMenu({ code: "settings" })`,
      );
    };

    const openInstallDirectory = () => {
      const directoryPath = getAppDir();
      shell.openPath(directoryPath);
    };

    const createContextMenu = () =>
      Menu.buildFromTemplate([
        {
          type: 'normal',
          label: '        显示        ',
          click() {
            dashboard.show();
          },
        },
        {
          label: '        系统设置        ',
          click() {
            openSettings();
          },
        },
        { type: 'separator' },
        {
          label: '       打开安装目录       ',
          click() {
            openInstallDirectory();
          },
        },
        {
          label: '        重载插件        ',
          click() {
            try {
              api.reloadPlugins();
              api.notification(
                'Toolkit Notification',
                'Reload plugins success!',
              );
            } catch (error) {
              api.notification('Toolkit Notification', 'Reload plugins fail!');
            }
          },
        },
        { type: 'separator' },
        {
          label: '        帮助文档        ',
          click: () => {
            process.nextTick(() => {
              shell.openExternal('https://github.com/TrumanDu/toolkit');
            });
          },
        },
        {
          label: '        意见反馈        ',
          click: () => {
            process.nextTick(() => {
              shell.openExternal('https://github.com/TrumanDu/toolkit/issues');
            });
          },
        },

        { type: 'separator' },
        isMac
          ? {
              role: 'close',
              label: '        退出        ',
            }
          : {
              label: '        退出        ',
              click() {
                app.exit();
              },
            },
        {
          label: '        重启        ',
          click() {
            app.relaunch();
            app.exit();
          },
        },

        { type: 'separator' },
        {
          label: '        关于        ',
          click() {
            dialog.showMessageBox({
              title: 'Toolkit',
              icon: iconPath,
              message: '极简、插件化的工具集！',
              detail: `Version: ${pkg.version}\nAuthor: TrumanDu`,
            });
          },
        },
      ]);
    appTray.on('right-click', () => {
      appTray.setContextMenu(createContextMenu());
      appTray.popUpContextMenu();
    });
    // appTray.setContextMenu(createContextMenu());

    appTray.on('click', () => {
      if (dashboard) {
        if (dashboard.isVisible()) {
          dashboard.hide();
        } else {
          dashboard.show();
          dashboard.focus();
        }
      }
    });

    resolve(appTray);
  });
}
export default createTray;
