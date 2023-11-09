import path from 'path';

import * as fs from 'fs';
import { BrowserWindow, shell } from 'electron';
import DB from './db';

class PluginManager {
  // 插件安装地址
  public baseDir: string = path.join(
    path.resolve(__dirname, '../..'),
    'plugins',
  );

  public allPlugins: any[] = [];

  public db: DB = new DB('plugin.db');

  constructor() {
    this.allPlugins = this.listPlugin();
    this.db.init();
  }

  public listPlugin() {
    const files = fs.readdirSync(this.baseDir);
    const pluginList: any[] = [];
    files.forEach((filename) => {
      const pluginPath = path.join(this.baseDir, filename);
      const packagePath = path.join(pluginPath, 'package.json');
      if (fs.existsSync(packagePath)) {
        const str = fs.readFileSync(packagePath, 'utf8');
        const pluginObj = JSON.parse(str);
        pluginObj.logoPath = path.join(pluginPath, pluginObj.logo);
        pluginObj.pluginPath = pluginPath;
        pluginList.push(pluginObj);
      }
    });
    return pluginList;
  }

  public getPlugin(name: string) {
    return this.allPlugins.find((plugin) => name === plugin.name);
  }

  public async openPlugin(name: string) {
    const pluginObj = this.getPlugin(name);
    const pluginWin = new BrowserWindow({
      height: 600,
      minHeight: 600,
      width: 1024,
      title: pluginObj.name,
      show: false,
      icon: pluginObj.logoPath,
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
    // pluginWin.setPosition(
    //   pluginWin.getPosition()[0],
    //   pluginWin.getPosition()[1],
    // );
    // const pluginSave = await this.db.get(name);
    // if (pluginSave) {
    //   const { width, height } = pluginSave;
    //   pluginWin.setSize(width, height);
    // }
    // pluginWin.on('resize', () => {
    //   const { width, height } = pluginWin.getBounds();
    //   this.db.put(name, { width, height });
    // });

    // pluginWin.loadURL(resolveHtmlPath('plugin.html'));
    pluginWin.loadURL(`file://${pluginObj.pluginPath}/${pluginObj.entry}`);
    pluginWin.webContents.setWindowOpenHandler((data: { url: string }) => {
      shell.openExternal(data.url);
      return { action: 'deny' };
    });
    pluginWin.once('ready-to-show', async () => {
      pluginWin.webContents.executeJavaScript(`console.log('init plugin!')`);
      pluginWin.show();
    });
  }
}

export default PluginManager;
