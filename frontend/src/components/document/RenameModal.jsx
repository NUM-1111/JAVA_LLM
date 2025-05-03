import React from "react";
import { useNavigate } from "react-router-dom";
import { Modal, Form, Button, Input } from "antd";
import axios from "axios";

function RenameDocModal({
  open,
  docId,
  doc_name,
  onRefresh,
  onCancel,
  messageApi,
}) {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const resetName = () => {
    setTimeout(() => {
      form.setFieldValue("doc_name", doc_name);
    }, 100);
  };

  const onRename = async () => {
    await form.validateFields();

    const postdata = {
      docId: docId,
      doc_name: form.getFieldValue("doc_name"),
    };
    try {
      const res = await axios.post(`/api/knowledge/document/rename`, postdata, {
        headers: {
          Authorization: localStorage.auth,
        },
      });
      if (res.status === 200) {
        messageApi.success(res.data.msg);
        onRefresh();
        onCancel();
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        localStorage.removeItem("auth");
        messageApi.error("请求失败,请重新登录!");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
        return;
      }
      const msg =
        err.response?.data?.error ||
        err.response?.data?.msg ||
        "请求失败,请稍后再试 !";
      messageApi.error(msg);
    }
  };
  return (
    <>
      <Modal
        title="重命名文件"
        open={open}
        onCancel={() => {
          onCancel();
          resetName();
        }}
        footer={null} // 去掉默认的 footer
      >
        <Form
          form={form}
          initialValues={{ doc_name }}
          onFinish={onRename} // 提交时调用 handleOk
        >
          <Form.Item
            name="doc_name"
            label="新名称"
            rules={[{ required: true, message: "请输入新名称" }]} // 设置为必填
          >
            <Input placeholder="新名称" value={doc_name} />
          </Form.Item>

          <Form.Item style={{ textAlign: "right" }}>
            {/* 使用 Form 的按钮来进行提交 */}
            <Button type="primary" htmlType="submit">
              确认
            </Button>
            <Button
              style={{ marginLeft: 8 }}
              onClick={() => {
                onCancel();
                resetName();
              }}
            >
              取消
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export default RenameDocModal;
