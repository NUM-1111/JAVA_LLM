import React from "react";
import { Menu } from "lucide-react";

const Sidebar = ({ sidebarOpen, toggleSidebar }) => {
  return (
    <div
      className={`fixed inset-y-0 left-0 transform ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      } w-64 bg-blue-600 text-white transition duration-200 ease-in-out z-50`}
    >
      <div className="p-6">
        <div className="flex justify-end">
          <button
            onClick={toggleSidebar}
            className="text-white focus:outline-none"
            aria-label="Close menu"
          >
            <Menu size={24} />
          </button>
        </div>
        <nav className="mt-10">
          <a
            href="#page1"
            className="block py-2.5 px-4 rounded transition duration-200 hover:bg-blue-700 mb-5"
            onClick={toggleSidebar}
          >
            平台介绍
          </a>
          <a
            href="#page2"
            className="block py-2.5 px-4 rounded transition duration-200 hover:bg-blue-700 mb-5"
            onClick={toggleSidebar}
          >
            团队介绍
          </a>
          <a
            href="#page3"
            className="block py-2.5 px-4 rounded transition duration-200 hover:bg-blue-700 mb-5"
            onClick={toggleSidebar}
          >
            技术栈
          </a>
          <a
            href="#page4"
            className="block py-2.5 px-4 rounded transition duration-200 hover:bg-blue-700 mb-5"
            onClick={toggleSidebar}
          >
            加入我们
          </a>
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;
