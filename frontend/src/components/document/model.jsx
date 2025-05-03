import { Tag, Switch } from "antd";
import { MatchStatus } from "./utils";

const onEnableChange = (checked) => {
  console.log(`switch to ${checked}`);
};

export const docColumns = [
  {
    title: "文件名",
    dataIndex: "filename",
    key: "filename",
    width: 200,
    fixed: "left",
    align: "center",
  },
  {
    title: "上传日期",
    dataIndex: "created_at",
    key: "created_at",
    width: 120,
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
        case 2:
          color = "green";
          break;
        case 3:
          color = "volcano";
          break;
        default:
          return;
      }
      return (
        <Tag color={color} key={record.status}>
          {MatchStatus(record.status)}
        </Tag>
      );
    },
  },
  {
    title: "启用",
    dataIndex: "is_enabled",
    key: "is_enabled",
    width: 120,
    align: "center",
    render: (_, record) => {
      return (
        <Switch defaultValue={record.is_enabled} onChange={onEnableChange} />
      );
    },
  },
];
