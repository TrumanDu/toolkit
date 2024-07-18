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
import path from 'path';
import { app, BrowserWindow, globalShortcut, shell, ipcMain } from 'electron';

import log from 'electron-log';
import { resolveHtmlPath, getAssetPath, getAppDir } from './util';
import createTray from './tray';
import API from './api';
import AppUpdater from './app_updater';
import InitCheck from './init_check';
// IMPORTANT: to fix file save problem in excalidraw: The request is not allowed by the user agent or the platform in the current context
app.commandLine.appendSwitch('enable-experimental-web-platform-features');
app.setAppUserModelId('top.trumandu.Toolkit');

let mainWindow: BrowserWindow | null = null;
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
const createDashboardWindow = async () => {
  const newDashboardWindow = new BrowserWindow({
    show: false,
    center: true,
    autoHideMenuBar: true,
    width: 1560,
    height: 900,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      webSecurity: false,
      navigateOnDragDrop: true,
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  newDashboardWindow.loadURL(resolveHtmlPath('dashboard.html'));
  newDashboardWindow.on('close', (event) => {
    newDashboardWindow.hide();
    event.preventDefault();
  });
  // 当窗口准备好时，最大化窗口
  newDashboardWindow.webContents.on('did-finish-load', () => {
    newDashboardWindow.show();
  });
  newDashboardWindow.webContents.setWindowOpenHandler(
    (data: { url: string }) => {
      shell.openExternal(data.url);
      return { action: 'deny' };
    },
  );
  newDashboardWindow.webContents.on('will-navigate', (event, url) => {
    // 判断链接是否为本地文件
    if (!url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url); // 打开默认浏览器并跳转到该链接
    }
  });
  return newDashboardWindow;
};

const createWindow = async () => {
  if (isDebug) {
    // await installExtensions();
  }

  mainWindow = new BrowserWindow({
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    center: true,
    transparent: true,
    width: 678,
    height: 680,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      webSecurity: false,
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });
  mainWindow.setPosition(
    mainWindow.getPosition()[0],
    mainWindow.getPosition()[1] / 2 + 200,
  );

  mainWindow.loadURL(resolveHtmlPath('main.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
  });
  // 当窗口完成加载后，自动获得焦点
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.focus();
  });
  if (!isDebug) {
    mainWindow.on('blur', () => {
      mainWindow?.hide();
    });
  }
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  mainWindow.setMenu(null);

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
  dashboardWindow = await createDashboardWindow();
  const api = new API(dashboardWindow, initCheck);
  api.listen(mainWindow);
  // 创建系统托盘图标
  createTray(mainWindow, dashboardWindow, api);
  mainWindow.setSkipTaskbar(true);
  // mainWindow.setIgnoreMouseEvents(true);
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
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
      !globalShortcut.register('CmdOrCtrl+Alt+A', () => {
        // 在此处执行快捷键触发的操作
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      })
    ) {
      console.log('main shortcut register failed.');
    }

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
      'main shortcut register:',
      globalShortcut.isRegistered('CmdOrCtrl+Alt+A'),
    );
    log.info(
      'dashboard shortcut register:',
      globalShortcut.isRegistered('CmdOrCtrl+Alt+O'),
    );
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);

app.on('ready', () => {
  const appInstallDir = getAppDir();
  // 将应用程序安装目录发送给渲染进程
  ipcMain.on('get-app-install-dir', (event) => {
    event.returnValue = appInstallDir;
  });
});
