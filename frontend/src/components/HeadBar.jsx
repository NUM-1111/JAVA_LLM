import { models } from "@/constants";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { SiderBarIcon, NewChatIcon, BreadcrumbIcon } from "./svg-icons";
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

function HeadBar({ isOpen, setIsOpen, selectedCode, setSelectedCode }) {
  const modelRef = useRef(null);
  const navigate = useNavigate(); // 获取导航函数
  const onLoginClick = () => navigate("/login"); // 直接跳转
  const onRegisterClick = () => navigate("/register"); // 直接跳转
  const [isLoggedIn, setIsLoggedIn] = useState(false); //用户是否登录成功(登录后才能够使用)
  const [username, setUsername] = useState("");
  const [showModels, setShowModels] = useState(false);

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

  return (
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
                <li
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => navigate("/settings")}
                >
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
  );
}

export default HeadBar;
