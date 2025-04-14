import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageIcon, RedStarIcon } from "../svg-icons";
import {isValidHrbeuEmail} from "./utils";

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    code: "",
    newPassword: "",
    confirmPassword: "",
  });
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
    else if (!isValidHrbeuEmail(formData.email)){
      setErrors({ email: "* 邮箱必须为@hrbeu.edu.cn" });
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
    const url = "/api/send/email";
    const req = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: formData.email }),
    });
    const data = await req.json();
    setMsgStruct({
      title: "验证码发送",
      description: data.msg,
      type: req.status === 200 ? "success" : "error",
    });
    setShowMsg(true);
    if (req.status === 200) setStep(2);
  };

  // 验证验证码
  const verifyCode = async () => {
    if (!formData.code) {
      setErrors({ code: "* 验证码不能为空" });
      return;
    }
    const url = "/api/checkcode";
    const req = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: formData.email, code: formData.code }),
    });
    const data = await req.json();
    setMsgStruct({
      title: "验证码验证",
      description: data.msg,
      type: req.status === 200 ? "success" : "error",
    });
    setShowMsg(true);
    if (req.status === 200) {
      // 存储 token，确保后续请求能用到
      localStorage.setItem("token", data.token);
      setStep(3);
    }
  };

  // 重置密码
  const resetPassword = async () => {
    if (!validatePassword()) return;

    const token = localStorage.getItem("token"); // 取出存储的 token
    if (!token) {
      setMsgStruct({
        title: "密码重置",
        description: "Token 缺失，请重新获取验证码。",
        type: "error",
      });
      setShowMsg(true);
      return;
    }

    const url = "/api/reset/password";
    const req = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword: formData.newPassword }), // 发送 token
    });
    const data = await req.json();

    setMsgStruct({
      title: "密码重置",
      description: data.msg,
      type: req.status === 200 ? "success" : "error",
    });
    setTimeout(() => {
      setShowMsg(false);
    }, 1500);
    setShowMsg(true);

    if (req.status === 200) {
      localStorage.removeItem("resetToken"); // 重置成功后清除 token
      setTimeout(() => navigate("/login"), 2000);
    }
  };

  return (
    <>
      <MessageIcon
        {...msgStruct}
        ifShow={showMsg}
        onClose={() => setShowMsg(false)}
      />
      <div className="fixed z-10 flex flex-wrap h-[100dvh] w-full border rounded-lg items-center">
        <div className="w-full px-10 items-center justify-center mb-20 md:px-8">
          <div className="mx-auto max-w-lg text-center">
            <h1 className="text-2xl font-bold sm:text-3xl text-indigo-600">
              HeuChat 找回密码
            </h1>
          </div>
          <form className="mx-auto mt-8 max-w-md space-y-4">
            {step === 1 && (
              <div className="flex flex-col gap-6">
                <div>
                  <div className="text-lg py-2 flex flex-row">
                    <RedStarIcon />
                    <span>邮箱:</span>
                  </div>
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-indigo-300 hover:border-indigo-500 p-3 pe-12 focus:outline-none focus:ring-2 focus:ring-indigo-300 duration-200"
                    placeholder="请输入邮箱"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm">{errors.email}</p>
                  )}
                </div>
                <button
                  type="button"
                  className="w-full bg-indigo-600 text-white p-3 rounded-lg"
                  onClick={sendCode}
                >
                  发送验证码
                </button>
              </div>
            )}
            {step === 2 && (
              <div className="flex flex-col gap-6">
                <div>
                  <div className="text-lg py-2 flex flex-row">
                    <RedStarIcon />
                    <span>验证码:</span>
                  </div>
                  <input
                    name="code"
                    type="text"
                    value={formData.code}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-indigo-300 hover:border-indigo-500 p-3 pe-12 focus:outline-none focus:ring-2 focus:ring-indigo-300 duration-200"
                    placeholder="请输入验证码"
                  />
                  {errors.code && (
                    <p className="text-red-500 text-sm">{errors.code}</p>
                  )}
                </div>
                <button
                  type="button"
                  className="w-full bg-indigo-600 text-white p-3 rounded-lg"
                  onClick={verifyCode}
                >
                  验证验证码
                </button>
              </div>
            )}
            {step === 3 && (
              <div className="flex flex-col gap-6">
                <div>
                  <div className="text-lg py-2 flex flex-row">
                    <RedStarIcon />
                    <span>新密码:</span>
                  </div>
                  <input
                    name="newPassword"
                    type="password"
                    value={formData.newPassword}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-indigo-300 hover:border-indigo-500 p-3 pe-12 focus:outline-none focus:ring-2 focus:ring-indigo-300 duration-200"
                    placeholder="请输入新密码"
                  />
                </div>
                <div>
                  <div className="text-lg py-2 flex flex-row">
                    <RedStarIcon />
                    <span>确认密码:</span>
                  </div>
                  <input
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-indigo-300 hover:border-indigo-500 p-3 pe-12 focus:outline-none focus:ring-2 focus:ring-indigo-300 duration-200"
                    placeholder="请再次输入新密码"
                  />
                  {errors.password && (
                    <p className="text-red-500 text-sm">{errors.password}</p>
                  )}
                </div>
                <button
                  type="button"
                  className="w-full bg-indigo-600 text-white p-3 rounded-lg"
                  onClick={resetPassword}
                >
                  重置密码
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </>
  );
}

export default ForgotPasswordPage;
