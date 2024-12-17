/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable class-methods-use-this */
// @ts-nocheck
import { ipcMain, BrowserWindow, Notification } from 'electron';
import log from 'electron-log';
import PluginManager from './plugin';
import Setting from './setting';
import InitCheck from './init_check';

class API {
  private setting: Setting;

  private pluginManager: PluginManager;

  private pluginViewPool: Map<string, BrowserWindow> = new Map();

  private dashboardWindow: BrowserWindow;

  constructor(dashboardWindow: BrowserWindow, initCheck: InitCheck) {
    this.dashboardWindow = dashboardWindow;
    this.setting = new Setting(initCheck);
    this.pluginManager = new PluginManager(initCheck, this.setting);
  }

  public listen() {
    ipcMain.on('trigger', async (event, arg) => {
      console.log(arg);
      try {
        const data = await this[arg.type](arg, event);
        event.returnValue = data;
      } catch (error) {
        log.error(error);
      }
    });
  }

  public listPlugins() {
    return this.pluginManager.listPlugin();
  }

  public reloadPlugins() {
    return this.pluginManager.reloadPlugins();
  }

  public openPlugin(arg: any) {
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

  public removePlugin(_arg: any) {
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

  public getStoreAppList() {
    return this.pluginManager.getStoreAppList();
  }

  public async installPlugin(arg: any, event) {
    const data = await this.pluginManager.installPlugin(arg.data);
    const response = {
      operator: 'installPlugin',
      result: {
        ...data,
        name: arg.data.name,
      },
    };
    event.sender.send('dashboard-reply', response);
  }

  public getSetting() {
    return this.setting.getSetting();
  }

  public saveSettingByKey(arg: any) {
    const { data } = arg;
    this.setting.updateByKey(data.key, data.value);
  }
}

export default API;
