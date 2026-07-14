import { ElectronHandler } from '../preload/index';

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    electron: ElectronHandler;
    toolkit: any;
    _hmt: any[][];
  }
}

export {};
