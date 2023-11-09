/* eslint-disable no-underscore-dangle */
/* eslint no-console: ["error", { allow: ["warn", "error"] }] */
import path from 'path';
import fs from 'fs';
import PouchDB from 'pouchdb';

export default class DB {
  public dbPath;

  public defaultDbName;

  public pouchDB: any;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    this.defaultDbName = path.join(dbPath, 'default');
  }

  init(): void {
    if (!fs.existsSync(this.dbPath)) {
      fs.mkdirSync(this.dbPath);
    }
    this.pouchDB = new PouchDB(this.defaultDbName, { auto_compaction: true });
  }

  public async put(_id: string, doc: any) {
    try {
      const old = await this.pouchDB.get(_id);
      const newData = { _id, doc };
      if (old) {
        newData._rev = old._rev;
      }
      await this.pouchDB.put(newData);
    } catch (err) {
      console.error(err);
    }
  }

  public async get(_id: string) {
    let data = null;
    try {
      data = await this.pouchDB.get(_id);
      if (data) {
        data = data.doc;
      }
    } catch (err) {
      console.error(err);
    }

    return data;
  }

  public async remove(_id: string) {
    try {
      const doc = await this.pouchDB.get(_id);
      await this.pouchDB.remove(doc);
    } catch (err) {
      console.error(err);
    }
  }
}
