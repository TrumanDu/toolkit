/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent, shell } from 'electron';
import FileAPI from '../main/file_api';

function resolveAppInstallDir(): string {
  // 插件窗通过 additionalArguments 注入，避免 sendSync 阻塞 preload
  const fromArg = process.argv
    .find((arg) => arg.startsWith('--toolkit-app-dir='))
    ?.slice('--toolkit-app-dir='.length);
  if (fromArg) return fromArg;
  return ipcRenderer.sendSync('get-app-install-dir');
}

/** 插件窗带此参数；Dashboard 不带，需完整 electron IPC 桥 */
const isPluginWindow = process.argv.some((arg) =>
  arg.startsWith('--toolkit-app-dir='),
);

const appInstallDir = resolveAppInstallDir();
const fileAPI = new FileAPI(appInstallDir);

const toolkit = {
  goto(url: string) {
    shell.openExternal(url);
  },
  mkdir(dirname: string) {
    fileAPI.mkdir(dirname);
  },
  list(dirname: string) {
    return fileAPI.list(dirname);
  },
  saveFile(dirname: string, filename: string, content: any) {
    fileAPI.saveFile(dirname, filename, content);
  },
  removeFile(dirname: string, filename: string) {
    fileAPI.removeFile(dirname, filename);
  },
  rename(dirname: string, oldname: string, filename: string) {
    fileAPI.rename(dirname, oldname, filename);
  },
};

contextBridge.exposeInMainWorld('toolkit', toolkit);

// 兼容旧插件对 window.toolkit 赋值的依赖（隔离世界内）
window.toolkit = toolkit;

if (!isPluginWindow) {
  const electronHandler = {
    ipcRenderer: {
      sendMessage(channel: string, ...args: unknown[]) {
        ipcRenderer.send(channel, ...args);
      },
      on(channel: string, func: (...args: unknown[]) => void) {
        const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
          func(...args);
        ipcRenderer.on(channel, subscription);

        return () => {
          ipcRenderer.removeListener(channel, subscription);
        };
      },
      once(channel: string, func: (...args: unknown[]) => void) {
        ipcRenderer.once(channel, (_event, ...args) => func(...args));
      },
      ipcSendSync(type: any, data: any) {
        const returnValue = ipcRenderer.sendSync('trigger', {
          type,
          data,
        });
        if (returnValue instanceof Error) throw returnValue;
        return returnValue;
      },
      ipcSend(type: any, data: any) {
        ipcRenderer.send('trigger', {
          type,
          data,
        });
      },
    },
  };

  contextBridge.exposeInMainWorld('electron', electronHandler);
}

export type ElectronHandler = {
  ipcRenderer: {
    sendMessage(channel: string, ...args: unknown[]): void;
    on(
      channel: string,
      func: (...args: unknown[]) => void,
    ): () => void;
    once(channel: string, func: (...args: unknown[]) => void): void;
    ipcSendSync(type: any, data: any): any;
    ipcSend(type: any, data: any): void;
  };
};
