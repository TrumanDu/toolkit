/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable class-methods-use-this */
// @ts-nocheck
import { ipcMain, BrowserWindow } from 'electron';
import { resolveHtmlPath, getAssetPath } from './util';

class API {
  public listen(mainWindow: BrowserWindow) {
    ipcMain.on('trigger', async (event, arg) => {
      const window = arg.winId ? BrowserWindow.fromId(arg.winId) : mainWindow;
      const data = await this[arg.type](arg, window, event);
      event.returnValue = data;
    });
  }

  public hideMainWindow(_arg: any, window: BrowserWindow) {
    window.hide();
  }

  public showMainWindow(_arg: any, window: BrowserWindow) {
    window.show();
  }

  public openPlugin(arg: any, window: BrowserWindow) {
    const pluginWin = new BrowserWindow({
      height: 600,
      minHeight: 600,
      width: 1024,
      title: `Plugin demo${arg.name}`,
      show: false,
      icon: getAssetPath('icon.png'),
      autoHideMenuBar: true,
      enableLargerThanScreen: true,
      webPreferences: {
        webSecurity: false,
        backgroundThrottling: false,
        contextIsolation: false,
        webviewTag: true,
        devTools: true,
        nodeIntegration: true,
        navigateOnDragDrop: true,
        spellcheck: false,
      },
    });
    pluginWin.setPosition(
      pluginWin.getPosition()[0],
      pluginWin.getPosition()[1],
    );

    pluginWin.loadURL(resolveHtmlPath('plugin.html'));
    pluginWin.once('ready-to-show', async () => {
      pluginWin.webContents.executeJavaScript(`console.log(111)`);
      pluginWin.show();
    });
  }
}

export default API;
