/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable func-names */
/* eslint-disable radix */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable no-console */
/* eslint-disable react/jsx-no-useless-fragment */
/* eslint-disable guard-for-in */
/* eslint-disable no-unused-expressions */
/* eslint-disable no-sequences */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-undef */
/* eslint-disable eqeqeq */
/* eslint-disable no-sparse-arrays */
/* eslint-disable jsx-a11y/mouse-events-have-key-events */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/anchor-is-valid */
/* eslint-disable jsx-a11y/anchor-has-content */
/* eslint-disable jsx-a11y/control-has-associated-label */
import { createRoot } from 'react-dom/client';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  DeleteOutlined,
  CloudDownloadOutlined,
  AppstoreOutlined,
  ShopOutlined,
  SearchOutlined,
  SettingOutlined,
  CheckOutlined,
  CloseOutlined,
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
  TabsProps,
  Tabs,
  Spin,
  notification,
  Typography,
  Space,
  Select,
  Switch,
  Button,
} from 'antd';
import { Footer } from 'antd/es/layout/layout';
import Meta from 'antd/es/card/Meta';
import baiduAnalyticsRenderer from './baiduAnalytics';

const { Title } = Typography;
const { Sider, Content } = Layout;

function Dashboard() {
  const inputRef = useRef(null);
  const [collapsed, setCollapsed] = useState(true);
  const [hoverable, setHoverable] = useState(false);
  const [inputSearch, setInputSearch] = useState('');
  const [result, setResult] = useState([]);
  const [allPlugins, setAllPlugins] = useState([]);
  const [storePlugins, setStorePlugins] = useState([]);
  const [selectKey, setSelectKey] = useState(1);
  const [installing, setInstalling] = useState(new Map());
  const [selectPluginName, setSelectPluginName] = useState('');
  const [setting, SetSetting] = useState(null);

  const refreshResult = (plugins: any[]) => {
    if (plugins.length == 0) {
      setResult([]);
      return;
    }
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

  const refreshStorePlugins = () => {
    console.log('refresh store plugin');
    const plugins = window.electron.ipcRenderer.ipcSendSync(
      'getStoreAppList',
      null,
    );

    const allPlugins = window.electron.ipcRenderer.ipcSendSync(
      'listPlugins',
      null,
    );
    const allPluginsMap = new Map();
    for (const p of allPlugins) {
      allPluginsMap.set(p.name, p);
    }
    let resultList: any[] = [];
    for (const attr in plugins) {
      let array = plugins[attr];
      array = array.map((obj: any) => {
        return {
          ...obj,
          category: attr,
          installed: allPluginsMap.has(obj.name),
          installVersion: allPluginsMap.has(obj.name)
            ? allPluginsMap.get(obj.name).version
            : '',
        };
      });
      resultList = resultList.concat(array);
    }
    setStorePlugins(plugins);
    refreshResult(resultList);
  };

  const refreshPlugins = useCallback(() => {
    console.log('refresh plugin');
    const plugins = window.electron.ipcRenderer.ipcSendSync(
      'listPlugins',
      null,
    );
    setAllPlugins(plugins);
    refreshResult(plugins);
  }, []);

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

    const onListenerMainProcess = () => {
      window.electron.ipcRenderer.on('dashboard-reply', (response: any) => {
        if (response.operator === 'installPlugin') {
          const { result } = response;
          const { name } = response.result;
          installing.delete(name);
          if (result == undefined || result.code < 0) {
            console.error(result);
            notification.error({
              message: `Install ${name}  failed!`,
              description:
                result == undefined ? '' : JSON.stringify(result.data),
            });
            setInstalling(new Map(installing.entries()));
          } else {
            notification.success({
              message: `Install plugin succeed!`,
              description: `plugin name:${name}`,
            });
            refreshStorePlugins();
          }
        }
      });
    };
    onListenerMainProcess();

    const getAppSetting = () => {
      const setting = window.electron.ipcRenderer.ipcSendSync(
        'getSetting',
        null,
      );
      SetSetting(setting);
    };
    getAppSetting();

    const baiduAnalytics = () => {
      try {
        console.log('baidu analytics');
        baiduAnalyticsRenderer(
          '077ebf5af4b96181076eefc3db60ad2c',
          (_hmt: string[][]) => {
            _hmt.push(['_trackPageview', '/']);
          },
        );
      } catch (error) {
        console.error(error);
      }
    };
    baiduAnalytics();
  }, []);

  const onMenu = (item: any) => {
    setSelectKey(parseInt(item.key));
    if (item.key === '1') {
      refreshPlugins();
    } else if (item.key === '2') {
      refreshStorePlugins();
    } else {
      console.log(item.key);
    }
  };

  const onInstallPlugin = async (plugin: any) => {
    const map = new Map(installing.entries());
    map.set(plugin.name, true);
    setInstalling(map);
    window.electron.ipcRenderer.ipcSend('installPlugin', plugin);
  };
  const generatorStoreApp = (result: any) => {
    return result.map((plugin: ToolkitPlugin) => {
      return (
        <Col md={8} lg={4} key={`${plugin.name}}`}>
          <Card
            title={plugin.pluginName}
            hoverable={hoverable}
            extra={
              plugin.installed && plugin.version == plugin.installVersion
                ? []
                : [
                    <Spin
                      key={`${plugin.name}-spin-${Math.random()}`}
                      spinning={
                        installing.has(plugin.name) &&
                        installing.get(plugin.name)
                      }
                    >
                      <CloudDownloadOutlined
                        onClick={(event) => {
                          try {
                            onInstallPlugin(plugin);
                          } catch (error) {
                            console.error(error);
                          } finally {
                            event.preventDefault();
                          }
                        }}
                        style={{
                          color: 'green',
                        }}
                      />
                    </Spin>,
                  ]
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
    });
  };

  const onChange = (e: { target: { value: any } }) => {
    let { value } = e.target;
    value = value.toLowerCase();
    let resultList = allPlugins.filter(
      (plugin: ToolkitPlugin) =>
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

  const renderAppPage = (result: ToolkitPlugin[]) => {
    return result.length > 0 ? (
      result.map((plugin: ToolkitPlugin) => {
        return (
          <Col md={8} lg={4} key={plugin.name}>
            <Card
              title={plugin.pluginName}
              hoverable={hoverable}
              onMouseOver={() => setSelectPluginName(plugin.name)}
              onMouseOut={() => setSelectPluginName('')}
              extra={
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
                    style={{
                      color: 'red',
                      display: selectPluginName == plugin.name ? '' : 'none',
                    }}
                  />
                </Popconfirm>
              }
            >
              <div
                onClick={(event) => {
                  try {
                    window.electron.ipcRenderer.ipcSendSync(
                      'openPlugin',
                      plugin.name,
                    );
                  } catch (error) {
                    console.error(error);
                  } finally {
                    event.preventDefault();
                  }
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
    );
  };

  const renderStorePage = (storePlugins: ToolkitPlugin[]) => {
    const items: TabsProps['items'] = [
      {
        key: `all-tab${Math.random()}`,
        label: 'ALL',
        children: <Row gutter={[24, 16]}>{generatorStoreApp(result)}</Row>,
      },
    ];

    const allPluginsMap = new Map();
    for (const p of allPlugins) {
      allPluginsMap.set(p.name, p);
    }
    for (const category in storePlugins) {
      let array = storePlugins[category];
      (array = array.map((obj: any) => {
        return {
          ...obj,
          category,
          installed: allPluginsMap.has(obj.name),
          installVersion: allPluginsMap.has(obj.name)
            ? allPluginsMap.get(obj.name).version
            : '',
        };
      })),
        items.push({
          key: category,
          label: category,
          children: <Row gutter={[24, 16]}>{generatorStoreApp(array)}</Row>,
        });
    }
    return storePlugins ? (
      <Tabs
        defaultActiveKey="all"
        items={items}
        style={{ width: '100%', paddingLeft: 10 }}
      />
    ) : (
      <></>
    );
  };
  const onSettingSwitch = (checked: boolean) => {
    const newSetting = setting;
    newSetting.sort = checked;
    SetSetting(newSetting);
    try {
      window.electron.ipcRenderer.ipcSend('saveSettingByKey', {
        key: 'sort',
        value: checked,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const renderSettingPage = () => {
    return (
      <>
        <Title level={2}>设置</Title>
        <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
          <Row>
            <Col span={24}>
              <div
                style={{
                  width: '100%',
                  backgroundColor: '#fafafa',
                  minHeight: '80px',
                  padding: '12px',
                  borderRadius: '0 0 8px 8px',
                  border: '1px solid #f0f0f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <p style={{ display: 'block' }}>
                  <span style={{ fontSize: '14px' }}>界面语言</span>
                  <br />
                  <span style={{ fontSize: '12px' }}>
                    修改界面语言后，需要重新启动应用程序
                  </span>
                </p>
                <Select
                  defaultValue="china"
                  style={{ width: 120 }}
                  options={[{ value: 'china', label: '中文' }]}
                />
              </div>
            </Col>
          </Row>
          <Row>
            <Col span={24}>
              <div
                style={{
                  width: '100%',
                  backgroundColor: '#fafafa',
                  minHeight: '80px',
                  padding: '12px',
                  borderRadius: '0 0 8px 8px',
                  border: '1px solid #f0f0f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <p style={{ display: 'block' }}>
                  <span style={{ fontSize: '14px' }}>插件排序</span>
                  <br />
                  <span style={{ fontSize: '12px' }}>
                    是否根据用户点击插件数据来排列插件优先级顺序
                  </span>
                </p>
                <div>
                  <Button>重置</Button>
                  &nbsp;&nbsp;&nbsp;
                  <Switch
                    defaultChecked={setting.sort}
                    onChange={onSettingSwitch}
                    style={{ width: 65, height: 26 }}
                    checkedChildren={<CheckOutlined />}
                    unCheckedChildren={<CloseOutlined />}
                  />
                </div>
              </div>
            </Col>
          </Row>
        </Space>
      </>
    );
  };

  const {
    token: { colorBgContainer },
  } = theme.useToken();
  return (
    <Layout style={{ minHeight: '97vh' }}>
      <Sider
        // collapsible
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
            disabled={selectKey !== 1}
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
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '100%',
            marginTop: '-0.1px',
            paddingTop: '-0.1px',
          }}
        >
          <Menu
            theme="light"
            mode="inline"
            selectedKeys={[`${selectKey}`]}
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
          <Menu
            theme="light"
            mode="inline"
            onClick={onMenu}
            selectedKeys={[`${selectKey}`]}
            items={[
              {
                key: '10',
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
          <Row gutter={[24, 16]} hidden={selectKey == 1 && result.length > 0}>
            {selectKey == 1 && renderAppPage(result)}
          </Row>
          {selectKey == 2 && renderStorePage(storePlugins)}
          {selectKey == 10 && renderSettingPage()}
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
