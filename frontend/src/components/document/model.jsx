import { Tag } from "antd";
import { MatchStatus } from "./utils";
import { Link } from "react-router-dom";

export const docColumns = [
  {
    title: "文件名",
    dataIndex: "doc_name",
    key: "doc_name",
    width: 200,
    fixed: "left",
    align: "center",
    render: (_, record) => {
      return (
        <Link to={`./detail?docId=${record.docId}`} className="text-blue-500">{record.doc_name}</Link>
      );
    },
  },
  {
    title: "文档类型",
    dataIndex: "file_type",
    key: "file_type",
    width: 120,
    fixed: "left",
    align: "center",
  },
  {
    title: "上传日期",
    dataIndex: "created_at",
    key: "created_at",
    width: 150,
    align: "center",
  },
  {
    title: "解析状态",
    dataIndex: "status",
    key: "status",
    width: 120,
    align: "center",
    render: (_, record) => {
      let color;
      switch (record.status) {
        case 1:
          color = "green";
          break;
        case 3:
          color = "volcano";
          break;
        default:
          return;
      }
      return (
        <Tag className="scale-105" color={color} key={record.status}>
          {MatchStatus(record.status)}
        </Tag>
      );
    },
  },
];
