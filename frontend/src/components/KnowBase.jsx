import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchUsername } from "./chat/utils";
import {
  EditOutlined,
  EllipsisOutlined,
  SettingOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  Form,
  Avatar,
  Card,
  Flex,
  Input,
  Button,
  ConfigProvider,
  Space,
  Modal,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { toast } from "react-toastify";

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
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [baseName, setBaseName] = useState("");
  const [baseDesc, setBaseDesc] = useState("");
  const [form] = Form.useForm();

  const showModal = () => {
    setIsModalOpen(true);
  };
  const handleOk = () => {
    createKnowledge();
  };
  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const fetchData = async () => {
    try {
      const response = await fetch("/api/knowledge/list", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: localStorage.auth,
        },
      });

      const data = await response.json();

      if (data.total == 0) {
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

  const createKnowledge = async () => {
    try {
      await form.validateFields(); // 验证表单
      const response = await fetch("/api/knowledge/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: localStorage.auth,
        },
        body: JSON.stringify({
          base_name: baseName,
          base_desc: baseDesc,
        }),
      });

      const data = await response.json();
      if (data.msg === "知识库创建成功") {
        console.log("创建成功");
        toast.success("创建成功");
        // 关闭弹窗
        setIsModalOpen(false);
        // 刷新页面
        fetchData();

        // 重置表单
        setBaseName("");
        setBaseDesc("");
        form.resetFields();
      } else {
        console.log("创建失败");
        toast.error("创建失败");
      }
    } catch (error) {
      console.error(error);
    }
  };

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
    fetchData();
  }, [fetchData]);

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
              <Button
                type="primary"
                size="middle"
                icon={<PlusOutlined />}
                onClick={showModal}
              >
                添加新知识库
              </Button>
              <Modal
                title="创建新知识库"
                okText="创建"
                cancelText="取消"
                open={isModalOpen}
                onOk={handleOk} // 使用创建函数而不是直接关闭
                onCancel={handleCancel}
              >
                {/* 使用 Form 包裹输入框 */}
                <Form form={form} layout="vertical" name="knowledge_form">
                  {/* 数据库名称输入框 */}
                  <Form.Item
                    label="数据库名称"
                    name="baseName"
                    rules={[
                      { required: true, message: "数据库名称不能为空！" },
                    ]} // 验证是否为空
                  >
                    <Input
                      placeholder="请输入知识库名称"
                      value={baseName}
                      onChange={(e) => setBaseName(e.target.value)}
                      className="mt-2 mb-2"
                    />
                  </Form.Item>

                  {/* 数据库描述输入框 */}
                  <Form.Item
                    label="数据库描述"
                    name="baseDesc"
                    rules={[
                      { required: true, message: "数据库描述不能为空！" },
                    ]} // 验证是否为空
                  >
                    <Input
                      placeholder="请输入知识库描述"
                      value={baseDesc}
                      onChange={(e) => setBaseDesc(e.target.value)}
                      className="mt-2 mb-2"
                    />
                  </Form.Item>
                </Form>
              </Modal>
            </Space>
          </ConfigProvider>
        </div>
      </div>

      {/* 主内容部分 */}
      <main className="p-6">
        {/* 知识库列表 */}
        <div className="grid gap-6 grid-cols-1">
          <Flex gap="middle" align="start" wrap="wrap" vertical={false}>
            {data.map((item) => (
              <Card
                key={item.base_id}
                loading={loading}
                actions={actions}
                style={{ minWidth: 300 }}
                onClick={() =>
                  navigate(`/knowledge/dataset?baseId=${item.base_id}`)
                }
              >
                <Card.Meta
                  avatar={
                    <Avatar src="https://api.dicebear.com/7.x/miniavs/svg?seed=1" />
                  }
                  title={item.base_name}
                  description={
                    <>
                      <p>{item.base_desc}</p>
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
