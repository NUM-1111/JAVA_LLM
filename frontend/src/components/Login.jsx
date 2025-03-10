import { useEffect } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { globalData, fetchJson } from "@/constants";
import { RedStarIcon } from "./svg-icons";

function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
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
  // 处理表单提交
  const handleSubmit = async (event) => {
    event.preventDefault();
    const url = globalData.domain + "/api/login";
    const data = await fetchJson(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });
    if (data.code !== "0") {
      console.log(data.msg)
    } else {
      localStorage.auth = data.auth;
      console.log("登陆成功!")
      setTimeout(() => {
        navigate("/index");  // 跳转主界面
      }, 500);
    }
  };

  useEffect(() => {
    setLoading(false);
  }, [loading]);

  return (
    <>
      <div className="relative flex flex-wrap h-[101vh] w-full border rounded-lg lg:items-center">
        <div className="hidden md:block relative h-64 sm:h-96 md:h-full md:w-1/2">
          <img
            loading="eager"
            alt="Welcome to AutoUnipus!"
            src="https://images.unsplash.com/photo-1630450202872-e0829c9d6172?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=774&q=80"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
        <div className="w-full px-4 sm:px-6 py-40 md:w-1/2 md:px-8 md:py-24">
          <div className="mx-auto max-w-lg text-center">
            <h1 className="text-2xl font-bold sm:text-3xl text-indigo-600">
              登录到 AutoUnipus
            </h1>

            <p className="mt-4 text-lg text-gray-500">使用邮箱登录</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mx-auto mb-0 mt-8 max-w-md space-y-4"
          >
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <div className="text-lg py-2 flex flex-row">
                <RedStarIcon />
                <span className="text-lg">邮箱:</span>
              </div>

              <div className="relative">
                <input
                  name="email"
                  type="text"
                  value={formData.email}
                  onChange={handleFormChange}
                  className="w-full rounded-md border border-indigo-300 p-3 pe-12 text-base focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
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
                  className="w-full rounded-md border border-indigo-300 p-3 pe-12 text-base focus:outline-none  focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter password"
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
              </div>
            </div>

            <div className="flex items-center justify-between">
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

              <button
                type="submit"
                className="inline-block tracking-wider rounded border border-indigo-600 bg-indigo-600 mt-2 px-12 py-3 text-md font-medium text-white hover:bg-indigo-50 hover:text-indigo-600 focus:outline-none focus:ring active:text-indigo-500"
              >
                登 录
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default LoginPage;
