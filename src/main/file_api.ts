/* eslint-disable @typescript-eslint/no-shadow */
import path from 'path';
import * as fs from 'fs';

class FileAPI {
  private dataPath;

  constructor(appPath: string) {
    this.dataPath = path.join(appPath, 'data');
  }

  mkdir(dirname: string) {
    const dirPath = path.join(this.dataPath, dirname);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath);
    }
  }

  list(dirname: string) {
    const dirPath = path.join(this.dataPath, dirname);
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      return files;
    }
    return [];
  }

  saveFile(dirname: string, filename: string, content: any) {
    const filePath = path.join(this.dataPath, dirname, filename);
    fs.writeFileSync(filePath, content);
  }

  removeFile(dirname: string, filename: string) {
    const filePath = path.join(this.dataPath, dirname, filename);
    fs.rmSync(filePath);
  }

  rename(dirname: string, oldname: string, filename: string) {
    const oldPath = path.join(this.dataPath, dirname, filename);
    const filePath = path.join(this.dataPath, dirname, filename);
    fs.renameSync(oldPath, filePath);
  }
}

export default FileAPI;
