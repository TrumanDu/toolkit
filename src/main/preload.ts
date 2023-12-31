/* eslint-disable @typescript-eslint/no-unused-vars */
// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent, shell } from 'electron';

export type Channels = 'ipc-example';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
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

window.toolkit = {
  goto(url: string) {
    shell.openExternal(url);
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
