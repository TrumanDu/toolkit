import { useState, useEffect, useCallback } from 'react';
import {
  AppstoreOutlined,
  ShopOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Layout, Menu, theme, notification } from 'antd';
import baiduAnalyticsRenderer from './baiduAnalytics';
import UpdateProgress from './components/UpdateProgress';
import InstalledPlugins from './components/InstalledPlugins';
import StorePlugins from './components/StorePlugins';
import SettingsPage from './components/SettingsPage';
import type { ToolkitPlugin } from '../../types/plugin';
import { MenuTab } from './constants';

const { Sider, Content, Footer } = Layout;

function Dashboard() {
  const [collapsed, setCollapsed] = useState(true);
  const [selectKey, setSelectKey] = useState(MenuTab.Installed);

  // Plugin state
  const [allPlugins, setAllPlugins] = useState<ToolkitPlugin[]>([]);
  const [storePlugins, setStorePlugins] = useState<Record<string, any[]>>({});
  const [storeResult, setStoreResult] = useState<any[]>([]);
  const [installing, setInstalling] = useState(new Map<string, boolean>());

  // Settings
  const [settings, setSettings] = useState<{ sort: boolean }>({ sort: true });

  // Update progress
  const [progressVisible, setProgressVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState({
    transferred: 0,
    total: 0,
    bytesPerSecond: 0,
  });

  const {
    token: { colorBgContainer },
  } = theme.useToken();

  // ── Data loading ─────────────────────────────────────────────────────────

  const loadPlugins = useCallback(() => {
    const plugins = window.electron.ipcRenderer.ipcSendSync(
      'listPlugins',
      null,
    );
    setAllPlugins(plugins || []);
  }, []);

  const loadStorePlugins = useCallback(() => {
    const store = window.electron.ipcRenderer.ipcSendSync(
      'getStoreAppList',
      null,
    );
    const installed = window.electron.ipcRenderer.ipcSendSync(
      'listPlugins',
      null,
    );
    setStorePlugins(store || {});

    // Build enriched result for ALL tab
    const installedMap = new Map<string, ToolkitPlugin>(
      (installed || []).map((p: ToolkitPlugin) => [p.name, p]),
    );
    const result = Object.entries(store || {}).flatMap(([category, plugins]) =>
      (plugins as any[]).map((obj) => {
        const installedPlugin = installedMap.get(obj.name);
        return {
          ...obj,
          category,
          installed: !!installedPlugin,
          installVersion: installedPlugin?.version ?? '',
        };
      }),
    );
    setStoreResult(result);
  }, []);

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    loadPlugins();

    const setting = window.electron.ipcRenderer.ipcSendSync('getSetting', null);
    if (setting) setSettings(setting);

    try {
      baiduAnalyticsRenderer(
        '077ebf5af4b96181076eefc3db60ad2c',
        (_hmt: string[][]) => {
          _hmt.push(['_trackPageview', '/']);
        },
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
  }, [loadPlugins]);

  useEffect(() => {
    const offReply = window.electron.ipcRenderer.on(
      'dashboard-reply',
      (response: any) => {
        if (response.operator !== 'installPlugin') return;
        const { result, name } = response;

        setInstalling((prev) => {
          const next = new Map(prev);
          next.delete(name);
          return next;
        });

        if (!result || result.code < 0) {
          notification.error({
            message: `Install ${name} failed!`,
            description: result ? JSON.stringify(result.data) : '',
          });
        } else {
          notification.success({
            message: 'Install plugin succeed!',
            description: `plugin name: ${name}`,
          });
          loadStorePlugins();
        }
      },
    );

    const offShow = window.electron.ipcRenderer.on(
      'show-progress-window',
      () => {
        setProgressVisible(true);
      },
    );

    const offProgress = window.electron.ipcRenderer.on(
      'update-progress',
      (data: any) => {
        setProgress(Math.floor(data.percent));
        setProgressStatus({
          transferred: data.transferred,
          total: data.total,
          bytesPerSecond: data.bytesPerSecond,
        });
      },
    );

    const offClose = window.electron.ipcRenderer.on(
      'close-progress-window',
      () => {
        setProgressVisible(false);
      },
    );

    return () => {
      offReply();
      offShow();
      offProgress();
      offClose();
    };
  }, [loadStorePlugins]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleMenu = (item: { key: string }) => {
    const key = Number(item.key);
    setSelectKey(key);
    if (key === MenuTab.Installed) loadPlugins();
    if (key === MenuTab.Store) loadStorePlugins();
  };

  const handleOpenPlugin = (name: string) => {
    // 异步打开，避免 sendSync 阻塞 Dashboard
    window.electron.ipcRenderer.ipcSend('openPlugin', name);
  };

  const handlePreparePlugin = (name: string) => {
    window.electron.ipcRenderer.ipcSend('preparePlugin', name);
  };

  const handleCancelPreparePlugin = (name: string) => {
    window.electron.ipcRenderer.ipcSend('cancelPreparePlugin', name);
  };

  const handleRemovePlugin = (name: string) => {
    const plugins = window.electron.ipcRenderer.ipcSendSync(
      'removePlugin',
      name,
    );
    setAllPlugins(plugins || []);
  };

  const handleInstallPlugin = (plugin: any) => {
    setInstalling((prev) => new Map(prev).set(plugin.name, true));
    window.electron.ipcRenderer.ipcSend('installPlugin', plugin);
  };

  const handleSortChange = (checked: boolean) => {
    setSettings((prev) => ({ ...prev, sort: checked }));
    window.electron.ipcRenderer.ipcSend('saveSettingByKey', {
      key: 'sort',
      value: checked,
    });
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Layout style={{ minHeight: '97vh' }}>
      <Sider collapsed={collapsed} onCollapse={setCollapsed} theme="light">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '100%',
          }}
        >
          <Menu
            theme="light"
            mode="inline"
            selectedKeys={[`${selectKey}`]}
            defaultSelectedKeys={[`${MenuTab.Installed}`]}
            onClick={handleMenu}
            items={[
              {
                key: `${MenuTab.Installed}`,
                icon: <AppstoreOutlined />,
                label: '已安装工具',
              },
              {
                key: `${MenuTab.Store}`,
                icon: <ShopOutlined />,
                label: 'APP市场',
              },
            ]}
          />
          <Menu
            theme="light"
            mode="inline"
            onClick={handleMenu}
            selectedKeys={[`${selectKey}`]}
            items={[
              {
                key: `${MenuTab.Settings}`,
                icon: <SettingOutlined />,
                label: '设置',
              },
            ]}
          />
        </div>
      </Sider>
      <Layout>
        <Content
          style={{
            margin: '8px 8px',
            padding: 12,
            minHeight: 280,
            background: colorBgContainer,
          }}
        >
          {selectKey === MenuTab.Installed && (
            <InstalledPlugins
              plugins={allPlugins}
              onOpen={handleOpenPlugin}
              onPrepare={handlePreparePlugin}
              onCancelPrepare={handleCancelPreparePlugin}
              onRemove={handleRemovePlugin}
            />
          )}
          {selectKey === MenuTab.Store && (
            <StorePlugins
              storePlugins={storePlugins}
              installedPlugins={allPlugins}
              result={storeResult}
              installing={installing}
              onInstall={handleInstallPlugin}
            />
          )}
          {selectKey === MenuTab.Settings && (
            <SettingsPage
              sort={settings.sort}
              onSortChange={handleSortChange}
            />
          )}
        </Content>
        <Footer style={{ textAlign: 'center' }}>
          Toolkit ©2023 Created by{' '}
          <a href="https://www.trumandu.top">TrumanDu</a>
        </Footer>
      </Layout>
      <UpdateProgress
        visible={progressVisible}
        progress={progress}
        status={progressStatus}
      />
    </Layout>
  );
}

export default Dashboard;
