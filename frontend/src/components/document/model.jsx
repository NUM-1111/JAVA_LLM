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
      const baseId = record.baseId ?? record.base_id ?? "";
      return (
        <Link
          to={`./detail?baseId=${baseId}&docId=${record.docId}`}
          className="text-blue-500"
        >
          {record.doc_name}
        </Link>
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
        case 0:
        case "None":
          color = "geekblue";
          break;
        case 1:
        case "Success":
          color = "green";
          break;
        case 2:
        case "Failure":
          color = "volcano";
          break;
        default:
          color = "default";
      }
      return (
        <Tag className="scale-105" color={color} key={record.status}>
          {MatchStatus(record.status)}
        </Tag>
      );
    },
  },
];
