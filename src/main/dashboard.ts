import path from 'path';
import { app, BrowserWindow, shell } from 'electron';
import { resolveHtmlPath, getAssetPath } from './util';

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

  if (process.platform === 'darwin') {
    app.dock.setIcon(getAssetPath('icon.png'));
    app.dock.bounce();
  }

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

export default createDashboardWindow;
