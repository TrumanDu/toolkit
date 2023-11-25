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
  keywords: string[];
}
