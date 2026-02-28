const statusMap = {
  0: "等待解析",
  1: "成功",
  2: "失败",
  None: "等待解析",
  Success: "成功",
  Failure: "失败",
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
  Word: "Word",
  Excel: "Excel",
  PPT: "PPT",
  PDF: "PDF",
  TXT: "TXT",
  Image: "Image",
  Markdown: "Markdown",
  Other: "Other",
};

export const MatchStatus = (type) => {
  return statusMap[type] || type || "-";
};

export const MatchFileType = (type) => {
  return fileTypeMap[type] || type || "-";
};
