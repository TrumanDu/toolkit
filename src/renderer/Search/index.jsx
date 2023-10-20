import React, { useEffect, useRef, useState } from 'react';
import { Input, List, Avatar, Card } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

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
  return (
    <div>
      <Input
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
      <Card style={{ width: 670, top: 15 }} hidden={resultHide}>
        <List
          itemLayout="horizontal"
          dataSource={result}
          renderItem={(item, index) => (
            <List.Item>
              <List.Item.Meta
                avatar={
                  <Avatar
                    src={`https://xsgames.co/randomusers/avatar.php?g=pixel&key=${index}`}
                  />
                }
                title={<a href="https://ant.design">{item.title}</a>}
                description="Ant Design, a design language for background applications, is refined by Ant UED Team"
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
}
export default Search;
