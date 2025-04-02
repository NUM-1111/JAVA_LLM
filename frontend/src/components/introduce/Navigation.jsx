import React, { useState } from "react";
import { Menu } from "lucide-react";

const Navigation = ({ toggleSidebar }) => {
  return (
    <div className="fixed left-5 top-5 z-50">
      <button
        onClick={toggleSidebar}
        className="p-2 rounded-full bg-white bg-opacity-80 dark:bg-gray-800 dark:bg-opacity-80 hover:bg-blue-100 dark:hover:bg-gray-700 shadow-lg"
        aria-label="菜单"
      >
        <Menu size={24} />
      </button>
    </div>
  );
};

export default Navigation;
