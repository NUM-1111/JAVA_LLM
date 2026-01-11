import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  RedStarIcon,
  SpinCircle,
  MessageIcon,
  CloseEyeIcon,
  OpenEyeIcon,
} from "../svg-icons";
import {isValidHrbeuEmail} from "./utils";
import { EMAIL_VERIFICATION_ENABLED } from "../../constants";

function RegisterPage() {
  const navigate = useNavigate();
  const [sendState, setSendState] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    code: "",
    username: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [pwdType, setPwdType] = useState("password");
  const [btnWaiting, setBtnWaiting] = useState(false);
  const [waitText, setWaitText] = useState("发送");

  // 切换密码可见性
  const switchPwdType = () => {
    setPwdType(pwdType === "password" ? "text" : "password");
  };
  // 显示验证码倒计时
  const changeWaitText = () => {
    let count = 60;
    const timer = () => {
      count--;
      setWaitText(count + "s");
      if (count > 0) {
        setTimeout(timer, 1000);
      } else {
        setBtnWaiting(false);
      }
    };
    timer();
  };

  // 发送邮件请求
  const handleSendEmail = async (email, setSendState) => {
   if (!email || !isValidHrbeuEmail(email)){
      setMsgStruct({
        title: "邮箱格式错误",
        description: "邮箱必须为@hrbeu.edu.cn",
        type: "error",
      });
      setShowMsg(true);
      setTimeout(() => {
        setShowMsg(false);
      }, 2000);
      return
    }
    setSendState(true);
    const url = "/api/send/email";
    const req = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: email }),
    });
    const data = await req.json();
    if (data.code !== 200) {
      setTimeout(() => {
        setSendState(false);
      }, 300);
      setMsgStruct({
        title: "发送失败",
        description: data.msg || "验证码发送失败",
        type: "error",
      });
      setShowMsg(true);
      setTimeout(() => {
        setShowMsg(false);
      }, 2000);
    } else {
      setSendState(false);
      setBtnWaiting(true);
      changeWaitText();
      setMsgStruct({
        title: "发送成功",
        description: data.msg || "验证码已发送",
        type: "success",
      });
      setShowMsg(true);
      setTimeout(() => {
        setShowMsg(false);
      }, 1500);
    }
  };
  // 表单数据变化
  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 表单验证
  const validateForm = () => {
    const newErrors = {};
    let formIsValid = true;
    // 检查每个字段是否为空
    if (!formData.email) {
      newErrors.email = "* 邮箱为必填项";
      formIsValid = false;
    }else if (!isValidHrbeuEmail(formData.email)){
      newErrors.email = "* 邮箱必须为@hrbeu.edu.cn";
      formIsValid = false;
    }
    // ============================================
    // EMAIL VERIFICATION (CONDITIONAL)
    // ============================================
    // Only validate verification code if EMAIL_VERIFICATION_ENABLED is true
    // When disabled: code field is optional and not validated
    // ============================================
    if (EMAIL_VERIFICATION_ENABLED && !formData.code) {
      newErrors.code = "* 验证码为必填项";
      formIsValid = false;
    }
    if (!formData.username) {
      newErrors.username = "* 用户名为必填项";
      formIsValid = false;
    }
    if (!formData.password) {
      newErrors.password = "* 密码为必填项";
      formIsValid = false;
    }
    // 更新错误状态
    setErrors(newErrors);
    return formIsValid;
  };

  //设置消息弹窗
  const [showMsg, setShowMsg] = useState(false);
  const [msgStruct, setMsgStruct] = useState({});

  // 提交表单
  const handleRegister = async (event) => {
    event.preventDefault();
    if (!validateForm()) {
      return;
    }
    const url = "/api/register";
    // Prepare request data - only include code if email verification is enabled
    const requestData = {
      email: formData.email,
      username: formData.username,
      password: formData.password,
      // Only send code if email verification is enabled
      // Backend will handle empty/null code when verification is disabled
      ...(EMAIL_VERIFICATION_ENABLED ? { code: formData.code } : { code: "" }),
    };
    const req = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });
    const data = await req.json();
    if (data.code !== 200) {
      setMsgStruct({
        title: "注册失败!",
        description: data.msg || "注册失败，请检查输入信息",
        type: "error",
      });
      setShowMsg(true);
      setTimeout(() => {
        setShowMsg(false);
      }, 2000);
    } else {
      localStorage.loginStatus = "login";
      localStorage.auth = data.data; // JWT token
      setMsgStruct({
        title: "注册成功",
        description: "即将跳转对话页面...",
        type: "success",
      });
      setShowMsg(true);
      setTimeout(() => {
        setShowMsg(false);
        navigate("/");
      }, 500);
    }
  };

  return (
    <>
      <MessageIcon
        title={msgStruct.title}
        description={msgStruct.description}
        type={msgStruct.type}
        onClose={() => setShowMsg(false)}
        ifShow={showMsg}
      />
      <div className="relative flex flex-wrap h-[100dvh] w-full border rounded-sm items-center bg-white">
        <div className="w-full px-4 sm:px-6 md:px-8">
          <div className="mx-auto max-w-lg text-center">
            <h1 className="text-3xl font-bold text-indigo-600 ">
              欢迎加入 HeuChat
            </h1>
            <p className="mt-4 text-lg sm:text-lg text-gray-500">
              使用邮箱注册
            </p>
          </div>

          <form
            onSubmit={handleRegister}
            className="mx-auto px-6 my-auto max-w-md space-y-3 scale-100 sm:scale-100"
          >
            <div className="w-full">
              <div className="text-lg py-2 flex flex-row">
                <RedStarIcon />
                <span className="text-base">邮箱:</span>
              </div>

              <div className="relative">
                <input
                  name="email"
                  type="text"
                  value={formData.email}
                  onChange={handleFormChange}
                  className="w-full rounded-lg sm:hover:scale-105  border border-indigo-300 hover:border-indigo-500 p-3 pe-12 focus:outline-none focus:ring-2 focus:ring-indigo-300 duration-200"
                  placeholder="请输入邮箱"
                />
                {errors.email && (
                  <div className="absolute right-0 mt-1 text-right text-sm text-red-500 ">
                    {errors.email}
                  </div>
                )}
              </div>
            </div>

            {/* ============================================
                EMAIL VERIFICATION CODE INPUT (CONDITIONAL)
                ============================================
                This section is only shown when EMAIL_VERIFICATION_ENABLED is true
                When disabled: entire verification code section is hidden
                TODO: When email verification is ready, set EMAIL_VERIFICATION_ENABLED = true
                ============================================ */}
            {EMAIL_VERIFICATION_ENABLED && (
              <div className="w-full">
                <div className="text-lg py-2 flex flex-row">
                  <RedStarIcon />
                  <span className="text-base">邮箱验证码:</span>
                </div>
                <div className="relative">
                  <div className="relative">
                    <input
                      name="code"
                      type="text"
                      value={formData.code}
                      onChange={handleFormChange}
                      className="w-full rounded-lg sm:hover:scale-105  border border-indigo-300 hover:border-indigo-500 p-3 pe-12 focus:outline-none focus:ring-2 focus:ring-indigo-300 duration-200"
                      placeholder="请输入邮箱验证码"
                    />
                    {errors.code && (
                      <div className="absolute right-0 mt-1 text-right text-sm text-red-500 ">
                        {errors.code}
                      </div>
                    )}
                  </div>
                  {btnWaiting ? (
                    <button
                      type="button"
                      disabled={true}
                      className={`bg-indigo-300 absolute right-2 top-2 bottom-2 text-white font-semibold rounded-sm px-5 text-center inline-flex items-center transition-colors duration-300`}
                    >
                      {waitText}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={sendState}
                      className={`${
                        sendState ? "bg-indigo-400" : "bg-indigo-500"
                      } absolute right-2 top-2 bottom-2 text-white hover:bg-indigo-600 font-semibold rounded-sm px-5 text-center inline-flex items-center transition-colors duration-300
                        active:scale-95 active:transition-none
                      `}
                      onClick={() =>
                        handleSendEmail(formData.email, setSendState)
                      }
                    >
                      <SpinCircle loading={sendState} />
                      发送
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className="w-full">
              <div className="text-lg py-2 flex flex-row">
                <RedStarIcon />
                <span className="text-base">用户名:</span>
              </div>

              <div className="relative">
                <input
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleFormChange}
                  className="w-full rounded-lg sm:hover:scale-105  border border-indigo-300 hover:border-indigo-500 p-3 pe-12 focus:outline-none focus:ring-2 focus:ring-indigo-300 duration-200"
                  placeholder="请输入用户名"
                />
                {errors.username && (
                  <div className="absolute right-0 mt-1 text-right text-sm text-red-500 ">
                    {errors.username}
                  </div>
                )}
              </div>
            </div>
            <div className="w-full">
              <div className="py-2 flex flex-row">
                <RedStarIcon />
                <span className="text-base">密码:</span>
              </div>
              <div className="relative">
                <input
                  name="password"
                  value={formData.password}
                  onChange={handleFormChange}
                  type={pwdType}
                  className="w-full rounded-lg sm:hover:scale-105  border border-indigo-300 hover:border-indigo-500 p-3 pe-12 focus:outline-none focus:ring-2 focus:ring-indigo-300 duration-200"
                  placeholder="请设置密码"
                />

                <span
                  onClick={switchPwdType}
                  className="absolute inset-y-0 end-0 grid place-content-center px-4"
                >
                  {pwdType === "password" ? <CloseEyeIcon /> : <OpenEyeIcon />}
                </span>
                {errors.password && (
                  <div className="absolute right-0 mt-1 text-right text-sm text-red-500 ">
                    {errors.password}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3">
              <p className="text-sm text-gray-500 select-none">
                已有账号？
                <a
                  href=""
                  className="text-indigo-500 hover:text-indigo-400"
                  onClick={() => {
                    navigate("/login");
                  }}
                >
                  立即登录
                </a>
              </p>

              <button
                type="submit"
                className="inline-block tracking-wider rounded-md border border-indigo-600 bg-indigo-600 mt-2 px-8 py-[0.55rem] text-md font-medium text-white
                 hover:bg-indigo-50 hover:text-indigo-600
                  focus:outline-none focus:ring
                   active:text-indigo-500"
              >
                注 册
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default RegisterPage;
