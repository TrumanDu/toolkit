/* eslint-disable global-require */
import * as fs from 'fs';
import path from 'path';
import axios from 'axios';
import log from 'electron-log';

const os = require('os');

const APP_STORE_URL = 'https://toolkit.trumandu.top/toolkit-app.json';

export default class InitCheck {
  public pluginDir: string;

  public configDir: string;

  public settingPath: string;

  constructor() {
    const homedir = os.homedir();
    // 用户配置信息，插件，data目录
    const appDataPath = path.join(homedir, 'Toolkit');
    if (!fs.existsSync(appDataPath)) {
      fs.mkdirSync(appDataPath);
    }
    const pluginsPath = path.join(appDataPath, 'plugins');
    if (!fs.existsSync(pluginsPath)) {
      fs.mkdirSync(pluginsPath);
    }

    this.pluginDir = pluginsPath;

    const configPath = path.join(appDataPath, 'config');
    if (!fs.existsSync(configPath)) {
      fs.mkdirSync(configPath);
    }
    this.configDir = configPath;
    const settingPath = path.join(configPath, 'setting.json');
    if (!fs.existsSync(settingPath)) {
      fs.writeFileSync(
        settingPath,
        JSON.stringify({ sort: true, language: 'china' }),
      );
    }

    this.settingPath = settingPath;

    const dataPath = path.join(appDataPath, 'data');
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath);
    }
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
          log.info(`update toolkit-app.json!`);
        }

        return null;
      })
      .catch((error) => {
        log.error('syncAppStoreConfig has failed!', error);
      });
  }

  private init() {
    this.syncAppStoreConfig();
    setInterval(
      () => {
        this.syncAppStoreConfig();
      },
      1000 * 60 * 60 * 10,
    );
  }
}
