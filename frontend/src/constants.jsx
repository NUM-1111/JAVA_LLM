const Host = import.meta.env.VITE_HOST
const Port = import.meta.env.VITE_PORT
const globalData = {
  domain: `http://${Host}:${Port}`,  // 后端服务器地址
};

const models = { 1: "DeepSeek-R1", 2: "QwQ-32B" };
export { globalData,models };
