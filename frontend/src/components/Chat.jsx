import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { globalData } from "../constants";
import {
  SiderBarIcon,
  AddIcon,
  NewChatIcon,
  BreadcrumbIcon,
  DeepThinkIcon,
  ArrowUpIcon,
} from "./svg-icons";

function ChatPage() {
  const navigate = useNavigate(); // 获取导航函数

  const onLoginClick = () => navigate("/login"); // 直接跳转
    const onRegisterClick = () => navigate("/register"); // 直接跳转
    const [chats, setChats] = useState([]);//存储对话

    //创建新对话
    const createChat = async () => {
        const res = await fetch(globalData.domain + "/chat/new", { method: "POST" });
        const data = await res.json();
        const newChatID = data.chat_id;

        setChats([...chats, newChatID]);//更新侧边栏
        navigate(`/chat/${newChatID}`);//跳转到新对话
    };

  const [isOpen, setIsOpen] = useState(true); // 控制侧边栏展开/折叠

  return (
    <div className="flex flex-row  max-h-screen bg-gray-100 gap">
          {/*侧边栏 */}
          <div
              className={`${isOpen
                      ? " translate-x-0 md:relative md:z-auto"
                      : "-translate-x-full hidden"
                  } 
             md:flex  md:w-1/5 absolute w-3/5 z-50 inset-y-0 left-0 flex flex-col max-h-screen justify-between border-e 
              border-gray-100 bg-white shadow-sm transition-all duration-300 overflow-hidden overflow-y-auto`}
          >
              <div className="px-4 py-3 transform">
                  {/*侧边栏顶部*/}
                  <header className="top-0 flex flex-row transform">
                      {/* 关闭按钮 */}
                      <button
                          onClick={() => setIsOpen(false)}
                          className={`${isOpen ? "block" : "hidden "
                              }  flex justify-center items-center size-10  rounded-lg hover:shadow-md hover:bg-blue-300`}
                      >
                          <SiderBarIcon />
                      </button>

                      {/*新对话按钮(icon) */}
                      <button
                          onClick={createChat}
                          className={`${isOpen ? "block" : "hidden "
                              } flex justify-center items-center size-10  rounded-lg hover:shadow-md hover:bg-blue-300 `}
                      >
                          <NewChatIcon />
                      </button>
                  </header>

                  {/*新对话模块*/}
                  <div className="flex flex-row mt-8 font-bold text-sm rounded-lg border border-blue-200 text-blue-600 bg-blue-500/15  hover:bg-blue-500/20 ">
                      {/*AddIcon图标*/}
                      <div className="flex px-2 py-2.5">
                          <AddIcon />
                      </div>

                      {/*新对话按钮 */}
                      <div>
                          <button
                              onClick={createChat}
                              className=" py-2 ">开启新对话</button>
                      </div>
                  </div>
                  {/* 侧边栏对话列表 */}
                  <div className="flex-1 overflow-y-auto">
                      {chats.map((chatId) => (
                          <a
                              key={chatId}
                              href={`/chat/${chatId}`}
                              className="block p-2 bg-gray-700 hover:bg-gray-600 rounded my-1"
                          >
                              会话 {chatId.slice(0, 8)}...
                          </a>
                      ))}
                  </div>
              </div>
          </div>

      {/*对话部分*/}
      <div
        className={`${
          isOpen ? "w-4/5" : "w-full"
        } flex flex-col h-full max-h-screen bg-gray-100`}
      >
        {/* 头部导航栏 - 固定在主内容顶部 */}
        {/*进入具体内容页可加上: border-b border-gray-300 */}
        <header className="sticky top-0 flex flex-row px-5 py-3 justify-between z-10 select-none">
          {/* 左侧按钮 */}
          <div className="flex flex-row text-gray-700">
            <button
              onClick={() => setIsOpen(true)}
              className={`${
                isOpen ? "hidden" : "block"
              } flex justify-center items-center size-10 transition rounded-lg hover:shadow-md hover:bg-blue-300`}
            >
              <SiderBarIcon />
            </button>
            {/*新对话按钮*/}
            <button
              className={`${
                isOpen ? "hidden" : "block"
              } flex justify-center items-center size-10 transition rounded-lg hover:shadow-md hover:bg-blue-300`}
            >
              <NewChatIcon />
            </button>
            <button className="flex flex-row items-center ml-1 px-2 py-1 rounded-lg min-h-10 hover:bg-blue-300 hover:shadow-md transition">
              <span className="text-md font-semibold">DeepSeek-R1</span>
              <BreadcrumbIcon className={"size-6"} />
            </button>
          </div>

          {/* 右侧登录/注册按钮 */}
          <div className="flex flex-row justify-center items-center gap-2">
            <button
              className="px-4 py-[0.40rem] rounded-full bg-blue-500 border-blue-500 border text-white hover:text-blue-600 hover:bg-blue-200 transition"
              onClick={onLoginClick}
            >
              <span className="text-sm">登录</span>
            </button>

            <button
              className="px-4 py-[0.40rem] rounded-full bg-white border-gray-300 border text-black hover:bg-gray-100 transition hidden md:block"
              onClick={onRegisterClick}
            >
              <span className="text-sm">注册</span>
            </button>
          </div>
        </header>

        {/* 可滚动的主内容区域 */}
        <main className="flex-grow h-screen overflow-auto flex flex-col">
          <div className="flex flex-col text-base mx-5 items-center mt-44 gap-5 flex-grow">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-indigo-600 to-indigo-500 leading-[34px] tracking-[0.38px] select-none">
              有什么可以帮忙的?
            </h1>

            <div
              id="InputContainer"
              className="flex flex-col h-auto w-[90%] rounded-3xl border border-gray-500 bg-gray-50 
                 md:static md:w-7/12 
                 absolute bottom-5 px-4 py-1 md:py-2"
            >
              <div className="mx-3 mt-1 flex flex-col bg-inherit mb-2">
                <textarea
                  rows={1}
                  className="w-full rounded-lg p-3 pe-12 pb-6 text-base bg-inherit outline-none resize-none overflow-y-auto"
                  placeholder="问你所想 畅所欲言"
                  onInput={(e) => {
                    e.target.style.height = "auto"; // 先重置高度，防止高度收缩不生效
                    const lineHeight = parseInt(
                      window.getComputedStyle(e.target).lineHeight
                    );
                    const isSmallScreen = window.innerWidth < 768; // 判断是否为 md 以下
                    let maxHeight = isSmallScreen
                      ? lineHeight * 5.5
                      : lineHeight * 7;
                    e.target.style.height = `${Math.min(
                      e.target.scrollHeight,
                      maxHeight
                    )}px`; // 根据内容调整高度
                  }}
                ></textarea>
                <div className="w-full flex justify-between md:mt-2">
                  <button className="flex flex-row justify-center items-center gap-1 px-2 rounded-full bg-white border-gray-300 border text-black hover:bg-gray-100 transition">
                    <DeepThinkIcon className={"size-4"} />
                    <span className="text-sm mb-[2px] select-none">
                      深度思考
                    </span>
                  </button>
                  <button className="size-9 bg-indigo-600 text-white rounded-full hover:bg-indigo-500">
                    <ArrowUpIcon className={"size-9"} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ChatPage;
