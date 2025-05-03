const statusMap = {
  1: null,
  2: "成功",
  3: "失败",
};

export const MatchStatus = (type) => {
  return statusMap[type];
};
