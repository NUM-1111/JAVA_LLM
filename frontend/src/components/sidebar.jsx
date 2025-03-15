import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { globalData } from "../constants";
import {
    SiderBarIcon,
    AddIcon,
    NewChatIcon,
} from "./svg-icons";

export default function SideBar({ isOpen, setIsOpen }) {
    const navigate = useNavigate();
    const [chats, setChats] = useState([]);

    // 组件加载时，从 localStorage 读取已有对话
    useEffect(() => {
        const savedChats = JSON.parse(localStorage.getItem("chats")) || [];
        setChats(savedChats);
    }, []);

    // 创建新对话
    const createChat = async () => {
        const res = await fetch(globalData.domain + "/chat/new", { method: "POST" });
        const data = await res.json();
        const newChatID = data.chat_id;

        // 更新 state 并存入 localStorage
        const updatedChats = [...chats, newChatID];
        setChats(updatedChats);
        localStorage.setItem("chats", JSON.stringify(updatedChats));

        navigate(`/chat/${newChatID}`);
    };

    return (
        <div
            className={`${isOpen
                ? "translate-x-0 md:relative md:z-auto"
                : "-translate-x-full hidden"
                } 
         md:flex  md:w-1/5 absolute w-3/5 z-50 inset-y-0 left-0 flex flex-col max-h-screen justify-between border-e 
          border-gray-100 bg-white shadow-sm transition-all duration-300 overflow-hidden overflow-y-auto`}
        >
            <div className="px-4 py-3 transform">
                {/* 侧边栏顶部 */}
                <header className="top-0 flex flex-row transform">
                    {/* 隐藏侧边栏按钮 */}
                    <div className="relative group">
                        <button
                            onClick={() => setIsOpen(false)}
                            className={`${isOpen ? "block" : "hidden"} flex justify-center items-center size-10 rounded-lg hover:shadow-md hover:bg-blue-300`}
                        >
                            <SiderBarIcon />
                        </button>
                        {/* 说明框：底部显示 */}
                        <div className="absolute top-full left-1/2  transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gray-700 text-white text-sm rounded py-1 px-2 whitespace-nowrap mt-2">
                            隐藏侧边栏
                        </div>
                    </div>

                    {/* 开启新对话按钮 (icon) */}
                    <div className="relative group">
                        <button
                            onClick={createChat}
                            className={`${isOpen ? "block" : "hidden"} flex justify-center items-center size-10 rounded-lg hover:shadow-md hover:bg-blue-300`}
                        >
                            <NewChatIcon />
                        </button>
                        {/* 说明框：右侧显示 */}
                        <div className="absolute left-full top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gray-700 text-white text-sm rounded py-1 px-2 whitespace-nowrap ml-2">
                            开启新对话
                        </div>
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
                        <button onClick={createChat} className="py-2">
                            开启新对话
                        </button>
                    </div>
                </div>

                {/* 侧边栏对话列表 */}
                <div className="flex-1 overflow-y-auto">
                    {chats.map((chatId) => (
                        <a
                            key={chatId}
                            href={`/chat/${chatId}`}
                            className="block p-2 bg-gray-100 hover:bg-gray-200 rounded my-1"
                        >
                            会话 {chatId.slice(0, 8)}...
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
}
