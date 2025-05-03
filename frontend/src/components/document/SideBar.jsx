import React from "react";
import { FileTextOutlined } from "@ant-design/icons";
import { Menu } from "antd";
import { Link, useLocation } from "react-router-dom";

const items = [
  {
    key: "/knowledge/dataset",
    icon: <FileTextOutlined className="!text-gray-500 !text-lg" />,
    label: (
      <Link to="/knowledge/dataset" className="text-base font-semibold">
        数据集
      </Link>
    ),
  },
];

const DocSideBar = () => {
  const location = useLocation();
  const selectedKey = items.find((item) =>
    location.pathname.startsWith(item.key)
  )?.key;

  return (
    <Menu
      className="!border-none"
      style={{ width: "auto" }}
      selectedKeys={[selectedKey]}
      items={items}
    />
  );
};

export default DocSideBar;
