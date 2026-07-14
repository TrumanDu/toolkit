import type { ToolkitPlugin } from '../../../types/plugin';
import { CloudDownloadOutlined } from '@ant-design/icons';
import { Row, Card, Col, Avatar, Tabs, Spin, notification, Empty } from 'antd';
import type { TabsProps } from 'antd';

const { Meta } = Card;

interface StorePlugin extends ToolkitPlugin {
  category?: string;
  installed?: boolean;
  installVersion?: string;
}

interface Props {
  storePlugins: Record<string, any[]>;
  installedPlugins: ToolkitPlugin[];
  result: StorePlugin[];
  installing: Map<string, boolean>;
  onInstall: (plugin: StorePlugin) => void;
}

export default function StorePlugins({ storePlugins, installedPlugins, result, installing, onInstall }: Props) {
  const installedMap = new Map(installedPlugins.map((p) => [p.name, p]));

  const enrichPlugin = (obj: any, category: string): StorePlugin => ({
    ...obj,
    category,
    installed: installedMap.has(obj.name),
    installVersion: installedMap.get(obj.name)?.version ?? '',
  });

  const renderCards = (plugins: StorePlugin[]) => {
    if (plugins.length === 0) return <Empty description="暂无插件" />;
    return (
      <Row gutter={[24, 16]}>
        {plugins.map((plugin) => {
          const isInstalled = plugin.installed && plugin.version === plugin.installVersion;
          return (
            <Col md={8} lg={4} key={`store-${plugin.name}`}>
              <Card
                title={plugin.pluginName}
                hoverable
                extra={
                  !isInstalled && (
                    <Spin spinning={installing.get(plugin.name) ?? false}>
                      <CloudDownloadOutlined
                        onClick={(e) => {
                          e.stopPropagation();
                          onInstall(plugin);
                        }}
                        style={{ color: 'green', cursor: 'pointer' }}
                      />
                    </Spin>
                  )
                }
              >
                <div>
                  <Meta
                    avatar={<Avatar src={plugin.logo} />}
                    description={`Version: ${plugin.version}`}
                  />
                  <br />
                  <div style={{ height: 80 }}>{plugin.description}</div>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>
    );
  };

  const items: TabsProps['items'] = [
    {
      key: 'all',
      label: 'ALL',
      children: renderCards(result),
    },
    ...Object.entries(storePlugins).map(([category, plugins]) => ({
      key: category,
      label: category,
      children: renderCards(plugins.map((p) => enrichPlugin(p, category))),
    })),
  ];

  return (
    <Tabs
      defaultActiveKey="all"
      items={items}
      style={{ width: '100%', paddingLeft: 10 }}
    />
  );
}
