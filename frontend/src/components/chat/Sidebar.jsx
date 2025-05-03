import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import {
  SiderBarIcon,
  AddIcon,
  NewChatIcon,
  OneConversationIcon,
  TrashIcon,
  RenameIcon,
} from "../svg-icons";

export default function SideBar({ isOpen, setIsOpen, finishText }) {
  const [conversations, setConversations] = useState([]); // 存储对话列表
  const navigate = useNavigate(); // 获取导航函数
  const [hoveredIndex, setHoveredIndex] = useState(null); // 鼠标悬停
  const [editingId, setEditingId] = useState(null); // 正在编辑的对话id
  const [newTitle, setNewTitle] = useState(""); // 新对话标题

  //从后端API获取会话内容
  useEffect(() => {
    async function loadConversations() {
      let data = await fetchConversations();
      setConversations(data); // 更新状态
    }

    loadConversations();
  }, [finishText, setIsOpen]); // 组件挂载时请求数据

  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const optionsRef = useRef(null);

  // 监听点击外部区域，隐藏菜单
  useEffect(() => {
    function handleClickOutside(event) {
      if (optionsRef.current && !optionsRef.current.contains(event.target)) {
        setSelectedConversationId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  //前端传conversion_id到后端，后端根据conversion_id删除会话
  const deleteConversation = async ({ conversation_id }) => {
    try {
      const response = await fetch("/api/delete/conversation", {
        method: "POST",
        headers: {
          Authorization: localStorage.auth,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ conversation_id }),
      });

      console.log(conversation_id);
      console.log(response);
      if (!response.ok) {
        const data = await response.text();
        console.log(data);
        throw new Error(`HTTP 错误！状态码: ${response.status}`);
      }

      // 更新会话列表
      const data = await fetchConversations();
      setConversations(data);
    } catch (error) {
      console.error("删除会话失败:", error);
    }
  };

  // 重命名对话
  const renameConversation = async ({ conversation_id, title }) => {
    try {
      const response = await fetch("/api/rename/conversation", {
        method: "PUT",
        headers: {
          Authorization: localStorage.auth,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ conversation_id, title }),
      });

      if (!response.ok) {
        const data = await response.text();
        console.log(data);
        throw new Error(`HTTP 错误！状态码: ${response.status}`);
      }

      // 更新会话列表
      const data = await fetchConversations();
      setConversations(data);
    } catch (error) {
      console.error("重命名会话失败:", error);
    }
  };

  return (
    <div
      className={`${
        isOpen ? "translate-x-0 lg:relative lg:z-auto" : "-translate-x-full"
      } 
          flex absolute xl:w-1/5 lg:w-1/4 md:w-1/3 sm:w-2/5 w-7/12 z-50 inset-y-0 left-0  flex-col h-[100dvh] sm:h-screen justify-between border-e 
          border-gray-100 bg-[#F5F5F5] shadow-sm transition-all duration-300 overflow-hidden overflow-y-auto`}
    >
      <div className="px-4 py-3 transform">
        {/* 侧边栏顶部 */}
        <header className="top-0 flex flex-row transform">
          {/* 隐藏侧边栏按钮 */}
          <div className="relative">
            <button
              onClick={() => setIsOpen(false)}
              className={`flex justify-center items-center size-8 sm:size-10 rounded-lg hover:shadow-md hover:bg-blue-300 group`}
            >
              <SiderBarIcon className={"size-5 sm:size-6"} />
              <span className="absolute top-full left-1/2 transform -translate-x-1/2 hidden group-hover:block transition-all duration-300 bg-gray-700 text-white text-sm rounded py-1 px-2 whitespace-nowrap mt-1 ml-2">
                显示侧边栏
              </span>
            </button>
            {/* 说明框：底部显示 */}
          </div>

          {/* 开启新对话按钮 (icon) */}
          <div className="relative">
            <button
              className={` flex justify-center items-center size-8 sm:size-10 rounded-lg hover:shadow-md hover:bg-blue-300 group`}
              onClick={() => {
                navigate("/");
              }} // 跳转到新建对话页面
            >
              <NewChatIcon className={"size-5 sm:size-6"} />
              {/* 说明框：右侧显示 */}
              <span className="absolute top-full left-1/2 transform -translate-x-1/2 hidden group-hover:block transition-all duration-300 bg-gray-700 text-white text-sm rounded py-1 px-2 whitespace-nowrap mt-1">
                创建新对话
              </span>
            </button>
          </div>
        </header>

        {/* 新对话模块 */}
        <button
          className="flex flex-row min-w-full mt-4 sm:mt-8 font-bold text-sm rounded-lg border border-blue-200 text-blue-600 bg-blue-500/15 hover:bg-blue-500/20"
          onClick={() => {
            navigate("/");
          }} // 跳转到新建对话页面
        >
          {/* AddIcon 图标 */}
          <div className="flex px-2 py-2.5">
            <AddIcon />
          </div>
          {/* 新建对话按钮文字 */}
          <div className="flex flex-col justify-center ml-2">开启新对话</div>
        </button>

        {/* 侧边栏对话列表 */}
        <div className="mt-6">
          {conversations.length === 0 ? (
            <p className="text-gray-500 text-center">暂无对话</p>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.conversation_id}
                className="flex flex-row items-center justify-between hover:bg-gray-200 rounded-lg"
                onMouseEnter={() =>
                  setHoveredIndex(conversation.conversation_id)
                }
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* 对话按钮 */}
                {editingId === conversation.conversation_id ? (
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onBlur={() => {
                      if (newTitle.trim() !== "") {
                        renameConversation({
                          conversation_id: conversation.conversation_id,
                          title: newTitle,
                        });
                      }
                      setEditingId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.target.blur();
                      }
                    }}
                    autoFocus
                    className=" border-[0.5px] border-opacity-50 border-gray-50 rounded-lg px-2 py-1 min-w-52"
                  />
                ) : (
                  <button
                    className="block w-full text-left px-4 py-2 my-1 text-gray-700"
                    onClick={() => {
                      console.log(`跳转到对话 ${conversation.conversation_id}`);
                      navigate(`/c/${conversation.conversation_id}`);
                    }}
                  >
                    {conversation.title || "未命名对话"}
                  </button>
                )}
                {/* 右侧菜单按钮，只有 hoveredIndex === index 时显示 */}
                {hoveredIndex === conversation.conversation_id && (
                  <button
                    className="flex flex-row items-center"
                    onClick={() =>
                      setSelectedConversationId(
                        selectedConversationId === conversation.conversation_id
                          ? null
                          : conversation.conversation_id
                      )
                    }
                  >
                    <OneConversationIcon />
                  </button>
                )}
                <div className="relative flex flex-row items-center justify-between">
                  {/* 选项面板（仅当前选中的对话项显示） */}
                  {selectedConversationId === conversation.conversation_id && (
                    <div
                      ref={optionsRef}
                      className="absolute right-0 top-7 w-32 bg-white shadow-lg rounded-lg border border-gray-200 "
                    >
                      <button
                        className="flex flex-row items-center w-full px-4 py-2 text-left hover:bg-gray-100"
                        onClick={() => {
                          console.log(
                            `重命名对话 ${conversation.conversation_id}`
                          );
                          setSelectedConversationId(null);
                          setEditingId(conversation.conversation_id);
                          setNewTitle(conversation.title || "");
                        }}
                      >
                        <RenameIcon />
                        重命名
                      </button>
                      <button
                        className="flex flex-row items-center w-full px-4 py-2 text-left text-red-600 hover:bg-red-100"
                        onClick={() => {
                          console.log(
                            `删除对话 ${conversation.conversation_id}`
                          );
                          setSelectedConversationId(null);
                          deleteConversation({
                            conversation_id: conversation.conversation_id,
                          });
                        }}
                      >
                        <TrashIcon />
                        删除
                      </button>
                    </div>
                  )}
                </div>
              </div>
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
    const response = await fetch("/api/query/conversation", {
      method: "GET",
      headers: {
        Authorization: localStorage.auth,
        "Content-Type": "application/json",
      },
    });

    // 判断是否请求成功（HTTP 状态码 200-299）
    if (!response.ok) {
      if (response.status === 401) {
        return [];
      }
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
