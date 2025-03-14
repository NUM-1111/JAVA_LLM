import { useNavigate } from "react-router-dom";
import { useState,useEffect, useRef } from "react";
import { globalData } from "../constants";
import {
  SiderBarIcon,
  AddIcon,
  NewChatIcon,
  BreadcrumbIcon,
  DeepThinkIcon,
  ArrowUpIcon,
  SelectedIcon,
} from "./svg-icons";

function ChatPage() {
  const navigate = useNavigate(); // 获取导航函数
  
  // 控制模型选择
  const [showModels, setShowModels] = useState(false);
  const [selectedCode, setSelectedCode] = useState(1);
  const [deepThink,setDeepThink] = useState(false);
  const modelRef = useRef(null);
  const onLoginClick = () => navigate("/login"); // 直接跳转
  const onRegisterClick = () => navigate("/register"); // 直接跳转
  const [chats, setChats] = useState([]); //存储对话

    //创建新对话
    const createChat = async () => {
        try {
            const res = await fetch(globalData.domain + "/chat/new", { method: "POST" });
            if (!res.ok) throw new Error("创建聊天失败");
            const data = await res.json();
            if (!data.chat_id) throw new Error("无效的聊天ID");

            const newChatID = data.chat_id;
            setChats([...chats, newChatID]);
            navigate(`/chat/${newChatID}`);
        } catch (error) {
            console.error(error.message);
        }
    };

  const [isOpen, setIsOpen] = useState(true); // 控制侧边栏展开/折叠

  // 监听点击外部区域来关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(event) {
      if (modelRef.current && !modelRef.current.contains(event.target)) {
        setShowModels(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-row  max-h-screen bg-gray-100 gap">
      {/*侧边栏 */}
      <div
        className={`${
          isOpen
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
              className={`${
                isOpen ? "block" : "hidden "
              }  flex justify-center items-center size-10  rounded-lg hover:shadow-md hover:bg-blue-300`}
            >
              <SiderBarIcon />
            </button>

            {/*新对话按钮(icon) */}
            <button
              onClick={createChat}
              className={`${
                isOpen ? "block" : "hidden "
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
                  <div className="mt-4">
                      {chats.map((chatId) => (
                          <button
                              key={chatId}
                              onClick={() => navigate(`/chat/${chatId}`)}
                              className="block w-full text-left p-2 bg-gray-100 rounded-md hover:bg-gray-200 my-1"
                          >
                              会话 {chatId.slice(0, 8)}...
                          </button>
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
                onClick={()=>setIsOpen(true)}
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
            <div ref={modelRef} className="relative group">
              <button
              
                onClick={() => setShowModels(!showModels)}
                className={`relative flex flex-row items-center ml-1 px-2 py-2 rounded-lg min-h-11 hover:bg-white hover:border ${
                  showModels ? "bg-white border" : ""
                } border-gray-200 transition`}
              >
                <span className="text-md font-semibold text-gray-700">
                  DeepSeek-R1
                </span>
                <BreadcrumbIcon className={"size-6"} />
              </button>
              {/* 下拉菜单 */}
              {showModels && (
                <div
                  className="absolute flex flex-col top-14 left-0 min-h-20 min-w-[260px] w-max z-50 px-2 py-2 justify-center rounded-xl border border-gray-200 bg-white shadow-md"
                  id="selectModel"
                >
                  <button
                    onClick={() => setSelectedCode(1)}
                    className={`flex flex-row w-full px-6 py-3 text-left whitespace-nowrap hover:bg-gray-100  items-start justify-between rounded-lg`}
                  >
                    <div className="flex flex-col">
                      <p className="text-sm font-semibold">DeepSeek-R1</p>
                      <p className="text-xs">具备深度思考能力</p>
                    </div>
                    {selectedCode === 1 && <SelectedIcon />}
                  </button>
                  <button
                    onClick={() => setSelectedCode(2)}
                    className={`flex flex-row w-full px-6 py-3 text-left whitespace-nowrap hover:bg-gray-100 items-start justify-between rounded-lg`}
                  >
                    <div className="flex flex-col">
                      <p className="text-sm font-semibold">QWQ-32B</p>
                      <p className="text-xs">轻量化 性能媲美满血R1</p>
                    </div>
                    {selectedCode === 2 && <SelectedIcon />}
                  </button>
                </div>
              )}
            </div>
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
                <div className="w-full flex justify-between  md:mt-2">
                  <button onClick={()=>setDeepThink(!deepThink)} className={`flex flex-row justify-center items-center gap-1 px-2 my-[0.2rem] rounded-full border ${deepThink?"bg-blue-200 text-blue-600 border-blue-500":"bg-white border-gray-300  text-black  hover:bg-gray-100"} transition`}>
                    <DeepThinkIcon className={"size-4"} />
                    <span className="text-sm select-none">
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
