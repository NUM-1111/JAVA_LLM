const globalData = {
  domain: "http://127.0.0.1:8080",  // 后端服务器地址
  spinningTime: 100,
  marginLeft: " ml-[4.5rem] md:ml-[18rem] 2xl:ml-[21rem] ",
};

const fetchJson = async (url, options) => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      return { code: response.status, data: null, msg: response.statusText };
    }
    const data = await response.json();
    return data;
  } catch (err) {
    console.error(err);
    return null;
  }
};

export { globalData, fetchJson };
