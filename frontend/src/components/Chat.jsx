import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { SiderBarIcon } from "./svg-icons";

function ChatPage() {
    const navigate = useNavigate(); // 获取导航函数

    const onLoginClick = () => navigate("/login"); // 直接跳转
    const onRegisterClick = () => navigate("/register"); // 直接跳转

    const [isOpen, setIsOpen] = useState(true); // 控制侧边栏展开/折叠

    return (
        <div className="flex flex-row items-center justify-center min-h-screen bg-gray-200 gap">
            {/*侧边栏 */}
            <div
                className={`${isOpen ? " translate-x-0 md:relative md:z-auto" : "-translate-x-full hidden"} 
             md:flex  md:w-1/5 absolute w-3/5 z-50 inset-y-0 left-0 h-screen flex flex-col justify-between border-e 
              border-gray-100 bg-white shadow-sm transition-all duration-300 overflow-hidden`}
            >
                <div className="px-4 py-6">
                    {/* 关闭按钮 */}
                    <button
                        onClick={() => setIsOpen(false)}
                        className={`${isOpen ? "block" : "hidden"
                            } fixed top-[1.52rem] left-4 transition`}
                    >
                        <SiderBarIcon />
                    </button>

                    {/*新对话按钮*/}
                    <div className="mt-8 space-y-1 ">
                        <button
                            className="px-4 py-2 font-bold text-sm  rounded-lg border border-blue-200 text-blue-600 bg-blue-500/15  hover:bg-blue-500/20 ">
                            开启新对话
                        </button>
                    </div>

                    <ul className="mt-6 space-y-1">
                        <li>
                            <a
                                href="#"
                                className="block rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700"
                            >
                                对话
                            </a>
                        </li>

                        <li>
                            <details className="group [&_summary::-webkit-details-marker]:hidden">
                                <summary className="flex cursor-pointer items-center justify-between rounded-lg px-4 py-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                                    <span className="text-sm font-medium"> Teams </span>

                                    <span className="shrink-0 transition duration-300 group-open:-rotate-180">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="size-5"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </span>
                                </summary>

                                <ul className="mt-2 space-y-1 px-4">
                                    <li>
                                        <a
                                            href="#"
                                            className="block rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                        >
                                            Banned Users
                                        </a>
                                    </li>

                                    <li>
                                        <a
                                            href="#"
                                            className="block rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                        >
                                            Calendar
                                        </a>
                                    </li>
                                </ul>
                            </details>
                        </li>

                        <li>
                            <a
                                href="#"
                                className="block rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                            >
                                Billing
                            </a>
                        </li>

                        <li>
                            <a
                                href="#"
                                className="block rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                            >
                                Invoices
                            </a>
                        </li>

                        <li>
                            <details className="group [&_summary::-webkit-details-marker]:hidden">
                                <summary className="flex cursor-pointer items-center justify-between rounded-lg px-4 py-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                                    <span className="text-sm font-medium"> Account </span>

                                    <span className="shrink-0 transition duration-300 group-open:-rotate-180">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="size-5"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </span>
                                </summary>

                                <ul className="mt-2 space-y-1 px-4">
                                    <li>
                                        <a
                                            href="#"
                                            className="block rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                        >
                                            Details
                                        </a>
                                    </li>

                                    <li>
                                        <a
                                            href="#"
                                            className="block rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                        >
                                            Security
                                        </a>
                                    </li>

                                    <li>
                                        <form action="#">
                                            <button
                                                type="submit"
                                                className="w-full rounded-lg px-4 py-2 [text-align:_inherit] text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                            >
                                                Logout
                                            </button>
                                        </form>
                                    </li>
                                </ul>
                            </details>
                        </li>
                    </ul>
                </div>
            </div>

            {/*对话部分*/}
            <div className="flex flex-row items-center justify-center w-4/5 z-10 bg-gray-200">
                <div className="absolute right-4 top-3 h-8 flex space-x-2">

                    {/* 控制侧边栏的按钮 (左上角) */}
                    <button
                        onClick={() => setIsOpen(true)}
                        className={`${isOpen ? "hidden" : "block"
                            } block fixed top-[1.52rem] left-4 transition `}
                    >
                        <SiderBarIcon />
                    </button>

                    <div className="flex flex-row gap-2">

                        {/* 登录按钮 */}
                        <button
                            className="px-3 py-1 rounded-2xl bg-blue-500 text-white  hover:bg-blue-400 transition "
                            onClick={onLoginClick}
                        >
                            <span className="text-sm">登录</span>
                        </button>

                        {/* 注册按钮 */}
                        <button
                            className="px-3 py-1 rounded-2xl bg-white text-black  hover:bg-slate-100 transition hidden md:block"
                            onClick={onRegisterClick}
                        >
                            <span className="text-sm">注册</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ChatPage;
