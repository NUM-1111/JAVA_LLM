import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SiderBarIcon, AddIcon, NewChatIcon } from "./svg-icons";

export default function SideBar({ isOpen, setIsOpen }) {
  const [conversations, setConversations] = useState([]); // 存储对话列表
  const navigate = useNavigate(); // 获取导航函数

  //从后端API获取会话内容
  useEffect(() => {
    async function loadConversations() {
      const data = await fetchConversations();
      setConversations(data); // 更新状态
    }

    loadConversations();
  }, []); // 组件挂载时请求数据

  return (
    <div
      className={`${
        isOpen ? "translate-x-0 lg:relative lg:z-auto" : "-translate-x-full"
      } 
          flex absolute xl:w-1/5 lg:w-1/4 md:w-1/3 sm:w-2/5 w-7/12 z-50 inset-y-0 left-0  flex-col max-h-screen justify-between border-e 
          border-gray-100 bg-white shadow-sm transition-all duration-300 overflow-hidden overflow-y-auto`}
    >
      <div className="px-4 py-3 transform">
        {/* 侧边栏顶部 */}
        <header className="top-0 flex flex-row transform">
          {/* 隐藏侧边栏按钮 */}
          <div className="relative">
            <button
              onClick={() => setIsOpen(false)}
              className={`flex justify-center items-center size-10 rounded-lg hover:shadow-md hover:bg-blue-300 group`}
            >
              <SiderBarIcon />
              <span className="absolute top-full left-1/2 transform -translate-x-1/2 hidden group-hover:block transition-all duration-300 bg-gray-700 text-white text-sm rounded py-1 px-2 whitespace-nowrap mt-1 ml-2">
                显示侧边栏
              </span>
            </button>
            {/* 说明框：底部显示 */}
          </div>

          {/* 开启新对话按钮 (icon) */}
          <div className="relative">
            <button
              className={` flex justify-center items-center size-10 rounded-lg hover:shadow-md hover:bg-blue-300 group`}
              onClick={() => navigate("/")} // 跳转到新建对话页面
            >
              <NewChatIcon />
              {/* 说明框：右侧显示 */}
              <span className="absolute top-full left-1/2 transform -translate-x-1/2 hidden group-hover:block transition-all duration-300 bg-gray-700 text-white text-sm rounded py-1 px-2 whitespace-nowrap mt-1">
                创建新对话
              </span>
            </button>
          </div>
        </header>

        {/* 新对话模块 */}
        <div className="flex flex-row mt-8 font-bold text-sm rounded-lg border border-blue-200 text-blue-600 bg-blue-500/15 hover:bg-blue-500/20">
          {/* AddIcon 图标 */}
          <div className="flex px-2 py-2.5">
            <AddIcon />
          </div>

          {/* 新对话按钮 */}
          <div>
            <button
              className="py-2"
              onClick={() => navigate("/")} // 跳转到新建对话页面
            >
              开启新对话
            </button>
          </div>
        </div>

        {/* 侧边栏对话列表 */}
        <div className="mt-6">
          {conversations.length === 0 ? (
            <p className="text-gray-500 text-center">暂无对话</p>
          ) : (
            conversations.map((conversation, index) => (
              <button
                key={index} // 这里使用 index 作为 key
                className="block w-full text-left px-4 py-2 my-1 text-gray-700 hover:bg-gray-200 rounded-lg"
                onClick={() => {
                  console.log(`跳转到对话 ${conversation.conversation_id}`); // 跳转到指定对话页面
                  navigate(`/c/${conversation.conversation_id}`);
                }}
              >
                {conversation.title || "未命名对话"}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

async function fetchConversations() {
  try {
    // 发送请求，获取响应对象
    const response = await fetch(
      "http://localhost:8080/api/query/conversation",
      {
        method: "GET",
        headers: {
          Authorization: localStorage.auth,
          "Content-Type": "application/json",
        },
      }
    );

    // 判断是否请求成功（HTTP 状态码 200-299）
    if (!response.ok) {
      const data = await response.text();
      console.log(data);
      throw new Error(`HTTP 错误！状态码: ${response.status}`);
    }

    // 解析 JSON 数据
    const data = await response.json();

    return data.sessions; // 返回会话列表
  } catch (error) {
    console.error("获取会话失败:", error);
    return []; // 发生错误时返回空数组，防止程序崩溃
  }
}
