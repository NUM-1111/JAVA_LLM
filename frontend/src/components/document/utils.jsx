const statusMap = {
  0: null,
  1: "成功",
  2: "失败",
};

const fileTypeMap = {
  1: "Word",
  2: "Excel",
  3: "PPT",
  4: "PDF",
  5: "TXT",
  6: "Image",
  7: "Markdown",
  8: "Other",
};

export const MatchStatus = (type) => {
  return statusMap[type];
};

export const MatchFileType = (type) => {
  return fileTypeMap[type];
};
