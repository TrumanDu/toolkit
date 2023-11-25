/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable class-methods-use-this */
// @ts-nocheck
import { ipcMain, BrowserWindow, Notification } from 'electron';
import PluginManager from './plugin';

class API {
  private pluginManager = new PluginManager();

  private pluginViewPool: Map<string, BrowserWindow> = new Map();

  private dashboardWindow: BrowserWindow;

  constructor(dashboardWindow: BrowserWindow) {
    this.dashboardWindow = dashboardWindow;
  }

  public listen(mainWindow: BrowserWindow) {
    ipcMain.on('trigger', async (event, arg) => {
      console.log(arg);
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
    return this.pluginManager.listPlugin();
  }

  public reloadPlugins() {
    return this.pluginManager.reloadPlugins();
  }

  public openPlugin(arg: any, window: BrowserWindow) {
    this.hideMainWindow(arg, window);
    const pluginObj = this.pluginManager.getPlugin(arg.data);
    if (pluginObj.mode && pluginObj.mode === 'single') {
      const name = arg.data;
      if (!this.pluginViewPool.has(name)) {
        const pluginWin = this.pluginManager.openPlugin(
          name,
          this.pluginViewPool,
        );
        this.pluginViewPool.set(name, pluginWin);
      } else {
        const pluginWin = this.pluginViewPool.get(name);
        pluginWin?.show();
      }
    } else {
      this.pluginManager.openPlugin(arg.data, this.pluginViewPool);
    }
  }

  public removePlugin(_arg: any, window: BrowserWindow) {
    this.pluginManager.removePlugin(_arg.data);
    return this.listPlugins();
  }

  public notification(title: string, body: string) {
    const notification = new Notification({
      title,
      body,
    });
    notification.show();
  }
}

export default API;
