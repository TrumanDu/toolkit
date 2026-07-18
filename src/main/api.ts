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
  'preparePlugin',
  'cancelPreparePlugin',
  'removePlugin',
  'getStoreAppList',
  'installPlugin',
  'getSetting',
  'saveSettingByKey',
]);

class API {
  private setting: Setting;

  private pluginManager: PluginManager;

  private dashboardWindow: BrowserWindow;

  constructor(dashboardWindow: BrowserWindow, initCheck: InitCheck) {
    this.dashboardWindow = dashboardWindow;
    this.setting = new Setting(initCheck);
    this.pluginManager = new PluginManager(initCheck, this.setting);
  }

  public listen() {
    ipcMain.on(
      'trigger',
      async (event: IpcMainEvent, arg: { type: string; data: any }) => {
        const method = arg.type;
        console.log('IPC trigger:', method);
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
      },
    );
  }

  public listPlugins() {
    return this.pluginManager.listPlugin();
  }

  public reloadPlugins() {
    return this.pluginManager.reloadPlugins();
  }

  public async openPlugin(arg: { data: string }) {
    const pluginObj = this.pluginManager.getPlugin(arg.data);
    if (!pluginObj) {
      log.error(`openPlugin: plugin not found "${arg.data}"`);
      return;
    }
    await this.pluginManager.openPlugin(arg.data);
  }

  public preparePlugin(arg: { data: string }) {
    if (!arg?.data) return;
    this.pluginManager.preparePlugin(arg.data);
  }

  public cancelPreparePlugin(arg: { data: string }) {
    if (!arg?.data) return;
    this.pluginManager.cancelPreparePlugin(arg.data);
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

  public notification(title: string, body: string) {
    const notification = new Notification({ title, body });
    notification.show();
  }

  public dispose() {
    this.pluginManager.destroyAllViews();
  }
}

export default API;
