import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { globalData, fetchJson } from "@/constants";
import { RedStarIcon, SpinCircle } from "./svg-icons";

function RegisterPage() {
  const navigate = useNavigate();
  const [sendState, setSendState] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    captcha: "",
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
  const handleSend = async (email, setSendState) => {
    setSendState(true);
    const url = globalData.domain + "/api/sendmail";
    const data = await fetchJson(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: email, type: "0" }),
    });
    if (data.code !== "0") {
      console.log(data.msg);
      setSendState(false);
    } else {
      setTimeout(() => {
        console.log(data.msg);
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
    if (!formData.captcha) {
      newErrors.captcha = "* 验证码为必填项";
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
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) {
      return;
    }
    const url = globalData.domain + "/api/register";
    const data = await fetchJson(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });
    if (data.code !== "0") {
      console.log(data.msg);
    } else {
      console.log(data.msg);
      localStorage.auth = data.auth;
      navigate("/buysubs");
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
        <div className="w-full pt-6 xl:pt-0 sm:px-6 md:px-8">
          <div className="mx-auto max-w-lg text-center">
            <img
              loading="eager"
              alt="图片显示错误"
              src="https://pic.baike.soso.com/p/20100928/20100928142716-1180565429.jpg"
              className="w-16 h-16 mx-auto"
            />
            <h1 className="text-2xl font-bold sm:text-3xl text-indigo-600">
              欢迎加入 HeuChat
            </h1>

            <p className="mt-4 text-lg text-gray-500">使用邮箱注册</p>
          </div>

          <form
            onSubmit={handleSubmit}
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
                 {errors.email && <div className="absolute right-0 mt-1 text-right text-sm text-red-500 ">{errors.email}</div>} 
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
                    name="captcha"
                    type="text"
                    value={formData.captcha}
                    onChange={handleFormChange}
                    className="w-full rounded-lg hover:scale-105  border hover:border-indigo-500 p-3 pe-12 focus:outline-none focus:ring-2 focus:ring-indigo-300 duration-200"
                    placeholder="请输入邮箱验证码"
                  />
                  {errors.captcha && <div className="absolute right-0 mt-1 text-right text-sm text-red-500 ">{errors.captcha}</div>} 
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
                    } absolute right-2 top-2 bottom-2 text-white hover:bg-indigo-600 font-semibold rounded-sm px-5 text-center inline-flex items-center transition-colors duration-300`}
                    onClick={() => handleSend(formData.email, setSendState)}
                  >
                    <SpinCircle loading={sendState} />
                    发送
                  </button>
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

                <span className="absolute inset-y-0 end-0 grid place-content-center px-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`size-5 text-gray-400`}
                    fill="none"
                    viewBox={
                      pwdType === "password" ? "0 0 1024 1024" : "0 0 24 24"
                    }
                    stroke="currentColor"
                    onClick={switchPwdType}
                  >
                    {pwdType === "password" ? (
                      <path
                        d="M659.0208 665.6c-9.984 0-19.7632-5.12-25.1904-14.2336l-58.7008-97.92a29.44 29.44 0 0 1 10.0864-40.2944 29.5168 29.5168 0 0 1 40.32 10.0608l58.7008 97.92A29.44 29.44 0 0 1 659.0208 665.6z m156.416-97.92c-7.5008 0-15.0016-2.8672-20.736-8.6016l-78.2592-78.336a29.3376 29.3376 0 1 1 41.4976-41.4976l78.2592 78.336a29.3376 29.3376 0 0 1-20.736 50.0992zM365.0048 665.6a29.3888 29.3888 0 0 1-25.1904-44.4672l58.6752-97.92a29.3888 29.3888 0 0 1 50.4064 30.2336l-58.7008 97.92a29.312 29.312 0 0 1-25.1904 14.2336z m-156.416-97.92a29.3376 29.3376 0 0 1-20.736-50.0992l78.2336-78.336a29.3376 29.3376 0 1 1 41.4976 41.472L229.2992 559.104a28.8512 28.8512 0 0 1-20.736 8.6016z m312.9344-19.5584c-81.8176 0-202.2912-28.0576-311.168-161.536a137.6256 137.6256 0 0 0-2.9696-3.584 29.3888 29.3888 0 0 1 39.7312-43.264c1.28 1.0752 4.352 4.2496 8.7808 9.6768 94.3616 115.712 196.5568 140.032 265.6256 140.032 119.2448 0 255.0272-123.136 268.3648-142.6944 8.9856-13.056 26.9824-17.3056 40.4224-8.704 13.312 8.4992 17.8688 25.4976 9.8816 39.1424-13.952 23.3984-166.8096 170.9312-318.6688 170.9312z"
                        fill="#606065"
                      ></path>
                    ) : (
                      <>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </>
                    )}
                  </svg>
                </span>
                {errors.password && <div className="absolute right-0 mt-1 text-right text-sm text-red-500 ">{errors.password}</div>} 
              </div>
            </div>

            <div className="flex items-center justify-between">
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
                className="inline-block tracking-wider rounded border border-indigo-600 bg-indigo-600 px-12 mt-2 py-3 text-md font-medium text-white hover:bg-indigo-50 hover:transition-colors hover:text-indigo-600 focus:outline-none focus:ring active:text-indigo-500"
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
