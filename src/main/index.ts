/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 */
import fixPath from 'fix-path';
import { app, BrowserWindow, globalShortcut, ipcMain, Menu, dialog } from 'electron';

import log from 'electron-log';
import { getAppDir, getAssetPath } from './util';
import createTray from './tray';
import API from './api';
import AppUpdater from './app_updater';
import InitCheck from './init_check';
import createDashboardWindow from './dashboard';
import pkg from '../../package.json';

import { baiduAnalyticsMain } from '@nostar/baidu-analytics-electron';

// IMPORTANT: to fix file save problem in excalidraw
app.commandLine.appendSwitch('enable-experimental-web-platform-features');
app.setAppUserModelId('top.trumandu.Toolkit');
app.name = 'Toolkit';

fixPath();

let dashboardWindow: BrowserWindow | null = null;

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

const initCheck = new InitCheck();

baiduAnalyticsMain(ipcMain);

function buildAppMenu() {
  if (process.platform !== 'darwin') return;

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Toolkit',
      submenu: [
        {
          label: 'About Toolkit',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: 'About Toolkit',
              icon: getAssetPath('icon.png'),
              message: 'Toolkit',
              detail: `Version: ${pkg.version}\nAuthor: TrumanDu\n\n极简、插件化的工具集！`,
            });
          },
        },
        { type: 'separator' },
        { label: 'Services', submenu: [] },
        { type: 'separator' },
        { label: 'Hide Toolkit', accelerator: 'Command+H', role: 'hide' },
        { label: 'Hide Others', accelerator: 'Command+Shift+H', role: 'hideOthers' },
        { label: 'Show All', role: 'unhide' },
        { type: 'separator' },
        { label: 'Quit Toolkit', accelerator: 'Command+Q', role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'Command+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'Shift+Command+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'Command+X', role: 'cut' },
        { label: 'Copy', accelerator: 'Command+C', role: 'copy' },
        { label: 'Paste', accelerator: 'Command+V', role: 'paste' },
        { label: 'Select All', accelerator: 'Command+A', role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: isDebug
        ? [
            { label: 'Reload', accelerator: 'Command+R', role: 'reload' },
            { label: 'Toggle Full Screen', accelerator: 'Ctrl+Command+F', role: 'togglefullscreen' },
            { label: 'Toggle Developer Tools', accelerator: 'Alt+Command+I', role: 'toggleDevTools' },
          ]
        : [
            { label: 'Toggle Full Screen', accelerator: 'Ctrl+Command+F', role: 'togglefullscreen' },
          ],
    },
    {
      label: 'Window',
      submenu: [
        { label: 'Minimize', accelerator: 'Command+M', role: 'minimize' },
        { label: 'Close', accelerator: 'Command+W', role: 'close' },
        { type: 'separator' },
        { label: 'Bring All to Front', role: 'front' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Toolkit on GitHub',
          click: () => {
            require('electron').shell.openExternal('https://github.com/TrumanDu/toolkit');
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

const createWindow = async () => {
  dashboardWindow = await createDashboardWindow();

  // 等待窗口创建完成后再初始化更新器
  dashboardWindow.webContents.on('did-finish-load', () => {
    // 初始化自动更新
    if (dashboardWindow) {
      const appUpdater = new AppUpdater(dashboardWindow);
      appUpdater.checkForUpdates();
    }
  });

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
    // macOS: 构建应用菜单，设置 Dock 图标
    buildAppMenu();
    if (process.platform === 'darwin') {
      app.dock?.setIcon(getAssetPath('icon.png'));
    }

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
      if (dashboardWindow === null) {
        createWindow();
      } else {
        dashboardWindow.show();
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
  ipcMain.on('get-app-install-dir', (event) => {
    event.returnValue = appInstallDir;
  });
});
