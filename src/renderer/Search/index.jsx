import React, { useEffect, useRef } from 'react';
import { Input, List, Avatar } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

function Search() {
  const inputRef = useRef(null);
  useEffect(() => {
    inputRef.current.focus();
  }, []);

  const onChange = (e) => {
    console.log(e.target.value);
  };
  const data = [
    {
      title: 'Ant Design Title 1',
    },
    {
      title: 'Ant Design Title 2',
    },
    {
      title: 'Ant Design Title 3',
    },
    {
      title: 'Ant Design Title 4',
    },
  ];
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
      <List
        itemLayout="horizontal"
        dataSource={data}
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
    </div>
  );
}
export default Search;
