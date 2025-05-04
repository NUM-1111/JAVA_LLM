import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchUsername } from "./chat/utils";
import {
  EditOutlined,
  FullscreenOutlined,
  DeleteOutlined,
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

/**
 * antd组件逻辑部分
 */
const { Search } = Input;
const onSearch = (value, _e, info) =>
  console.log(info === null || info === void 0 ? void 0 : info.source, value);

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

function KnowBasepage() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false); // 加载中状态(有动画效果,后续可以优化)
  const { styles } = useStyle();
  const [data, setData] = useState([]);
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false); // 控制创建弹窗
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // 控制编辑弹窗
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false); // 控制删除弹窗
  const [currentEditData, setCurrentEditData] = useState(null); // 存储当前正在编辑的知识库数据
  const [currentDeleteData, setCurrentDeleteData] = useState(null); // 存储当前正在删除的知识库数据
  const [baseName, setBaseName] = useState("");
  const [baseDesc, setBaseDesc] = useState("");
  const [form] = Form.useForm();

  /**
   * 弹窗逻辑部分
   * 有创建弹窗,编辑弹窗,删除弹窗
   * 点击创建按钮,打开创建弹窗,输入数据库名称和描述,点击创建按钮,发送请求创建数据库,关闭创建弹窗,刷新页面,重置表单
   * 点击编辑按钮,打开编辑弹窗,输入数据库名称和描述,点击编辑按钮,发送请求编辑数据库,关闭编辑弹窗,刷新页面,重置表单
   */
  // 打开创建弹窗
  const showModal = () => {
    setIsModalOpen(true);
  };
  const handleOk = () => {
    createKnowledge();
  };
  const handleCancel = () => {
    setIsModalOpen(false);
  };

  // 打开编辑弹窗并填充数据
  const handleEditClick = (item) => {
    setCurrentEditData(item);
    form.setFieldsValue({
      baseName: item.base_name,
      baseDesc: item.base_desc,
    });
    setIsEditModalOpen(true);
  };

  // 关闭编辑弹窗
  const handleEditCancel = () => {
    setIsEditModalOpen(false);
    setCurrentEditData(null);
    form.resetFields();
  };

  // 提交编辑表单
  const handleEditOk = () => {
    editKnowledge(currentEditData.base_id);
  };

  // 打开删除弹窗并填充数据
  const handleDeleteClick = (item) => {
    setCurrentDeleteData(item);
    setIsDeleteModalOpen(true);
  };

  // 关闭删除弹窗
  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setCurrentDeleteData(null);
  };

  // 提交删除表单
  const handleDeleteOk = () => {
    deleteKnowledge(currentDeleteData.base_id);
  };

  /*
  获取知识库列表(查询接口)
  */
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

  /*
   创建知识库 接口
   */
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

  /*
   编辑知识库 接口
   */
  const editKnowledge = async (baseId) => {
    try {
      console.log("BaseDesc: " + baseDesc);
      await form.validateFields(); // 验证表单
      const response = await fetch(`/api/knowledge/edit/${baseId}`, {
        method: "PUT",
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
      if (data.msg === "知识库更新成功") {
        console.log("编辑成功");
        toast.success("编辑成功");
        // 关闭弹窗
        setIsEditModalOpen(false);
        // 刷新页面
        fetchData();

        // 重置表单
        setBaseName("");
        setBaseDesc("");
        form.resetFields();
      } else {
        console.log(data.msg);
        console.log("编辑失败");
        toast.error("编辑失败");
      }
    } catch (error) {
      console.error(error);
    }
  };

  /*
   删除知识库 接口
   */
  const deleteKnowledge = async (baseId) => {
    try {
      const response = await fetch(`/api/knowledge/delete/${baseId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: localStorage.auth,
        },
      });

      const data = await response.json();
      if (data.msg === "删除知识库成功") {
        console.log("删除成功");
        toast.success("删除成功");
        // 刷新页面
        fetchData();
        // 关闭弹窗
        setIsDeleteModalOpen(false);
        // 重置表单
        setCurrentDeleteData(null);
      } else {
        console.log("删除失败");
        toast.error("删除失败");
      }
    } catch (error) {
      console.error(error);
    }
  };

  /**
   *通过知识库名称搜索知识库
   */
  const searchKnowledge = async (value) => {
    try {
      const response = await fetch("/api/knowledge/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: localStorage.auth,
        },
        body: JSON.stringify({
          base_name: value,
        }),
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

  /*
   获取当前登录用户的用户名
   */
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
  }, []);

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
              onChange={(e) => searchKnowledge(e.target.value)}
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
                  <Form.Item label="数据库描述" name="baseDesc">
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
            {data.length === 0 && !loading ? (
              <p className="text-center text-lg font-medium mb-4 text-gray-600">
                ╮(╯▽╰)╭暂无知识库
              </p>
            ) : (
              data.map((item) => (
                <Card
                  key={item.base_id}
                  loading={loading}
                  actions={[
                    <FullscreenOutlined
                      key="fullscreen"
                      onClick={() =>
                        navigate(`/knowledge/dataset?baseId=${item.base_id}`)
                      }
                    />,
                    <EditOutlined
                      key="edit"
                      onClick={() => handleEditClick(item)}
                    />,
                    <DeleteOutlined
                      key="delete"
                      onClick={() => handleDeleteClick(item)}
                    />,
                  ]}
                  style={{ minWidth: 300 }}
                >
                  <Card.Meta
                    avatar={
                      <Avatar
                        src={`https://api.dicebear.com/7.x/miniavs/svg?seed=${item.base_id}`}
                      />
                    }
                    title={item.base_name}
                    description={
                      <>
                        <p>{item.base_desc}</p>
                      </>
                    }
                  />
                </Card>
              ))
            )}
          </Flex>
          <div className="bg-white p-6"></div>
        </div>

        {/* 编辑知识库 Modal */}
        <Modal
          title="编辑知识库"
          open={isEditModalOpen}
          okText="提交"
          cancelText="取消"
          onOk={handleEditOk} // 提交编辑
          onCancel={handleEditCancel} // 取消编辑
        >
          <Form form={form} layout="vertical">
            <Form.Item
              label="知识库名称"
              name="baseName"
              rules={[{ required: true, message: "知识库名称不能为空！" }]}
            >
              <Input
                placeholder="请输入知识库名称"
                onChange={(e) => setBaseName(e.target.value)}
              />
            </Form.Item>

            <Form.Item label="知识库描述" name="baseDesc">
              <Input
                placeholder="请输入知识库描述"
                onChange={(e) => setBaseDesc(e.target.value)}
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* 删除知识库确认弹窗 Modal */}
        <Modal
          title="警告"
          open={isDeleteModalOpen}
          okText="确认"
          cancelText="取消"
          onOk={handleDeleteOk}
          onCancel={handleDeleteCancel}
        >
          <p className="text-center text-lg font-medium mb-4 text-red-600">
            确定删除该知识库吗？
          </p>
        </Modal>
      </main>
    </div>
  );
}

export default KnowBasepage;
