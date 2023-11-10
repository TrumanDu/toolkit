import { dialog, Menu, Tray, app, shell, BrowserWindow } from 'electron';
import pkg from '../../package.json';
import { getAssetPath } from './util';
import API from './api';

const isMac = process.platform === 'darwin';

function createTray(window: BrowserWindow, api: API): Promise<Tray> {
  return new Promise((resolve) => {
    const iconPath = getAssetPath('icon.png');
    const appTray = new Tray(iconPath);
    const openSettings = () => {
      window.webContents.executeJavaScript(
        `window.toolkit && window.toolkit.openMenu && window.toolkit.openMenu({ code: "settings" })`,
      );
      window.show();
    };

    const createContextMenu = () =>
      Menu.buildFromTemplate([
        {
          type: 'normal',
          label: '        显示        ',
          click() {
            window.show();
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
          label: '        重载插件        ',
          click() {
            api.reloadPlugins();
          },
        },
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
              role: 'quit',
              label: '        退出        ',
            },
        {
          label: '        重启        ',
          click() {
            app.relaunch();
            app.quit();
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
      if (window) {
        if (window.isVisible()) {
          window.hide();
        } else {
          window.show();
          window.focus();
        }
      }
    });

    resolve(appTray);
  });
}
export default createTray;
