import type { CSSProperties } from 'react';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { Typography, Space, Row, Col, Select, Switch, Button } from 'antd';

const { Title } = Typography;

const settingRowStyle: CSSProperties = {
  width: '100%',
  backgroundColor: '#fafafa',
  minHeight: 80,
  padding: 12,
  borderRadius: '0 0 8px 8px',
  border: '1px solid #f0f0f0',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

interface Props {
  sort: boolean;
  onSortChange: (checked: boolean) => void;
}

export default function SettingsPage({ sort, onSortChange }: Props) {
  return (
    <>
      <Title level={2}>设置</Title>
      <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
        <Row>
          <Col span={24}>
            <div style={settingRowStyle}>
              <div>
                <span style={{ fontSize: 14 }}>界面语言</span>
                <br />
                <span style={{ fontSize: 12, color: '#888' }}>
                  修改界面语言后，需要重新启动应用程序
                </span>
              </div>
              <Select
                defaultValue="zh-CN"
                style={{ width: 120 }}
                options={[{ value: 'zh-CN', label: '中文' }]}
              />
            </div>
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <div style={settingRowStyle}>
              <div>
                <span style={{ fontSize: 14 }}>插件排序</span>
                <br />
                <span style={{ fontSize: 12, color: '#888' }}>
                  是否根据用户点击插件数据来排列插件优先级顺序
                </span>
              </div>
              <div>
                <Button>重置</Button>
                &nbsp;&nbsp;&nbsp;
                <Switch
                  checked={sort}
                  onChange={onSortChange}
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
}
