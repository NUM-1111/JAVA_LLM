import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { globalData } from "@/constants";
import { RedStarIcon, SpinCircle, MessageIcon, CloseEyeIcon, OpenEyeIcon } from "./svg-icons";

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
  const [loading, setLoading] = useState(true);
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
    setSendState(true);
    const url = globalData.domain + "/send/email";
    const req = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: email }),
    });
    const data = await req.json();
    if (req.status != 200) {
      console.log(data);
      setSendState(false);
    } else {
      setTimeout(() => {
        console.log(data);
      }, 300);
      setSendState(false);
      setBtnWaiting(true);
      changeWaitText();
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
    }
    if (!formData.code) {
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

  // 提交表单
  const [showSuccessMsg, setShowSuccessMsg] = useState(false);

  const handleRegister = async (event) => {
    event.preventDefault();
    if (!validateForm()) {
      return;
    }
    const url = globalData.domain + "/register";
    const req = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });
    const data = await req.json();
    if (req.status != 200) {
      console.log(data);
    } else {
      localStorage.auth = data.auth;
      setShowSuccessMsg(true);
      setTimeout(() => {
        setShowSuccessMsg(false);
        navigate("/chat");
      }, 500);
    }
  };

  // 页面加载完成
  useEffect(() => {
    const handleLoad = () => {
      console.log("所有文档内容加载完成");
      setTimeout(() => {
        setLoading(false);
      }, globalData.spinningTime);
    };
    window.addEventListener("load", handleLoad);
    return () => {
      window.removeEventListener("load", handleLoad);
    };
  }, []);

  return (
    <>
      <div className="relative flex flex-wrap h-[101vh] w-full border rounded-sm lg:items-center bg-white">
        <div className="w-full sm:px-6 md:px-8">
          <MessageIcon
            title="注册成功"
            description="即将跳转至聊天界面..."
            onClose={() => setShowSuccessMsg(false)}
            ifShow={showSuccessMsg}
            type="success"
          />
          <div className="mx-auto max-w-lg text-center">
            <h1 className="text-2xl font-bold sm:text-3xl text-indigo-600 ">
              欢迎加入 HeuChat
            </h1>
            <p className="mt-4 text-lg text-gray-500">使用邮箱注册</p>
          </div>

          <form
            onSubmit={handleRegister}
            className="mx-auto px-6 my-auto max-w-md space-y-3"
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
                  className="w-full rounded-lg hover:scale-105  border hover:border-indigo-500 p-3 pe-12 focus:outline-none focus:ring-2 focus:ring-indigo-300 duration-200"
                  placeholder="请输入邮箱"
                />
                {errors.email && (
                  <div className="absolute right-0 mt-1 text-right text-sm text-red-500 ">
                    {errors.email}
                  </div>
                )}
              </div>
            </div>

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
                    className="w-full rounded-lg hover:scale-105  border hover:border-indigo-500 p-3 pe-12 focus:outline-none focus:ring-2 focus:ring-indigo-300 duration-200"
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
                  className="w-full rounded-lg hover:scale-105  border hover:border-indigo-500 p-3 pe-12 focus:outline-none focus:ring-2 focus:ring-indigo-300 duration-200"
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
                  className="w-full rounded-lg hover:scale-105  border hover:border-indigo-500 p-3 pe-12 focus:outline-none focus:ring-2 focus:ring-indigo-300 duration-200"
                  placeholder="请设置密码"
                />

                <span
                  onClick={switchPwdType}
                  className="absolute inset-y-0 end-0 grid place-content-center px-4"
                >
                  {pwdType === "password" ? <CloseEyeIcon/> : <OpenEyeIcon />}
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
                    !loading && navigate("/login");
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
