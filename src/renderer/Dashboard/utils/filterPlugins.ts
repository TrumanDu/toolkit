import type { ToolkitPlugin } from '../../../types/plugin';

/**
 * Filter plugins by search query.
 * Supports exact prefix match and substring match.
 * Special commands: ':all' or ':' prefix shows all plugins.
 */
export default function filterPlugins(
  plugins: ToolkitPlugin[],
  query: string,
): ToolkitPlugin[] {
  const value = query.toLowerCase().trim();

  if (value === '' || value === ':all' || value.startsWith(':')) {
    return plugins;
  }

  return plugins.filter(
    (plugin) =>
      plugin.name.toLowerCase().startsWith(value) ||
      plugin.name.toLowerCase().includes(value),
  );
}
