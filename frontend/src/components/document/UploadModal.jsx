import React, { useState } from "react";
import { Modal, Upload } from "antd";
import { InboxOutlined } from "@ant-design/icons";
const { Dragger } = Upload;

function UploadDocModal({ open, baseId, onRefresh, onCancel, messageApi }) {
  const [fileList, setFileList] = useState([]);
  const onChange = (info) => {
    const updatedList = info.fileList;
    setFileList(updatedList);

    // 判断所有文件是否都上传完成
    const allDone =
      updatedList.length > 0 &&
      updatedList.every((file) => file.status === "done");

    if (allDone) {
      messageApi.success("所有文件上传完成!");
      onRefresh();
    }

    const { status } = info.file;
    if (status !== "uploading") {
      console.log(info.file, info.fileList);
    }
    if (status === "done") {
      messageApi.success(`${info.file.name} 上传成功!`);
    } else if (status === "error") {
      messageApi.error(`${info.file.name} 上传失败.`);
    }
  };
  const onDrop = (e) => {
    console.log("Dropped files", e.dataTransfer.files);
  };

  return (
    <>
      <Modal title="文件上传" open={open} onCancel={onCancel} footer={[]}>
        <Dragger
          name="file"
          multiple
          headers={{
            Authorization: localStorage.auth,
          }}
          action={`/api/knowledge/upload/file?baseId=${baseId}`}
          fileList={fileList}
          onChange={onChange}
          onDrop={onDrop}
        >
          <div className="p-4">
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽上传文件</p>
            <p className="ant-upload-hint">支持选择单个或多个文件上传</p>
          </div>
        </Dragger>
      </Modal>
    </>
  );
}

export default UploadDocModal;
