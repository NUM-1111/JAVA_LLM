import { v4 as uuid } from "uuid";

// 创建用户消息
const createUserMessage = (inputText, messages, conversationId) => {
  if (messages.length === 0 || inputText.trim() === "") return null;
  return {
    message: {
      author: { role: "user" },
      content: { content_type: "text", text: inputText.trim() },
      status: "finished_successfully",
    },
    message_id: uuid(),
    conversation_id: conversationId,
    parent: messages[messages.length - 1]?.message_id || null,
    children: [],
    created_at: new Date().toISOString(),
  };
};

// 创建 AI 消息
const createAIMessage = (userMessage, selectedCode, models) => ({
  message: {
    author: { role: "assistant" },
    content: { content_type: "text", text: "", thinkText: "" },
    status: "processing",
    thinking: true,
    model: models[selectedCode],
  },
  message_id: uuid(),
  conversation_id: userMessage.conversation_id,
  parent: userMessage.message_id,
  children: [],
  created_at: new Date().toISOString(),
});

// 处理 SSE 数据流
const processSSE = async (
  reader,
  aiMessage,
  setMessages,
  abortController
) => {
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      console.log("SSE 完毕");
      break;
    }
    try {
      const jsonData = JSON.parse(value.data);
      if (jsonData.type === "answer_chunk") {
        if (jsonData.content === "</think>") {
          aiMessage.message.thinking = false;
        } else {
          setMessages((prev) => {
            const newMessages = [...prev];
            const aiMsg = newMessages[newMessages.length - 1];
            if (aiMsg.message.author.role === "assistant") {
              if (!aiMsg.message.thinking) {
                aiMsg.message.content.text += jsonData.content;
              } else {
                aiMsg.message.content.thinkText += jsonData.content;
              }
            }
            return newMessages;
          });
        }
      } else if (
        jsonData.type === "status" &&
        jsonData.message === "ANSWER_DONE"
      ) {
        console.log("SSE 响应接受完成.");
        abortController.current?.abort();
        return;
      } else {
        console.log("未知 SSE 格式:", jsonData);
      }
    } catch (e) {
      console.error("JSON 解析错误:", e, "内容:", value.data);
      abortController.current?.abort();
      return;
    }
  }
};

// 获取用户名
  const fetchUsername = async () => {
    try {
      const response = await fetch("/api/user/info", {
        method: "GET",
        headers: {
          Authorization: localStorage.auth,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("auth");
          setIsLoggedIn(false);
          return "";
        }
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      return typeof data.username === "string" ? data.username : "";
    } catch (error) {
      console.error("Failed to fetch username:", error);
      return "";
    }
  }

export { createUserMessage, createAIMessage, processSSE, fetchUsername };
