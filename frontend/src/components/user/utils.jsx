import { toast } from "react-toastify";

let lastToastTime = 0; // 记录上次执行时间

const toastIfLogin = (delay=300,duration=1000) => {
  const now = Date.now();
  if (now - lastToastTime < duration+100) return; // 如果没过冷却时间，则直接返回
  lastToastTime = now; // 更新上次执行时间
  let message;
  if (!localStorage.getItem("auth")) {
    message = "登录身份已过期,请重新登录";
  }
  if (localStorage.getItem("loginStatus") !== "login") {
    message = "您尚未登录 !";
  }
  setTimeout(() => {
    toast.error(message, {
      position: "top-center", // 提示显示在页面顶部
      autoClose: duration, // 1秒后自动关闭
      hideProgressBar: true, // 隐藏进度条
      closeOnClick: true, // 点击后关闭
      pauseOnHover: false, // 鼠标悬停时不会暂停
      draggable: false, // 不能拖动
    });
  }, delay);
};

export {toastIfLogin};
