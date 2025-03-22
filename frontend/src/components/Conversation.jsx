import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import SideBar from "./sidebar";
import { globalData } from "@/constants";
import {
  SiderBarIcon,
  NewChatIcon,
  BreadcrumbIcon,
  DeepThinkIcon,
  ArrowUpIcon,
  SelectedIcon,
} from "./svg-icons";

function ChatPage() {
  const navigate = useNavigate(); // 获取导航函数
  const location = useLocation();
  // 控制模型选择
  const models = { 1: "DeepSeek-R1", 2: "QwQ-32B" };
  const [showModels, setShowModels] = useState(false);
  const [selectedCode, setSelectedCode] = useState(2);
  const [deepThink, setDeepThink] = useState(false);
  const [text, setText] = useState(""); // 存储 textarea 内容
  const modelRef = useRef(null);

  const onLoginClick = () => navigate("/login"); // 直接跳转
  const onRegisterClick = () => navigate("/register"); // 直接跳转
  const [isOpen, setIsOpen] = useState(true); // 控制侧边栏展开/折叠
  const [isLoggedIn, setIsLoggedIn] = useState(false); //用户是否登录成功(登录后才能够使用)
  const [username, setUsername] = useState("");

  // 存储所有消息
  const [messages, setMessages] = useState([]); // 存储所有消息（用户 & AI）
  const [conversationId, setConversationId] = useState("");
  const initialMessageRef = useRef(null); // 用 ref 存储初始消息，防止 useEffect 依赖问题

  // 获取新对话页传递的初始消息
  const initialMessage = location.state?.initialMessage;

  useEffect(() => {
    if (initialMessage) {
      initialMessageRef.current = initialMessage; // 存入 ref
      setMessages([initialMessage]);
      setConversationId(initialMessage.conversation_id);
      setDeepThink(location.state?.useDeepTink);
      setSelectedCode(location.state?.selectedCode);
    }
  }, [
    initialMessage,
    location.state?.useDeepTink,
    location.state?.selectedCode,
  ]);

  useEffect(() => {
    async function getUsername() {
      const name = await fetchUsername();
      setUsername(name);
    }
    getUsername();
  }, []);
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

  // 监听localStore是否存储了Session(即用户是否登录成功)
  useEffect(() => {
    // 检查 localStorage 是否有 Session_id
    const sessionId = localStorage.getItem("auth");
    setIsLoggedIn(!!sessionId); //!!sessionId 是一种 JavaScript 逻辑转换技巧，用于将变量 sessionId 转换为布尔值
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("auth");
    setIsLoggedIn(false);
  };

  // **优化后的 handleSendMessage**
  const handleSendMessage = useCallback(async () => {
    // **封装获取用户消息的方法**
    const getUserMessage = () => {
      console.log(messages)
      if (messages.length === 1 && initialMessageRef.current)
        return initialMessageRef.current;
      else if (messages.length > 2 && text.trim() !== "") {
        const userMessage = {
          author: { role: "user" },
          content: { content_type: "text", Text: text.trim() },
          status: "finished_successfully",
          message_id: crypto.randomUUID(),
          conversation_id: conversationId,
          parent: messages[messages.length - 1].message_id,
          children: [],
          created_at: new Date().toISOString(),
        };
        setMessages((prevMessages) => [...prevMessages, userMessage]);
        setText(""); // 发送后清空输入框
        return userMessage;
      } else {
        console.log("不符合发送条件!");
      }
      return null;
    };
    const userMessage = getUserMessage();
    if (!userMessage) return;

    // 生成 AI 占位消息
    const aiMessage = {
      message: {
        author: { role: "ai" },
        content: { content_type: "text", Text: "" },
        status: "processing",
        model: models[selectedCode],
      },
      message_id: crypto.randomUUID(),
      conversation_id: conversationId,
      parent: userMessage.message_id,
      children: [],
      created_at: new Date().toISOString(),
    };

    setMessages((prevMessages) => [...prevMessages, aiMessage]); // 添加占位消息

    try {
      const response = await fetch(globalData.domain + "/api/new/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: localStorage.auth,
        },
        body: JSON.stringify({
          action: "next",
          message: userMessage.message,
          message_id: userMessage.message_id,
          conversation_id: userMessage.conversation_id,
          parent: userMessage.parent,
          model: aiMessage.message.model,
          use_deep_think: deepThink,
          created_at: userMessage.created_at,
        }),
      });

      if (!response.ok) throw new Error("服务器返回错误");

      const contentType = response.headers.get("Content-Type") || "";

      if (contentType.includes("application/json")) {
        const data = await response.json();
        console.log("错误:", data);
        return;
      }

      if (contentType.includes("text/event-stream") && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          let dataStr = decoder.decode(value, { stream: true });
          if (dataStr.startsWith("data:")) {
            const jsonStr = dataStr.replace("data:", "").trim();
            if (jsonStr === "[DONE]") return;
            console.log("SSE 响应:", JSON.parse(jsonStr));
          }
        }
      }
    } catch (error) {
      console.error("请求失败:", error);
    }
  }, [models, selectedCode, conversationId, messages, text, deepThink]);

  // **确保页面渲染完成后自动发送初始消息**
  useEffect(() => {
    if (initialMessageRef.current) {
      handleSendMessage();
    }
  }, [handleSendMessage]);

  return (
    <div className="flex flex-row  max-h-screen bg-gray-100 gap">
      {/*侧边栏部分 */}
      <SideBar isOpen={isOpen} setIsOpen={setIsOpen} />

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
            {/*显示侧边栏按钮 */}
            <div className="relative group">
              <button
                onClick={() => setIsOpen(true)}
                className={`${
                  isOpen ? "hidden" : "block"
                } flex justify-center items-center size-10 transition rounded-lg hover:shadow-md hover:bg-blue-300`}
              >
                <SiderBarIcon />
              </button>
              {/* 说明框：底部显示 */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gray-700 text-white text-sm rounded py-1 px-2 whitespace-nowrap mt-2">
                显示侧边栏
              </div>
            </div>

            {/*开启新对话按钮*/}
            <div className="relative group">
              <button
                className={`${
                  isOpen ? "hidden" : "block"
                } flex justify-center items-center size-10 transition rounded-lg hover:shadow-md hover:bg-blue-300`}
              >
                <NewChatIcon />
              </button>
              {/* 说明框：底部显示 */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gray-700 text-white text-sm rounded py-1 px-2 whitespace-nowrap mt-2">
                创造新对话
              </div>
            </div>

            {/*模型选择 */}
            <div ref={modelRef} className="relative group">
              <button
                onClick={() => setShowModels(!showModels)}
                className={`relative flex flex-row items-center ml-1 px-2 py-2 rounded-lg min-h-11 hover:bg-gray-50 border ${
                  showModels ? "bg-gray-50 border-gray-200" : "border-gray-100"
                }  transition`}
              >
                <span className="text-md font-semibold text-gray-700">
                  {models[selectedCode]}
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
                      <p className="text-sm font-semibold">QwQ-32B</p>
                      <p className="text-xs">轻量化 性能媲美满血R1</p>
                    </div>
                    {selectedCode === 2 && <SelectedIcon />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 右侧登录/注册按钮 --- 登录成功后为用户功能菜单*/}
          <div className="flex flex-row justify-center items-center gap-2">
            {isLoggedIn ? (
              // 用户已登录，显示用户菜单
              <div className="relative group">
                <button className="px-4 py-[0.40rem] rounded-full bg-blue-500 text-white hover:bg-blue-600 transition">
                  {username || "Guest"}
                </button>
                <div className="absolute right-0 mt-2 w-32 bg-white border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <ul>
                    <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer">
                      设置
                    </li>
                    <li
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                      onClick={handleLogout}
                    >
                      退出登录
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              // 未登录，显示登录/注册按钮
              <>
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
              </>
            )}
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
              className="flex flex-col h-auto w-[90%] rounded-3xl border shadow-md border-gray-200 bg-gray-50 
                 md:static md:w-7/12 
                 absolute bottom-5 px-4 py-1 md:py-2"
            >
              <div className="mx-3 mt-1 flex flex-col bg-inherit mb-2">
                <textarea
                  rows={1}
                  className="w-full rounded-lg p-3 pe-12 pb-6 text-base bg-inherit outline-none resize-none overflow-y-auto"
                  placeholder="问你所想 畅所欲言"
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                  }}
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
                  <button
                    onClick={() => setDeepThink(!deepThink)}
                    className={`flex flex-row justify-center items-center gap-1 px-2 my-[0.2rem] rounded-full border ${
                      deepThink
                        ? "bg-blue-200 text-blue-600 border-blue-500"
                        : "bg-white border-gray-300  text-black  hover:bg-gray-100"
                    } transition`}
                  >
                    <DeepThinkIcon className={"size-4"} />
                    <span className="text-sm select-none">深度思考</span>
                  </button>
                  <button
                    onClick={async () => await handleSendMessage()}
                    className="size-9 bg-indigo-600 text-white rounded-full hover:bg-indigo-500"
                  >
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

async function fetchUsername() {
  try {
    const response = await fetch("http://localhost:8080/api/user/info", {
      method: "GET",
      headers: {
        Authorization: localStorage.auth,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return typeof data.username === "string" ? data.username : "";
  } catch (error) {
    console.error("Failed to fetch username:", error);
    return "";
  }
}

export default ChatPage;
