import path from 'path';

import * as fs from 'fs';
import { BrowserWindow, shell } from 'electron';
import Store from 'electron-store';
// import DB from './db';
import { getAssetPath } from './util';

const DEFAULT_WINDOW_WIDTH = 1200;
const DEFAULT_WINDOW_HEIGHT = 770;

class PluginManager {
  // 插件安装地址
  public baseDir: string = path.join(
    path.resolve(__dirname, '../..'),
    'plugins',
  );

  public allPlugins: any[] = [];

  // 创建一个新的存储实例
  public store = new Store();

  constructor() {
    this.allPlugins = this.listPlugin();
  }

  public listPlugin() {
    const files = fs.readdirSync(this.baseDir);
    const pluginList: any[] = [];
    files.forEach((filename) => {
      const pluginPath = path.join(this.baseDir, filename);
      const packagePath = path.join(pluginPath, 'plugin.json');
      if (fs.existsSync(packagePath)) {
        const str = fs.readFileSync(packagePath, 'utf8');
        const pluginObj = JSON.parse(str);
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
    return pluginList;
  }

  public reloadPlugins() {
    this.allPlugins = this.listPlugin();
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
        backgroundThrottling: false,
        preload: pluginObj.preload ? pluginObj.preloadPath : '',
        contextIsolation: false,
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

    // pluginWin.loadURL(resolveHtmlPath('plugin.html'));
    pluginWin.loadURL(`file://${pluginObj.pluginPath}/${pluginObj.entry}`);
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
      pluginWin.webContents.executeJavaScript(`console.log('init plugin!')`);
      pluginWin.show();
    });
    pluginWin.on('closed', async () => {
      if (pluginViewPool) {
        pluginViewPool.delete(name);
      }
    });

    return pluginWin;
  }
}

export default PluginManager;
