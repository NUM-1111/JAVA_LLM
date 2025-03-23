import { useState } from "react";
import axios from "axios";

export default function SettingsPage() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState(""); // 存储后端返回的消息

    // 修改用户名
    const handleUpdateUsername = async () => {
        try {
            const res = await axios.post(
                "http://localhost:8080/api/change/username",
                { username },
                {
                    headers: {
                        "Authorization": localStorage.auth, // 添加Authorization头
                        "Content-Type": "application/json"  // 设置Content-Type
                    },
                    withCredentials: true // 保持当前设置
                }
            );
            setMessage(res.data.msg); // 显示成功消息
        } catch (err) {
            console.log(err);
            setMessage(err.response?.data?.msg || "请求失败");
        }
    };

    // 修改邮箱
    const handleUpdateEmail = async () => {
        try {
            const res = await axios.post(
                "http://localhost:8080/api/change/email",
                { email },
                {
                    headers: {
                        "Authorization": localStorage.auth, // 添加Authorization头
                        "Content-Type": "application/json"  // 设置Content-Type
                    },
                    withCredentials: true // 保持当前设置
                }
            );
            setMessage(res.data.msg);
        } catch (err) {
            console.log(err);
            setMessage(err.response?.data?.msg || "请求失败");
        }
    };


    const handleClearChat = async () => {
        try {
            const res = await axios.post(
                "http://localhost:8080/api/delete/chat",
                {},
                {
                    headers: {
                        "Authorization": localStorage.auth, // 添加Authorization头
                        "Content-Type": "application/json"  // 设置Content-Type
                    },
                    withCredentials: true // 保持当前设置
                }
            );
            console.log(res.data.msg);
            setMessage(res.data.msg);
        } catch (err) {
            console.log(err);
            setMessage(err.response?.data?.msg || "请求失败");
        }
    };

    const handleDeleteAccount = async () => {
        try {
            const res = await axios.post(
                "http://localhost:8080/api/delete/account",
                {},
                {
                    headers: {
                        "Authorization": localStorage.auth, // 添加Authorization头
                        "Content-Type": "application/json"  // 设置Content-Type
                    },
                    withCredentials: true // 保持当前设置
                }
            );
            console.log(res.data.msg);
            localStorage.removeItem("auth"); // 清除本地存储的auth
            window.location.href = "/login"; // 跳转到登录页面
        } catch (err) {
            console.log(err);
            setMessage(err.response?.data?.msg || "请求失败");
        }
    };

    return (
        <div className="max-w-lg mx-auto p-6 space-y-6">
            <div className="max-w-lg mx-auto p-6 space-y-6">
                {message && <div className="p-2 bg-gray-200 text-center">{message}</div>}

                <div className="bg-white shadow-lg rounded-2xl p-4">
                    <h2 className="text-xl font-bold mb-2">修改用户名</h2>
                    <input
                        className="w-full p-2 border rounded mb-2"
                        placeholder="输入新用户名"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <button onClick={handleUpdateUsername} className="w-full bg-blue-500 text-white py-2 rounded">
                        保存修改
                    </button>
                </div>

                <div className="bg-white shadow-lg rounded-2xl p-4">
                    <h2 className="text-xl font-bold mb-2">修改邮箱</h2>
                    <input
                        className="w-full p-2 border rounded mb-2"
                        placeholder="输入新邮箱"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <button onClick={handleUpdateEmail} className="w-full bg-blue-500 text-white py-2 rounded">
                        保存修改
                    </button>
                </div>
            </div>

            <div className="bg-white shadow-lg rounded-2xl p-4">
                <h2 className="text-xl font-bold mb-2">聊天记录管理</h2>
                <button onClick={handleClearChat} className="w-full bg-red-500 text-white py-2 rounded">
                    删除所有聊天记录
                </button>
            </div>

            <div className="bg-white shadow-lg rounded-2xl p-4">
                <h2 className="text-xl font-bold mb-2">账户管理</h2>
                <button onClick={handleDeleteAccount} className="w-full bg-red-700 text-white py-2 rounded">
                    注销账号
                </button>
            </div>
        </div>
    );
}
