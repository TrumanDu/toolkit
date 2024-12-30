/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import fixPath from 'fix-path';
import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';

import log from 'electron-log';
import { getAppDir } from './util';
import createTray from './tray';
import API from './api';
import AppUpdater from './app_updater';
import InitCheck from './init_check';
import createDashboardWindow from './dashboard';

const { baiduAnalyticsMain } = require('@nostar/baidu-analytics-electron');
// IMPORTANT: to fix file save problem in excalidraw: The request is not allowed by the user agent or the platform in the current context
app.commandLine.appendSwitch('enable-experimental-web-platform-features');
app.setAppUserModelId('top.trumandu.Toolkit');

fixPath();

let dashboardWindow: BrowserWindow | null = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';
if (isDebug) {
  require('electron-debug')();
}
const initCheck = new InitCheck();

baiduAnalyticsMain(ipcMain);

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  // eslint-disable-next-line no-new
  new AppUpdater();
  dashboardWindow = await createDashboardWindow();
  const api = new API(dashboardWindow, initCheck);
  api.listen();
  // 创建系统托盘图标
  createTray(dashboardWindow, api);
};

/**
 * Add event listeners...
 */

// 添加内存清理函数
function cleanupResources() {
  if (dashboardWindow) {
    dashboardWindow.webContents.closeDevTools();
    dashboardWindow = null;
  }
  // 注销所有快捷键
  globalShortcut.unregisterAll();
  // 清理 IPC 监听器
  ipcMain.removeAllListeners();
}

// 修改 window-all-closed 事件处理
app.on('window-all-closed', () => {
  cleanupResources();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    // 注册全局快捷键
    if (
      !globalShortcut.register('CmdOrCtrl+Alt+O', () => {
        if (dashboardWindow) {
          dashboardWindow.show();
        }
      })
    ) {
      console.log('dashboard shortcut register failed.');
    }

    // 检测快捷键注册状态
    log.info(
      'dashboard shortcut register:',
      globalShortcut.isRegistered('CmdOrCtrl+Alt+O'),
    );
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (dashboardWindow === null) {
        createWindow();
      }
    });
  })
  .catch(console.log);

// 修改 before-quit 事件处理
app.on('before-quit', (event) => {
  event.preventDefault();
  cleanupResources();
  app.exit();
});

app.on('ready', () => {
  const appInstallDir = getAppDir();
  // 将应用程序安装目录发送给渲染进程
  ipcMain.on('get-app-install-dir', (event) => {
    event.returnValue = appInstallDir;
  });
});
