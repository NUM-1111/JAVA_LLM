import { useEffect } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { globalData } from "@/constants";
import {
  RedStarIcon,
  MessageIcon,
  CloseEyeIcon,
  OpenEyeIcon,
} from "../svg-icons";

function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    account: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [pwdType, setPwdType] = useState("password");
  const [loading, setLoading] = useState(true);
  // 切换密码可见性
  const switchPwdType = () => {
    setPwdType(pwdType === "password" ? "text" : "password");
  };
  // 处理表单变化
  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  // 表单验证
  const validateForm = () => {
    const newErrors = {};
    let formIsValid = true;
    // 检查每个字段是否为空
    if (!formData.account) {
      newErrors.account = "* 邮箱/用户名为必填项";
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
  // 处理表单提交

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!validateForm()) {
      return;
    }
    const url = globalData.domain + "/login";
    const req = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });
    const data = await req.json();
    if (req.status != 200) {
      setMsgStruct({
        title: "登录失败!",
        description: data.msg,
        type: "error",
      });
      setShowMsg(true);
      setTimeout(() => {
        setShowMsg(false);
      }, 2000);
    } else {
      localStorage.auth = data.session_id;
      setMsgStruct({
        title: "登录成功",
        description: "即将跳转至聊天界面...",
        type: "success",
      });
      setShowMsg(true);
      setTimeout(() => {
        setShowMsg(false);
        navigate("/chat");
      }, 1000);
    }
  };

  useEffect(() => {
    setLoading(false);
  }, [loading]);

  return (
    <>
      <MessageIcon
        title={msgStruct.title}
        description={msgStruct.description}
        type={msgStruct.type}
        onClose={() => setShowMsg(false)}
        ifShow={showMsg}
      />
      <div className="fixed z-10 flex flex-wrap h-fit w-full border rounded-lg items-center">
        <div className="w-full px-10 mt-2 py-20 md:px-8">
          <div className="mx-auto max-w-lg text-center">
            <h1 className="text-2xl font-bold sm:text-3xl text-indigo-600">
              登录到 HeuChat
            </h1>
          </div>

          <form
            onSubmit={handleLogin}
            className="mx-auto mb-0 mt-8 max-w-md space-y-4 scale-90 sm:scale-100"
          >
            <div>
              <div className="text-lg py-2 flex flex-row">
                <RedStarIcon />
                <span className="text-lg">邮箱/用户名:</span>
              </div>

              <div className="relative">
                <input
                  name="account"
                  type="text"
                  value={formData.account}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-indigo-300 p-3 pe-12 text-base focus:outline-none focus:ring-1 focus:ring-blue-500 hover:scale-105  hover:border-indigo-500 duration-200"
                  placeholder="请输入邮箱/用户名"
                />
                {errors.account && (
                  <div className="absolute right-0 mt-1 text-right text-sm text-red-500 ">
                    {errors.account}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="text-lg py-2 flex flex-row">
                <RedStarIcon />
                <span className="text-lg">密码:</span>
              </div>
              <div className="relative">
                <input
                  name="password"
                  value={formData.password}
                  onChange={handleFormChange}
                  type={pwdType}
                  className="w-full rounded-lg border border-indigo-300 p-3 pe-12 text-base focus:outline-none  focus:ring-1 focus:ring-blue-500 hover:scale-105  hover:border-indigo-500 duration-200"
                  placeholder="请输入密码"
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

            <div className="flex items-start justify-between pt-2">
              <div className="flex flex-col space-y-2 ">
                <p className="text-sm text-gray-500 select-none">
                  还没有账号？
                  <a
                    href=""
                    className="text-indigo-500 hover:text-indigo-400"
                    onClick={() => {
                      !loading && navigate("/register");
                    }}
                  >
                    立即注册
                  </a>
                </p>
                <p className="text-sm select-none">
                  <a
                    href=""
                    className="text-indigo-500 hover:text-indigo-400"
                    onClick={() => {
                      !loading && navigate("/forgot-password");
                    }}
                  >
                    忘记密码
                  </a>
                </p>
              </div>

              <button
                type="submit"
                className="inline-block tracking-wider rounded-lg border border-indigo-600 bg-indigo-600 mt-2 px-12 py-3 text-md font-medium text-white hover:bg-indigo-50 hover:text-indigo-600 focus:outline-none focus:ring active:text-indigo-500"
              >
                登 录
              </button>
            </div>
            <div className="flex flex-col pt-8">
              <div className="flex items-center justify-center py-4 text-gray-500 text-sm">
                <div className="flex-grow border-t  border-gray-300"></div>
                <span className="px-4">其他登录方式</span>
                <div className="flex-grow border-t  border-gray-300"></div>
              </div>

              <div className="flex justify-center items-center gap-4 mt-1 text-blue-500 text-sm">
                <a
                  href=""
                  className=" text-indigo-500 hover:text-indigo-400 select-none"
                  onClick={() => {
                    !loading && navigate("/login");
                  }}
                >
                  统一身份认证登录
                </a>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default LoginPage;
