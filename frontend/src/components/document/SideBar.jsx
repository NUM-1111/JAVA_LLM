import React from "react";
import { FileTextOutlined } from "@ant-design/icons";
import { Menu } from "antd";
import { Link, useLocation } from "react-router-dom";

// 菜单配置生成函数（移到组件内部以访问props）
const generateItems = (baseId) => [
  {
    key: "/knowledge/dataset",
    icon: <FileTextOutlined className="!text-gray-500 !text-lg" />,
    label: (
      <Link 
        to={{
          pathname: "/knowledge/dataset",
          search: `?baseId=${encodeURIComponent(baseId)}` // 安全编码参数
        }} 
        className="text-base font-semibold"
      >
        数据集
      </Link>
    ),
  },
];

const DocSideBar = ({ baseId }) => {
  const location = useLocation();
  
  // 生成带参数的菜单项
  const items = generateItems(baseId);
  
  // 选择逻辑保持兼容（忽略查询参数）
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