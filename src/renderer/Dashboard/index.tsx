/* eslint-disable eqeqeq */
/* eslint-disable no-sparse-arrays */
/* eslint-disable jsx-a11y/mouse-events-have-key-events */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/anchor-is-valid */
/* eslint-disable jsx-a11y/anchor-has-content */
/* eslint-disable jsx-a11y/control-has-associated-label */
import { createRoot } from 'react-dom/client';
import { useState, useEffect, useRef } from 'react';
import {
  DeleteOutlined,
  CloudDownloadOutlined,
  AppstoreOutlined,
  ShopOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Layout,
  Menu,
  theme,
  Input,
  Row,
  Card,
  Col,
  Avatar,
  Popconfirm,
} from 'antd';
import { Footer } from 'antd/es/layout/layout';
import Meta from 'antd/es/card/Meta';

const { Sider, Content } = Layout;

function Dashboard() {
  const inputRef = useRef(null);
  const [collapsed, setCollapsed] = useState(false);
  const [hoverable, setHoverable] = useState(false);
  const [inputSearch, setInputSearch] = useState('');
  const [result, setResult] = useState([]);
  const [allPlugins, setAllPlugins] = useState([]);
  const [storePlugins, setStorePlugins] = useState([]);
  const [selectKey, setSelectKey] = useState(1);

  const refreshResult = (plugins: any[]) => {
    const value = inputSearch.toLocaleLowerCase();
    let resultList = plugins.filter(
      (plugin) =>
        plugin.name.toLowerCase().startsWith(value) ||
        plugin.name.toLowerCase().indexOf(value) > 0,
    );
    if (
      value === ':all' ||
      value.startsWith(':') ||
      value.trim().length === 0
    ) {
      resultList = plugins;
    }
    setResult(resultList);
  };

  const refreshPlugins = () => {
    console.log('refresh plugin');
    const plugins = window.electron.ipcRenderer.ipcSendSync(
      'listPlugins',
      null,
    );
    setAllPlugins(plugins);
    refreshResult(plugins);
  };

  const refreshStorePlugins = () => {
    console.log('refresh store plugin');
    const plugins = window.electron.ipcRenderer.ipcSendSync(
      'listPlugins',
      null,
    );
    let resultList = plugins.filter(
      (plugin) => !allPlugins.some((install) => install.name === plugin.name),
    );
    setStorePlugins(resultList);
    refreshResult(resultList);
  };

  const removePlugin = (name: string) => {
    const plugins = window.electron.ipcRenderer.ipcSendSync(
      'removePlugin',
      name,
    );

    setAllPlugins(plugins);
    refreshResult(plugins);
  };
  useEffect(() => {
    refreshPlugins();
  }, []);

  const onMenu = (item: any) => {
    setSelectKey(item.key);
    if (item.key === '1') {
      refreshPlugins();
    } else if (item.key === '2') {
      refreshStorePlugins();
    } else {
      console.log(item.key);
    }
  };

  const onChange = (e: { target: { value: any } }) => {
    let { value } = e.target;
    value = value.toLowerCase();
    let resultList = allPlugins.filter(
      (plugin) =>
        plugin.name.toLowerCase().startsWith(value) ||
        plugin.name.toLowerCase().indexOf(value) > 0,
    );
    if (
      value === ':all' ||
      value.startsWith(':') ||
      value.trim().length === 0
    ) {
      resultList = allPlugins;
    }
    setInputSearch(e.target.value);
    setResult(resultList);
  };

  const {
    token: { colorBgContainer },
  } = theme.useToken();
  return (
    <Layout style={{ minHeight: '97vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        theme="light"
      >
        {collapsed ? null : (
          <Input
            ref={inputRef}
            value={inputSearch}
            onChange={onChange}
            hidden={collapsed}
            tabIndex={0}
            placeholder="搜索你想要使用的软件名称"
            suffix={<SearchOutlined />}
            style={{
              width: '98%',
              fontSize: '14px',
              borderWidth: '2px',
              bottom: 4,
            }}
          />
        )}

        <Menu
          theme="light"
          mode="inline"
          defaultSelectedKeys={['1']}
          onClick={onMenu}
          items={[
            {
              key: '1',
              icon: <AppstoreOutlined />,
              label: '已安装工具',
            },
            {
              key: '2',
              icon: <ShopOutlined />,
              label: 'APP市场',
            },
          ]}
        />
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
          <Row gutter={[24, 16]}>
            {selectKey == 1 && result.length > 0 ? (
              result.map((plugin) => {
                return (
                  <Col md={8} lg={4} key={plugin.name}>
                    <Card
                      title={plugin.pluginName}
                      hoverable={hoverable}
                      actions={[
                        <Popconfirm
                          title="Delete the plugin"
                          description="Are you sure to delete this plugin?"
                          onConfirm={() => removePlugin(plugin.name)}
                          onCancel={() => {}}
                          okText="Yes"
                          cancelText="No"
                        >
                          <DeleteOutlined
                            key="remove"
                            // style={{ color: 'red' }}
                          />
                        </Popconfirm>,
                        <CloudDownloadOutlined key="upgrade" />,
                      ]}
                    >
                      <div
                        onClick={(event) => {
                          window.electron.ipcRenderer.ipcSendSync(
                            'openPlugin',
                            plugin.name,
                          );
                          event.preventDefault();
                        }}
                        onMouseOver={() => setHoverable(true)}
                        onMouseOut={() => setHoverable(false)}
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
                );
              })
            ) : (
              <Col />
            )}

            {selectKey == 2 && result.length > 0 ? (
              result.map((plugin) => {
                return (
                  <Col md={8} lg={4} key={plugin.name}>
                    <Card
                      title={plugin.pluginName}
                      hoverable={hoverable}
                      actions={[
                        <Popconfirm
                          title="Install the plugin"
                          description="Are you sure to install this plugin?"
                          onConfirm={() => {}}
                          onCancel={() => {}}
                          okText="Yes"
                          cancelText="No"
                        >
                          <CloudDownloadOutlined key="upgrade" />
                        </Popconfirm>,
                      ]}
                    >
                      <div>
                        <Meta
                          avatar={<Avatar src={plugin.logoPath} />}
                          description={`Version: ${plugin.version}`}
                        />
                        <br />
                        <div style={{ height: 80 }}>{plugin.description}</div>
                      </div>
                    </Card>
                  </Col>
                );
              })
            ) : (
              <Col />
            )}
          </Row>
        </Content>
        <Footer style={{ textAlign: 'center' }}>
          Toolkit ©2023 Created by{' '}
          <a href="https://www.trumandu.top">TrumanDu</a>
        </Footer>
      </Layout>
    </Layout>
  );
}

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(<Dashboard />);
