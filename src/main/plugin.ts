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

// import DB from './db';
import axios from 'axios';
import {
  deleteFolder,
  getAppDir,
  getAssetPath,
  getPluginDir,
  readJsonObjFromFile,
} from './util';
import Setting from './setting';

const DEFAULT_WINDOW_WIDTH = 1200;
const DEFAULT_WINDOW_HEIGHT = 770;
const APP_STORE_URL = 'https://toolkit.trumandu.top/toolkit-app.json';

class PluginManager {
  private setting: Setting = new Setting();

  // 插件安装地址
  private baseDir: string = getPluginDir();

  private configDir: string = path.join(getAppDir(), 'config');

  private sortSettingId = 'sortSettingId';

  public allPlugins: any[] = [];

  // 创建一个新的存储实例
  public store = new Store();

  constructor() {
    this.allPlugins = this.listPlugin();
    this.init();
  }

  private syncAppStoreConfig() {
    const https = require('https');
    axios
      .get(APP_STORE_URL, {
        httpsAgent: new https.Agent({
          rejectUnauthorized: false,
        }),
      })
      .then((response) => {
        const toolkitAppPath = path.join(this.configDir, 'toolkit-app.json');
        let localAppStore = '';
        if (fs.existsSync(toolkitAppPath)) {
          localAppStore = fs.readFileSync(toolkitAppPath, 'utf8');
        }

        if (JSON.stringify(response.data) !== localAppStore) {
          fs.writeFileSync(
            toolkitAppPath,
            JSON.stringify(response.data),
            'utf8',
          );
          console.log(`update toolkit-app.json!`);
        }
      })
      .catch((error) => {
        log.error('syncAppStoreConfig has failed!', error);
      });
  }

  public init() {
    this.syncAppStoreConfig();
    setInterval(
      () => {
        this.syncAppStoreConfig();
      },
      1000 * 60 * 60 * 10,
    );
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
        const packageObj = readJsonObjFromFile(packageJsonPath);
        const pluginObj = readJsonObjFromFile(packagePath);
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
      let sortData = this.store.get(this.sortSettingId, {});
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

  public openPlugin(name: string, pluginViewPool: Map<string, BrowserWindow>) {
    const pluginObj = this.getPlugin(name);
    const storeId = `${name}-windowSize`;
    const savedSize = this.store.get(storeId, {
      width: DEFAULT_WINDOW_WIDTH,
      height: DEFAULT_WINDOW_HEIGHT,
    }) as { width: number; height: number };
    const ses = session.fromPartition(`<${name}>`);
    const preloadSystemPath = app.isPackaged
      ? path.join(__dirname, 'preload.js')
      : path.join(__dirname, '../../.erb/dll/preload.js');
    ses.setPreloads([preloadSystemPath]);

    const { sort } = this.setting.getSetting();

    if (sort) {
      let sortData = this.store.get(this.sortSettingId, {});
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
        backgroundThrottling: false,
        preload: pluginObj.preload ? pluginObj.preloadPath : null,
        webviewTag: true,
        nodeIntegration: true,
        navigateOnDragDrop: true,
        experimentalFeatures: true,
        spellcheck: false,
      },
    });
    // pluginWin.setPosition(
    //   pluginWin.getPosition()[0],
    //   pluginWin.getPosition()[1],
    // );
    pluginWin.on('resize', () => {
      const [width, height] = pluginWin?.getSize() || [
        DEFAULT_WINDOW_WIDTH,
        DEFAULT_WINDOW_HEIGHT,
      ];

      this.store.set(storeId, { width, height });
    });
    if (pluginObj.entry && pluginObj.entry.startsWith('http')) {
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
      if (pluginViewPool) {
        pluginViewPool.delete(name);
      }
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
