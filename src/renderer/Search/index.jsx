/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useRef, useState } from 'react';
import { Input, List, Avatar, Card } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import './index.css';

function Search() {
  const inputRef = useRef(null);
  const [result, setResult] = useState([]);
  const [allPlugins, setAllPlugins] = useState([]);
  const [resultHide, setResultHide] = useState(true);
  const [inputSearch, setInputSearch] = useState(null);
  useEffect(() => {
    inputRef.current.focus();
    const plugins = window.electron.ipcRenderer.ipcSendSync('listPlugins');
    setAllPlugins(plugins);
  }, []);

  const onChange = (e) => {
    let { value } = e.target;
    value = value.toLowerCase();
    let resultList = allPlugins.filter(
      (plugin) =>
        plugin.name.toLowerCase().startsWith(value) ||
        plugin.name.toLowerCase().indexOf(value) > 0,
    );
    if (value === ':all' || value.startsWith(':')) {
      resultList = allPlugins;
    } else if (value.trim().length === 0) {
      resultList = [];
    }
    if (resultList.length > 0) {
      setResultHide(false);
    } else {
      setResultHide(true);
    }
    setInputSearch(e.target.value);
    setResult(resultList);
  };

  const clearInput = () => {
    setResultHide(true);
    setInputSearch('');
    inputRef.current.focus();
  };
  return (
    <div>
      <Input
        tabIndex={0}
        ref={inputRef}
        placeholder="Start typing..."
        size="large"
        value={inputSearch}
        onChange={onChange}
        onFocus={() => {
          const plugins =
            window.electron.ipcRenderer.ipcSendSync('listPlugins');
          setAllPlugins(plugins);
        }}
        suffix={<SearchOutlined />}
        style={{
          width: 670,
          height: 60,
          fontSize: '26px',
          borderWidth: '2px',
        }}
      />
      {resultHide ? null : (
        <Card id="result" style={{ width: 670, top: 15 }}>
          <List
            itemLayout="horizontal"
            style={
              result.length > 6
                ? {
                    height: 500,
                    overflowY: 'scroll',
                    marginLeft: 10,
                    marginRight: 10,
                  }
                : { marginLeft: 10, marginRight: 10 }
            }
            dataSource={result}
            renderItem={(item, index) => (
              <List.Item
                tabIndex={index + 1}
                onClick={(event) => {
                  window.electron.ipcRenderer.ipcSendSync(
                    'openPlugin',
                    item.name,
                  );
                  clearInput();
                  event.preventDefault();
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    window.electron.ipcRenderer.ipcSendSync(
                      'openPlugin',
                      item.name,
                    );
                    clearInput();
                    event.preventDefault();
                  }
                }}
              >
                <List.Item.Meta
                  avatar={<Avatar src={item.logoPath} />}
                  title={item.pluginName}
                  description={item.description}
                />
                <div style={{ marginRight: 10 }}>{item.version}</div>
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  );
}
export default Search;
