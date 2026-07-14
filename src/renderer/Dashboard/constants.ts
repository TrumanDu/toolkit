export enum MenuTab {
  Installed = 1,
  Store = 2,
  Settings = 10,
}

export const DEFAULT_SETTINGS = {
  sort: true,
  language: 'zh-CN',
} as const;
