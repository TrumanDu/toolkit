/* eslint import/prefer-default-export: off */
import { URL } from 'url';
import path from 'path';
import { app } from 'electron';
import * as fs from 'fs';

const RESOURCES_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'assets')
  : path.join(__dirname, '../../assets');

export function resolveHtmlPath(htmlFileName: string) {
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.PORT || 1212;
    const url = new URL(`http://localhost:${port}`);
    url.pathname = htmlFileName;
    return url.href;
  }
  return `file://${path.resolve(__dirname, '../renderer/', htmlFileName)}`;
}

export function getAssetPath(...paths: string[]): string {
  return path.join(RESOURCES_PATH, ...paths);
}

export function getPluginDir(): string {
  return app.isPackaged
    ? path.join(path.dirname(app.getPath('exe')), 'plugins')
    : path.join(app.getAppPath(), 'plugins');
}

export function getAppDir(): string {
  return app.isPackaged ? path.dirname(app.getPath('exe')) : app.getAppPath();
}

export function deleteFolder(filePath: string) {
  if (fs.existsSync(filePath)) {
    const files = fs.readdirSync(filePath);
    files.forEach((file) => {
      const nextFilePath = `${filePath}/${file}`;
      const states = fs.statSync(nextFilePath);
      if (states.isDirectory()) {
        deleteFolder(nextFilePath);
      } else {
        fs.unlinkSync(nextFilePath);
      }
    });
    fs.rmdirSync(filePath);
  }
}
