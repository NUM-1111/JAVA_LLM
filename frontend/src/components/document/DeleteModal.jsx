import React from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "antd";
import axios from "axios";

function DeleteDocModal({
  open,
  baseId,
  docId,
  onRefresh,
  onCancel,
  messageApi,
}) {
  const navigate = useNavigate();

  const onDelete = async (baseId, docId) => {
    const postdata = {
      baseId: baseId,
      docId: docId,
    };
    try {
      const res = await axios.post(`/api/knowledge/delete/document`, postdata, {
        headers: {
          Authorization: localStorage.auth,
        },
      });
      if (res.status === 200) {
        messageApi.success(res.data.msg);
        onRefresh();
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
        "获取数据失败,请稍后再试 !";
      messageApi.error(msg);
    }
  };
  return (
    <>
      <Modal
        title="删除此文件"
        open={open}
        onCancel={onCancel}
        onOk={() => {
          onDelete(baseId, docId);
          onCancel();
        }}
        okText="确认删除"
        cancelText="取消"
        okType="danger"
      >
        <div className="flex flex-col gap-2">
          <p className="text-gray-600">此操作将删除此文件</p>
          <p className="text-red-500">删除后将无法恢复记录</p>
        </div>
      </Modal>
    </>
  );
}

export default DeleteDocModal;
