import { useNavigate } from "react-router-dom";

function ChatPage() {
    const navigate = useNavigate(); // 获取导航函数

    const onLoginClick = () => navigate("/login"); // 直接跳转
    const onRegisterClick = () => navigate("/register"); // 直接跳转

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 gap-4">
            {/* 登录按钮 */}
            <button
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                onClick={onLoginClick}
            >
                Login
            </button>

            {/* 注册按钮 */}
            <button
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
                onClick={onRegisterClick}
            >
                Register
            </button>
        </div>
    );
}

export default ChatPage;
