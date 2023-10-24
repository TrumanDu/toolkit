import React, { useEffect, useRef, useState } from 'react';
import { Input, List, Avatar, Card } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import './index.css';

function Search() {
  const inputRef = useRef(null);
  const [result, setResult] = useState([]);
  const [resultHide, setResultHide] = useState(true);
  useEffect(() => {
    inputRef.current.focus();
  }, []);

  const onChange = (e) => {
    const { value } = e.target;
    const resultList = [];
    for (let i = 0; i < value.length; i += 1) {
      resultList.push({
        title: value.charAt(i),
      });
    }
    if (resultList.length > 0) {
      setResultHide(false);
    } else {
      setResultHide(true);
    }
    setResult(resultList);
  };
  const focusEvent = () => {
    inputRef.current.focus();
    window.electron.ipcRenderer.sendMessage('main-window', {
      event: 'focusMainWindow',
    });
  };
  return (
    <div>
      <Input
        tabIndex={0}
        ref={inputRef}
        placeholder="Start typing..."
        size="large"
        onChange={onChange}
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
            dataSource={result}
            renderItem={(item, index) => (
              <List.Item
                tabIndex={index + 1}
                onClick={() => {
                  console.log(index);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    console.log(index);
                  }
                }}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar
                      src={`https://xsgames.co/randomusers/avatar.php?g=pixel&key=${index}`}
                    />
                  }
                  title={item.title}
                  description="Ant Design, a design language for background applications, is refined by Ant UED Team"
                />
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  );
}
export default Search;
