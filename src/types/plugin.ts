interface ToolkitPlugin {
  name: string;
  pluginName: string;
  logo?: string;
  logoPath?: string;
  version: string;
  description: string;
  entry: string;
  pluginType?: string;
  mode?: string;
  author?: string;
  homepage?: string;
  keywords?: string[];
  category?: string;
  installed?: boolean;
  installVersion?: string;
  pluginPath?: string;
  preload?: string;
  preloadPath?: string;
  webContainer?: boolean;
}

// eslint-disable-next-line import/prefer-default-export
export type { ToolkitPlugin };
