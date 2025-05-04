import React, { useState } from "react";
import { Modal, Upload, Button } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import axios from "axios";

const { Dragger } = Upload;

function UploadDocModal({ open, baseId, onRefresh, onCancel, messageApi }) {
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);

  // 手动上传
  const handleUpload = async () => {
    if (fileList.length === 0) {
      messageApi.warning("请选择至少一个文件");
      return;
    }

    setUploading(true);

    const formData = new FormData();
    fileList.forEach((file) => {
      formData.append("file", file.originFileObj); // 可根据后端要求调整字段名
    });

    try {
      for (const file of fileList) {
        const formData = new FormData();
        formData.append("file", file.originFileObj);
        await axios.post(
          `/api/knowledge/upload/file?baseId=${baseId}`,
          formData,
          {
            headers: {
              Authorization: localStorage.auth,
            },
          }
        );
      }

      messageApi.success("上传成功！");
      setFileList([]);
      onRefresh();
      onCancel();
    } catch (error) {
      console.error(error);
      messageApi.error("上传失败！");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      title="文件上传"
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={uploading}
          onClick={handleUpload}
        >
          上传
        </Button>,
      ]}
    >
      <Dragger
        multiple
        beforeUpload={() => false}
        fileList={fileList}
        onChange={(info) => setFileList(info.fileList)}
      >
        <div className="p-4">
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽上传文件</p>
          <p className="ant-upload-hint">
            支持选择单个或多个文件，点击“上传”统一提交
          </p>
        </div>
      </Dragger>
    </Modal>
  );
}

export default UploadDocModal;
