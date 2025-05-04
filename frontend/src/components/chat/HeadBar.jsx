import { models } from "@/constants";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useState, useEffect, useRef } from "react";
import "react-toastify/dist/ReactToastify.css";
import { fetchUsername } from "./utils";
import {
  SiderBarIcon,
  NewChatIcon,
  BreadcrumbIcon,
  SelectedIcon,
  ShareIcon,
} from "../svg-icons";
import { Modal } from "antd";

function HeadBar({ isOpen, setIsOpen, selectedCode, setSelectedCode }) {
  const modelRef = useRef(null);
  const settingRef = useRef(null);
  const navigate = useNavigate(); // 获取导航函数
  const onLoginClick = () => navigate("/login"); // 直接跳转
  const onRegisterClick = () => navigate("/register"); // 直接跳转
  const [isLoggedIn, setIsLoggedIn] = useState(false); //用户是否登录成功(登录后才能够使用)
  const [menuOpen, setMenuOpen] = useState(false); // 用户菜单是否展开
  const [username, setUsername] = useState("");
  const [showModels, setShowModels] = useState(false);

  // 获取用户名
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
      if (settingRef.current && !settingRef.current.contains(event.target)) {
        setMenuOpen(false);
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

  // 退出登录
  const handleLogout = () => {
    localStorage.removeItem("auth");
    setIsLoggedIn(false);
    localStorage.removeItem("loginStatus");
    toast.success("退出登录成功", {
      position: "top-center", // 提示显示在页面顶部
      autoClose: 1000, // 1秒后自动关闭
      hideProgressBar: true, // 隐藏进度条
      closeOnClick: true, // 点击后关闭
      pauseOnHover: false, // 鼠标悬停时不会暂停
      draggable: false, // 不能拖动
    });
    navigate("/login");
  };

  /*
  获取知识库列表(查询接口)
  */
  const [data, setData] = useState([]);
  const [showModals, setShowModals] = useState(false);
  const [isuseBase, setIsuseBase] = useState(false)
  const [currentBase, setCurrentBase] = useState(null)
  
  const handleOk = (item) => {
    modelRef.current.focus();
    setShowModals(false);
    setIsuseBase(true)
    setCurrentBase(item)
  };
  const handleCancel = () => {
    modelRef.current.focus();
    setShowModals(false);
  };

  const fetchData = async () => {
    try {
      const response = await fetch("/api/knowledge/list", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: localStorage.auth,
        },
      });

      const data = await response.json();

      if (data.total == 0) {
        setData([]);
        return;
      }
      setData(data.data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <header className="sticky xl:absolute w-full z-20 top-0 flex flex-row px-5 py-3 bg-white justify-between items-center select-none xl:bg-transparent">
      {/* 左侧按钮 */}
      <div className="sm:absolute sm:left-6 lg:left-0 lg:relative flex flex-row mr-1 text-gray-700">
        {/*显示侧边栏按钮 */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(true);
            }}
            className={`${
              isOpen ? "lg:hidden" : "block"
            } flex justify-center items-center size-8 sm:size-10 transition rounded-lg hover:shadow-md hover:bg-blue-300 group`}
          >
            <SiderBarIcon className={"size-5 sm:size-6"} />
            {/* 说明框：底部显示 */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 hidden group-hover:block transition-all duration-300 bg-gray-700 text-white text-sm rounded py-1 px-2 whitespace-nowrap mt-1 ml-2">
              显示侧边栏
            </div>
          </button>
        </div>

        {/*开启新对话按钮*/}
        <div className="relative">
          <button
            onClick={() => navigate("/")}
            className={`${
              isOpen ? "lg:hidden" : "block"
            } flex justify-center items-center size-8 sm:size-10 transition rounded-lg hover:shadow-md hover:bg-blue-300 group`}
          >
            <NewChatIcon className={"size-5 sm:size-6"} />
            {/* 说明框：底部显示 */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 hidden group-hover:block transition-all duration-300 bg-gray-700 text-white text-sm rounded py-1 px-2 whitespace-nowrap mt-1">
              创建新对话
            </div>
          </button>
        </div>
      </div>

      {/* 模型选择按钮 */}
      <div className="flex flex-1 justify-start sm:justify-center lg:justify-start mr-1">
        <div
          ref={modelRef}
          className="relative group hover:bg-gray-100 rounded-lg w-fit"
        >
          <button
            onClick={() => setShowModels(!showModels)}
            className={`relative flex flex-row items-center  px-2 py-2 rounded-lg justify-center min-w-24 sm:min-w-40 min-h-11  ${
              showModels ? "bg-gray-200" : ""
            }  transition`}
          >
            <span className="text-base sm:text-lg font-semibold text-gray-700 mr-5">
              {isuseBase? currentBase.base_name : models[selectedCode]}
            </span>
            <BreadcrumbIcon
              className={`${
                showModels && "transform scale-y-[-1]"
              } absolute right-2 size-5 `}
            />
          </button>
          {/* 下拉菜单 */}
          {showModels && (
            <div
              className="absolute -inset-x-10 lg:left-0 flex flex-col top-[3.3rem] min-h-20 min-w-[260px] w-max z-50 px-2 py-2 justify-center rounded-xl bg-white shadow-md border border-gray-200"
              id="selectModel"
            >
              <button
                onClick={() => { setSelectedCode(1), setShowModels(false), setIsuseBase(false), setCurrentBase(null) }}
                className={`flex flex-row w-full px-6 py-2 text-left whitespace-nowrap hover:bg-gray-100  items-start justify-between rounded-lg`}
              >
                <div className="flex flex-col text-gray-800">
                  <p className="text-sm font-semibold">DeepSeek-R1</p>
                  <p className="text-xs">具备深度思考能力</p>
                </div>
                {selectedCode === 1 && <SelectedIcon />}
              </button>
              <button
                onClick={() => { setSelectedCode(2) , setShowModels(false), setIsuseBase(false), setCurrentBase(null) }}
                className={`flex flex-row w-full px-6 py-2 text-left whitespace-nowrap hover:bg-gray-100 items-start justify-between rounded-lg`}
              >
                <div className="flex flex-col text-gray-800">
                  <p className="text-sm font-semibold">QwQ-32B</p>
                  <p className="text-xs">轻量化 性能媲美满血R1</p>
                </div>
                {selectedCode === 2 && <SelectedIcon />}
              </button>
              <button
                onClick={() => {setShowModals(true),fetchData()}}
                className={`flex flex-row w-full px-6 py-2 text-left whitespace-nowrap hover:bg-gray-100 items-start justify-between rounded-lg`}
              >
                <div className="flex flex-col text-gray-800">
                  <p className="text-sm font-semibold">知识库</p>
                  <p className="text-xs">加强专业领域对话</p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      <Modal
        title="选择知识库"
        open={showModals}
        onOk={handleOk}
        onCancel={handleCancel}
        footer={null}
        width={400}
      >
        {data.length === 0 ? (<p className="text-center text-gray-500">╮(╯▽╰)╭暂无知识库</p>) : (
          (
            data.map((item) => (
              <button
                key={item.baseId}
                className="px-4 py-2 mt-1 bg-gray-100 hover:bg-gray-200 cursor-pointer w-full text-left rounded-md"
                onClick={() => {
                  setShowModels(false);
                  setShowModals(false);
                  setIsuseBase(true)
                  setCurrentBase(item)
                }}
              >{item.base_name}</button>
            ))
          )
        )}
      </Modal>

      {/* 右侧登录/注册按钮 --- 登录成功后为用户功能菜单 */}
      <div className="flex flex-row justify-center items-center gap-2">
        <button
          className="flex flex-row items-center gap-1 mr-1 sm:mr-4 hover:opacity-75 text-gray-800"
          onClick={() => navigate("/introduce")}
        >
          <ShareIcon className={"size-4 mt-[1px] scale-105"} />
          <div className="inline-flex">
            <span className="text-base">关于</span>
            <span className="text-base hidden sm:block">我们</span>
          </div>
        </button>
        {isLoggedIn ? (
          // 用户已登录，显示用户菜单
          <div className="relative">
            {/* 点击按钮展开/收起菜单 */}
            <button
              className="px-4 py-[0.30rem] rounded-full bg-blue-500 text-white border border-blue-500 hover:bg-gray-50 hover:text-blue-500 hover:border-blue-500  transition duration-200"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {username.slice(0, 8) || "Guest"}
            </button>

            {/* 下拉菜单：用 menuOpen 控制显示/隐藏 */}
            {menuOpen && (
              <div
                ref={settingRef}
                className="absolute right-0 mt-2 w-32 bg-white border rounded-lg shadow-lg"
              >
                <ul>
                  <li
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/settings");
                    }}
                  >
                    设置
                  </li>
                  <li
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    退出登录
                  </li>
                </ul>
              </div>
            )}
          </div>
        ) : (
          // 未登录，显示登录/注册按钮
          <div className="absolute right-6 lg:relative lg:right-0 flex flex-row gap-1">
            <button
              className="px-3 py-[0.25rem] justify-center items-center sm:px-4 sm:py-[0.40rem] rounded-full bg-blue-500 border-blue-500 border text-white hover:text-blue-600 hover:bg-blue-200 transition"
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
        )}
      </div>
    </header>
  );
}

export default HeadBar;
