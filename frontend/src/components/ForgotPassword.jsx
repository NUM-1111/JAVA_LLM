import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { globalData } from "@/constants";
import { MessageIcon, RedStarIcon } from "./svg-icons";

function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: "", code: "", newPassword: "", confirmPassword: "" });
    const [errors, setErrors] = useState({});
    const [showMsg, setShowMsg] = useState(false);
    const [msgStruct, setMsgStruct] = useState({});
    const [step, setStep] = useState(1); // 1: 输入邮箱, 2: 输入验证码, 3: 修改密码

    const handleFormChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // 验证邮箱
    const validateEmail = () => {
        if (!formData.email) {
            setErrors({ email: "* 邮箱为必填项" });
            return false;
        }
        return true;
    };

    // 验证密码
    const validatePassword = () => {
        if (!formData.newPassword || !formData.confirmPassword) {
            setErrors({ password: "* 新密码和确认密码为必填项" });
            return false;
        }
        if (formData.newPassword !== formData.confirmPassword) {
            setErrors({ password: "* 两次输入的密码不一致" });
            return false;
        }
        return true;
    };

    // 发送验证码
    const sendCode = async () => {
        if (!validateEmail()) return;
        const url = globalData.domain + "/send/email";
        const req = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: formData.email }),
        });
        const data = await req.json();
        setMsgStruct({ title: "验证码发送", description: data.msg, type: req.status === 200 ? "success" : "error" });
        setShowMsg(true);
        if (req.status === 200) setStep(2);
    };

    // 验证验证码
    const verifyCode = async () => {
        if (!formData.code) {
            setErrors({ code: "* 验证码不能为空" });
            return;
        }
        const url = globalData.domain + "/checkcode";
        const req = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: formData.email, code: formData.code }),
        });
        const data = await req.json();
        setMsgStruct({ title: "验证码验证", description: data.msg, type: req.status === 200 ? "success" : "error" });
        setShowMsg(true);
        if (req.status === 200) setStep(3);
    };

    // 重置密码
    const resetPassword = async () => {
        if (!validatePassword()) return;
        const url = globalData.domain + "/reset/password";
        const req = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: formData.email, newPassword: formData.newPassword }),
        });
        const data = await req.json();
        setMsgStruct({ title: "密码重置", description: data.msg, type: req.status === 200 ? "success" : "error" });
        setShowMsg(true);
        if (req.status === 200) setTimeout(() => navigate("/login"), 2000);
    };

    return (
        <>
            <MessageIcon {...msgStruct} ifShow={showMsg} onClose={() => setShowMsg(false)} />
            <div className="fixed z-10 flex flex-wrap h-fit w-full border rounded-lg items-center">
                <div className="w-full px-10 mt-2 py-20 md:px-8">
                    <div className="mx-auto max-w-lg text-center">
                        <h1 className="text-2xl font-bold sm:text-3xl text-indigo-600">找回密码</h1>
                    </div>
                    <form className="mx-auto mt-8 max-w-md space-y-4">
                        {step === 1 && (
                            <>
                                <div>
                                    <div className="text-lg py-2 flex flex-row"><RedStarIcon /><span>邮箱:</span></div>
                                    <input name="email" type="email" value={formData.email} onChange={handleFormChange} className="w-full rounded-lg border p-3" placeholder="请输入邮箱" />
                                    {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
                                </div>
                                <button type="button" className="w-full bg-indigo-600 text-white p-3 rounded-lg" onClick={sendCode}>发送验证码</button>
                            </>
                        )}
                        {step === 2 && (
                            <>
                                <div>
                                    <div className="text-lg py-2 flex flex-row"><RedStarIcon /><span>验证码:</span></div>
                                    <input name="code" type="text" value={formData.code} onChange={handleFormChange} className="w-full rounded-lg border p-3" placeholder="请输入验证码" />
                                    {errors.code && <p className="text-red-500 text-sm">{errors.code}</p>}
                                </div>
                                <button type="button" className="w-full bg-indigo-600 text-white p-3 rounded-lg" onClick={verifyCode}>验证验证码</button>
                            </>
                        )}
                        {step === 3 && (
                            <>
                                <div>
                                    <div className="text-lg py-2 flex flex-row"><RedStarIcon /><span>新密码:</span></div>
                                    <input name="newPassword" type="password" value={formData.newPassword} onChange={handleFormChange} className="w-full rounded-lg border p-3" placeholder="请输入新密码" />
                                </div>
                                <div>
                                    <div className="text-lg py-2 flex flex-row"><RedStarIcon /><span>确认密码:</span></div>
                                    <input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleFormChange} className="w-full rounded-lg border p-3" placeholder="请再次输入新密码" />
                                    {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
                                </div>
                                <button type="button" className="w-full bg-indigo-600 text-white p-3 rounded-lg" onClick={resetPassword}>重置密码</button>
                            </>
                        )}
                    </form>
                </div>
            </div>
        </>
    );
}

export default ForgotPasswordPage;
