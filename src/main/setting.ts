/* eslint-disable no-console */
import path from 'path';
import * as fs from 'fs';
import { getAppDir, readJsonObjFromFile } from './util';

class Setting {
  private configDir: string = path.join(getAppDir(), 'config');

  private settingPath: string = path.join(this.configDir, 'setting.json');

  private setting: object = { sort: true, language: 'china' };

  constructor() {
    this.init();
  }

  private init() {
    if (!fs.existsSync(this.settingPath)) {
      fs.writeFileSync(this.settingPath, JSON.stringify(this.setting));
    }
    try {
      this.setting = readJsonObjFromFile(this.settingPath);
    } catch (error) {
      console.error(error);
    }
  }

  public updateByKey(key: string, value: any) {
    this.setting[key] = value;
    fs.writeFileSync(this.settingPath, JSON.stringify(this.setting));
  }

  public get(key: string): any {
    return this.setting[key];
  }

  public getSetting(): object {
    try {
      this.setting = readJsonObjFromFile(this.settingPath);
    } catch (error) {
      console.error(error);
    }
    return this.setting;
  }
}

export default Setting;
