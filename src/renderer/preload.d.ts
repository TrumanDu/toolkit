import { ElectronHandler, ToolkitHandler } from '../main/preload';

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    electron: ElectronHandler;
    toolkit: ToolkitHandler;
  }
}

export {};
