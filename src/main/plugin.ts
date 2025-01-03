/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable no-prototype-builtins */
/* eslint-disable promise/always-return */
/* eslint-disable global-require */
/* eslint-disable prefer-promise-reject-errors */
/* eslint-disable no-console */
/* eslint-disable class-methods-use-this */
import path from 'path';

import * as fs from 'fs';
import { BrowserWindow, shell, session, app } from 'electron';
import log from 'electron-log';
import Store from 'electron-store';
import WebContainer from './webContainer';

// import DB from './db';
import {
  deleteFolder,
  getAppDir,
  getAssetPath,
  readJsonObjFromFile,
} from './util';
import Setting from './setting';
import InitCheck from './init_check';

const DEFAULT_WINDOW_WIDTH = 1200;
const DEFAULT_WINDOW_HEIGHT = 770;

class PluginManager {
  private setting: Setting;

  // 插件安装地址
  private baseDir: string;

  private configDir: string = path.join(getAppDir(), 'config');

  private container: WebContainer = new WebContainer();

  private sortSettingId = 'sortSettingId';

  public allPlugins: any[] = [];

  private webContainers: Map<string, string> = new Map();

  // 创建一个新的存储实例
  public store = new Store();

  constructor(initCheck: InitCheck, setting: Setting) {
    this.setting = setting;
    this.baseDir = initCheck.pluginDir;
    this.configDir = initCheck.configDir;
    this.allPlugins = this.listPlugin();
  }

  public listPlugin() {
    const files = fs.readdirSync(this.baseDir);
    const pluginList: any[] = [];
    files.forEach((filename) => {
      if (filename === 'cache') return;
      const pluginPath = path.join(this.baseDir, filename);
      const packageJsonPath = path.join(pluginPath, 'package.json');
      const packagePath = path.join(pluginPath, 'plugin.json');
      if (fs.existsSync(packagePath)) {
        const packageObj: any = readJsonObjFromFile(packageJsonPath);
        const pluginObj: any = readJsonObjFromFile(packagePath);
        if (packageObj) {
          pluginObj.name = packageObj.name;
          pluginObj.version = packageObj.version;
        }
        if (pluginObj.logo) {
          pluginObj.logoPath = path.join(pluginPath, pluginObj.logo);
        } else {
          pluginObj.logoPath = getAssetPath('icon.png');
        }

        pluginObj.pluginPath = pluginPath;
        if (pluginObj.preload) {
          pluginObj.preloadPath = path.join(pluginPath, pluginObj.preload);
        }

        pluginList.push(pluginObj);
      }
    });

    const { sort } = this.setting.getSetting();
    if (sort) {
      let sortData: any = this.store.get(this.sortSettingId, {});
      sortData = new Map(Object.entries(sortData));
      if (sortData.size > 0) {
        pluginList.sort((a, b) => {
          return (
            (sortData.has(b.name) ? sortData.get(b.name) : 0) -
            (sortData.has(a.name) ? sortData.get(a.name) : 0)
          );
        });
      }
    }

    this.allPlugins = pluginList;
    return pluginList;
  }

  public reloadPlugins() {
    this.listPlugin();
  }

  public removePlugin(name: string) {
    try {
      const pluginPath = path.join(this.baseDir, name);
      if (fs.existsSync(pluginPath)) {
        deleteFolder(pluginPath);
      }
    } catch (error) {
      log.error('removePlugin has failed!', error);
    }

    this.reloadPlugins();
  }

  public getPlugin(name: string) {
    return this.allPlugins.find((plugin) => name === plugin.name);
  }

  public async openPlugin(
    name: string,
    pluginViewPool: Map<string, BrowserWindow>,
  ) {
    const pluginObj = this.getPlugin(name);
    const storeId = `${name}-windowSize`;
    const savedSize = this.store.get(storeId, {
      width: DEFAULT_WINDOW_WIDTH,
      height: DEFAULT_WINDOW_HEIGHT,
    }) as { width: number; height: number };
    const ses = session.fromPartition(`persist:<${name}>`);
    const preloadSystemPath = app.isPackaged
      ? path.join(__dirname, 'preload.js')
      : path.join(__dirname, '../../.erb/dll/preload.js');
    ses.setPreloads([preloadSystemPath]);

    const { sort } = this.setting.getSetting();

    if (sort) {
      let sortData: any = this.store.get(this.sortSettingId, {});
      sortData = new Map(Object.entries(sortData));
      if (sortData.has(name)) {
        const click = sortData.get(name);
        sortData.set(name, click + 1);
      } else {
        sortData.set(name, 1);
      }
      this.store.set(this.sortSettingId, Object.fromEntries(sortData));
    }

    const pluginWin = new BrowserWindow({
      height: savedSize.height,
      width: savedSize.width,
      title: pluginObj.name,
      show: false,
      icon: pluginObj.logoPath,
      autoHideMenuBar: true,
      enableLargerThanScreen: true,
      webPreferences: {
        webSecurity: false,
        contextIsolation: true,
        session: ses,
        backgroundThrottling: true,
        preload: pluginObj.preload ? pluginObj.preloadPath : null,
        webviewTag: true,
        nodeIntegration: true,
        navigateOnDragDrop: true,
        experimentalFeatures: true,
        spellcheck: false,
        enableWebSQL: false,
      },
    });
    pluginWin.on('resize', () => {
      const [width, height] = pluginWin?.getSize() || [
        DEFAULT_WINDOW_WIDTH,
        DEFAULT_WINDOW_HEIGHT,
      ];

      this.store.set(storeId, { width, height });
    });
    if (
      pluginObj.hasOwnProperty('webContainer') &&
      pluginObj.webContainer === true
    ) {
      let url: string;
      if (!this.webContainers.has(name)) {
        const port = await this.container.listenPlugin(
          name,
          pluginObj.pluginPath,
        );
        url = path.join(`http://127.0.0.1:${port}`, pluginObj.entry);
      } else {
        url = this.webContainers.get(name) as string;
      }

      pluginWin.loadURL(url);
      this.webContainers.set(name, url);
    } else if (pluginObj.entry && pluginObj.entry.startsWith('http')) {
      pluginWin.loadURL(pluginObj.entry);
    } else {
      // pluginWin.loadURL(resolveHtmlPath('plugin.html'));
      pluginWin.loadURL(
        require('url').format({
          pathname: path.join(pluginObj.pluginPath, pluginObj.entry),
          protocol: 'file:',
          slashes: true,
        }),
      );
    }

    pluginWin.webContents.setWindowOpenHandler((data: { url: string }) => {
      shell.openExternal(data.url);
      return { action: 'deny' };
    });
    pluginWin.webContents.on('will-navigate', (event, url) => {
      // 判断链接是否为本地文件
      if (!url.startsWith('file://')) {
        event.preventDefault();
        shell.openExternal(url); // 打开默认浏览器并跳转到该链接
      }
    });
    pluginWin.once('ready-to-show', async () => {
      pluginWin.webContents.executeJavaScript(`console.log('init plugin')`);
      pluginWin.show();
    });
    pluginWin.on('closed', async () => {
      if (pluginObj.webContainer) {
        this.webContainers.delete(name);
        this.container.closePlugin(name);
      }
      if (pluginViewPool) {
        pluginViewPool.delete(name);
      }
      if (global.gc) global.gc();
    });

    return pluginWin;
  }

  public async getStoreAppList() {
    const toolkitAppPath = path.join(this.configDir, 'toolkit-app.json');
    if (fs.existsSync(toolkitAppPath)) {
      const str = fs.readFileSync(toolkitAppPath, 'utf8');
      const toolkitApp = JSON.parse(str);
      return toolkitApp;
    }
    return {};
  }

  public async installPlugin(plugin: any): Promise<string> {
    return new Promise((resolve: any) => {
      const module = `${plugin.name}@${plugin.version}`;
      const { name } = plugin;
      const { exec } = require('node:child_process');
      const cache = path.join(this.baseDir, 'cache');
      exec(
        `npm install --prefix ${cache} ${module}`,
        (error: any, stdout: any, stderr: any) => {
          if (error) {
            log.error('exec error::', error);
            resolve({ code: -1, data: error });
          }
          console.error(`stderr: ${stderr}`);
          try {
            const destinationPath = path.join(this.baseDir, name);
            if (fs.existsSync(destinationPath)) {
              deleteFolder(destinationPath);
            }
            fs.renameSync(
              path.join(cache, 'node_modules', name),
              destinationPath,
            );
            console.log('install plugin success!');
            resolve({ code: 0 });
          } catch (err) {
            log.error('install plugin failed:', error);
            resolve({
              code: -1,
              data: 'copy plugin failed! maybe has already existed.',
            });
          }
        },
      );
    });
  }
}

export default PluginManager;
