import { useState } from 'react';
import { DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { Input, Row, Card, Col, Avatar, Popconfirm, Empty } from 'antd';
import type { ToolkitPlugin } from '../../../types/plugin';
import filterPlugins from '../utils/filterPlugins';

const { Meta } = Card;

interface Props {
  plugins: ToolkitPlugin[];
  onOpen: (name: string) => void;
  onRemove: (name: string) => void;
}

export default function InstalledPlugins({ plugins, onOpen, onRemove }: Props) {
  const [query, setQuery] = useState('');
  const [hoveredCard, setHoveredCard] = useState('');
  const filtered = filterPlugins(plugins, query);

  return (
    <>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜索你想要使用的软件名称"
        suffix={<SearchOutlined />}
        style={{ marginBottom: 16, fontSize: 14 }}
      />
      {filtered.length === 0 ? (
        <Empty description="暂无已安装的工具" />
      ) : (
        <Row gutter={[24, 16]}>
          {filtered.map((plugin) => (
            <Col md={8} lg={4} key={plugin.name}>
              <Card
                title={plugin.pluginName}
                hoverable
                onMouseEnter={() => setHoveredCard(plugin.name)}
                onMouseLeave={() => setHoveredCard('')}
                extra={
                  hoveredCard === plugin.name ? (
                    <Popconfirm
                      title="删除插件"
                      description={`确定要删除 ${plugin.pluginName} 吗？`}
                      onConfirm={() => onRemove(plugin.name)}
                      okText="确定"
                      cancelText="取消"
                    >
                      <DeleteOutlined style={{ color: 'red' }} />
                    </Popconfirm>
                  ) : null
                }
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpen(plugin.name)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onOpen(plugin.name);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <Meta
                    avatar={<Avatar src={plugin.logoPath} />}
                    description={`Version: ${plugin.version}`}
                  />
                  <br />
                  <div style={{ height: 80 }}>{plugin.description}</div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </>
  );
}
