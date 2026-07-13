import { ipcMain, BrowserWindow, Notification, IpcMainEvent } from 'electron';
import log from 'electron-log';
import PluginManager from './plugin';
import Setting from './setting';
import InitCheck from './init_check';

// Whitelist of methods callable via IPC
const ALLOWED_METHODS = new Set([
  'listPlugins',
  'reloadPlugins',
  'openPlugin',
  'removePlugin',
  'getStoreAppList',
  'installPlugin',
  'getSetting',
  'saveSettingByKey',
]);

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
    ipcMain.on('trigger', async (event: IpcMainEvent, arg: { type: string; data: any }) => {
      const method = arg.type;
      if (!ALLOWED_METHODS.has(method)) {
        log.error(`IPC: unknown method "${method}"`);
        event.returnValue = undefined;
        return;
      }
      try {
        const data = await (this as any)[method](arg, event);
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

  public async openPlugin(arg: { data: string }) {
    const pluginObj = this.pluginManager.getPlugin(arg.data);
    if (pluginObj.mode && pluginObj.mode === 'single') {
      const name = arg.data;
      if (!this.pluginViewPool.has(name)) {
        const pluginWin = await this.pluginManager.openPlugin(
          name,
          this.pluginViewPool,
        );
        this.pluginViewPool.set(name, pluginWin);
      } else {
        const pluginWin = this.pluginViewPool.get(name);
        pluginWin?.show();
      }
    } else {
      await this.pluginManager.openPlugin(arg.data, this.pluginViewPool);
    }
  }

  public removePlugin(arg: { data: string }) {
    this.pluginManager.removePlugin(arg.data);
    return this.listPlugins();
  }

  public getStoreAppList() {
    return this.pluginManager.getStoreAppList();
  }

  public async installPlugin(arg: { data: any }, event: IpcMainEvent) {
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

  public saveSettingByKey(arg: { data: { key: string; value: any } }) {
    const { data } = arg;
    this.setting.updateByKey(data.key, data.value);
  }
}

export default API;
