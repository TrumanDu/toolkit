/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable class-methods-use-this */
// @ts-nocheck
import { ipcMain, BrowserWindow, shell } from 'electron';
import path from 'path';
import { resolveHtmlPath, getAssetPath } from './util';
import PluginManager from './plugin';

const fs = require('fs');

class API {
  private pluginManager = new PluginManager();

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

  public listPlugins() {
    return this.pluginManager.allPlugins;
  }

  public openPlugin(arg: any, window: BrowserWindow) {
    this.hideMainWindow(arg, window);
    this.pluginManager.openPlugin(arg.data);
  }
}

export default API;
