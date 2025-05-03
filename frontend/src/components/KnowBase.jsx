import React, { useState, useEffect } from "react";
import { fetchUsername } from "./chat/utils";
import {
  EditOutlined,
  EllipsisOutlined,
  SettingOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Avatar, Card, Flex, Input, Button, ConfigProvider, Space } from "antd";
import { createStyles } from "antd-style";

const { Search } = Input;

const onSearch = (value, _e, info) =>
  console.log(info === null || info === void 0 ? void 0 : info.source, value);

const actions = [
  <EditOutlined key="edit" />,
  <SettingOutlined key="setting" />,
  <EllipsisOutlined key="ellipsis" />,
];

const useStyle = createStyles(({ prefixCls, css }) => ({
  linearGradientButton: css`
    &.${prefixCls}-btn-primary:not([disabled]):not(
        .${prefixCls}-btn-dangerous
      ) {
      > span {
        position: relative;
      }

      &::before {
        content: "";
        background: linear-gradient(135deg, #6253e1, #04befe);
        position: absolute;
        inset: -1px;
        opacity: 1;
        transition: all 0.3s;
        border-radius: inherit;
      }

      &:hover::before {
        opacity: 0;
      }
    }
  `,
}));

// <Avatar src="https://api.dicebear.com/7.x/miniavs/svg?seed=1" />

function KnowBasepage() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false); // 加载中状态(有动画效果,后续可以优化)
  const { styles } = useStyle();
  const [data, setData] = useState([]);

  // 获取用户名
  useEffect(() => {
    async function getUsername() {
      const name = await fetchUsername();
      setUsername(name);
    }
    getUsername();
  }, []);

  // 获取知识库列表
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          "/api/knowledge/list",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: localStorage.auth,
            },
          }
        );

        const data = await response.json();

        if (data.total === 0) {
          setData([]);
          setLoading(false);
          return;
        }
        setData(data.data);
        setLoading(false);
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    };
    fetchData();
  }, []);
    
    const createKnowledge = async () => {
      try {
        const response = await fetch(
          "/api/knowledge/create",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: localStorage.auth,
            },
            body: JSON.stringify({
              base_name: "水声知识库",
              base_desc: "这是知识库",
            }),
          }
        );

        const data = await response.json();

        if (data.success) {
          setData([...data.data]);
        }
      } catch (error) {
        console.error(error);
      }
    };

  return (
    <div>
      {/* 顶部导航栏 */}
      <header className="bg-gray-200 text-black p-4 text-center ">
        <h1 className="text-4xl font-mono">知识库系统</h1>
      </header>

      {/* 介绍语 + 功能区块 */}
      <div className="flex flex-row justify-between">
        {/* 介绍语 */}
        <div className="bg-white p-8  ">
          <h2 className="text-2xl font-medium">欢迎回来, {username}</h2>
          <p className="text-gray-700 mb-4 font-light text-sm">
            今天要使用哪一个知识库呢？
          </p>
        </div>
        {/* 功能区块 */}
        <div className="bg-white p-8 flex flex-row gap-3  items-center">
          {/* 搜索框 */}
          <Space direction="vertical">
            <Search
              placeholder="请输入知识库"
              onSearch={onSearch}
              enterButton
            />
          </Space>

          {/* 添加新知识库按钮 */}
          <ConfigProvider
            button={{
              className: styles.linearGradientButton,
            }}
          >
            <Space>
              <Button type="primary" size="middle" icon={<PlusOutlined />} onClick={createKnowledge}>
                添加新知识库
              </Button>
            </Space>
          </ConfigProvider>
        </div>
      </div>

      {/* 主内容部分 */}
      <main className="p-6">
        {/* 知识库列表 */}
        <div className="grid gap-6 grid-cols-1">
          <Flex gap="middle" align="start" wrap="wrap" vertical={false}>
            <Card loading={loading} actions={actions} style={{ minWidth: 300 }}>
              <Card.Meta
                avatar={
                  <Avatar src="https://api.dicebear.com/7.x/miniavs/svg?seed=1" />
                }
                title="水声知识库"
                description={
                  <>
                    <p>这是知识库</p>
                  </>
                }
              />
            </Card>
            {data.map((item) => (
              <Card
                key={item.id}
                loading={loading}
                actions={actions}
                style={{ minWidth: 300 }}
              >
                <Card.Meta
                  avatar={
                    <Avatar src="https://api.dicebear.com/7.x/miniavs/svg?seed=1" />
                  }
                  title={item.name}
                  description={
                    <>
                      <p>{item.description}</p>
                    </>
                  }
                />
              </Card>
            ))}
          </Flex>
          <div className="bg-white p-6"></div>
        </div>
      </main>
    </div>
  );
}

export default KnowBasepage;
