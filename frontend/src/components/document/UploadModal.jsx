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
      let successCount = 0;
      let failCount = 0;
      const errors = [];

      for (const file of fileList) {
        try {
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
          successCount++;
        } catch (error) {
          failCount++;
          let errorMsg = "未知错误";
          
          // Handle different error types
          if (error.response) {
            // Server responded with error status
            errorMsg = error.response.data?.msg || 
                      error.response.data?.error || 
                      error.response.data?.message ||
                      `服务器错误 (${error.response.status})`;
            
            // Special handling for file size errors
            if (error.response.status === 413 || 
                errorMsg.includes("大小") || 
                errorMsg.includes("size") ||
                errorMsg.includes("exceed")) {
              errorMsg = `文件大小超过限制（最大100MB）。文件名: ${file.name}`;
            }
          } else if (error.request) {
            // Request was made but no response received
            errorMsg = "网络错误，请检查网络连接";
          } else {
            // Error in request setup
            errorMsg = error.message || "请求失败";
          }
          
          errors.push(`${file.name}: ${errorMsg}`);
          console.error(`上传文件失败: ${file.name}`, error);
        }
      }

      // 显示结果
      if (failCount === 0) {
        messageApi.success(`所有文件上传成功！共 ${successCount} 个文件`);
      setFileList([]);
      onRefresh();
      onCancel();
      } else if (successCount > 0) {
        messageApi.warning(
          `部分文件上传失败：成功 ${successCount} 个，失败 ${failCount} 个。\n${errors.join("\n")}`,
          5
        );
        onRefresh();
      } else {
        messageApi.error(
          `所有文件上传失败：\n${errors.join("\n")}`,
          5
        );
      }
    } catch (error) {
      console.error("上传过程出错:", error);
      let errorMsg = "上传失败，请稍后重试";
      
      if (error.response) {
        errorMsg = error.response.data?.msg || 
                  error.response.data?.error || 
                  error.response.data?.message ||
                  `服务器错误 (${error.response.status})`;
      } else if (error.request) {
        errorMsg = "网络错误，请检查网络连接";
      } else {
        errorMsg = error.message || "请求失败";
      }
      
      messageApi.error(errorMsg);
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
