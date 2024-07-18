/* eslint-disable no-console */
import * as fs from 'fs';
import { readJsonObjFromFile } from './util';
import InitCheck from './init_check';

class Setting {
  private settingPath: string;

  private setting: any = { sort: true, language: 'china' };

  constructor(initCheck: InitCheck) {
    this.settingPath = initCheck.settingPath;
    this.init();
  }

  private init() {
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

  public getSetting(): any {
    try {
      this.setting = readJsonObjFromFile(this.settingPath);
    } catch (error) {
      console.error(error);
    }
    return this.setting;
  }
}

export default Setting;
