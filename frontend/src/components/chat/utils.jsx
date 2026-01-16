import { v4 as uuid } from "uuid";

// 创建用户消息
const createUserMessage = (inputText, messages, conversationId) => {
  // 允许 conversationId 为空（新对话）
  if (inputText.trim() === "") return null;
  return {
    message: {
      author: { role: "user" },
      content: { content_type: "text", text: inputText.trim() },
      status: "finished_successfully",
    },
    message_id: uuid(),
    conversation_id: conversationId || "", // 允许为空字符串
    parent: messages.length > 0 ? messages[messages.length - 1]?.message_id || null : null,
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

// 处理 SSE 数据流（兼容 Uint8Array / 兼容你现在 value.data 的情况）
const processSSE = async (
  reader,
  aiMessage,
  setMessages,
  abortController,
  setConversationId,
  navigate
) => {
  let newConversationId = null;

  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  const handleJson = (jsonData) => {
    if (jsonData.type === "conversation_id") {
      newConversationId = jsonData.conversation_id;
      console.log("收到新 conversationId:", newConversationId);

      if (setConversationId) setConversationId(newConversationId);

      if (navigate && newConversationId && !window.location.pathname.includes(newConversationId)) {
        navigate(`/c/${newConversationId}`, { replace: true });
      }
      return;
    }

    if (jsonData.type === "answer_chunk") {
      if (jsonData.content === "</think>") {
        aiMessage.message.thinking = false;
        return;
      }

      setMessages((prev) => {
        const newMessages = [...prev];
        const aiMsg = newMessages[newMessages.length - 1];
        if (aiMsg && aiMsg.message.author.role === "assistant") {
          if (!aiMsg.message.thinking) {
            aiMsg.message.content.text += jsonData.content ?? "";
          } else {
            aiMsg.message.content.thinkText += jsonData.content ?? "";
          }
        }
        return newMessages;
      });
      return;
    }

    if (jsonData.type === "status") {
      setMessages((prev) => {
        const newMessages = [...prev];
        const aiMsg = newMessages[newMessages.length - 1];
        if (aiMsg && aiMsg.message.author.role === "assistant") {
          aiMsg.message.thinkTitle = jsonData.message;
        }
        return newMessages;
      });

      if (jsonData.message === "ANSWER_DONE") {
        console.log("SSE 响应接受完成.");
        abortController?.current?.abort();
      }
      return;
    }

    if (jsonData.type === "error") {
      console.error("SSE error:", jsonData.message);
      return;
    }

    console.log("未知 SSE 格式:", jsonData);
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      console.log("SSE 完毕");
      break;
    }

    // 1) 把 chunk 变成字符串（兼容 Uint8Array / 兼容你现在 value.data）
    let chunk = "";
    if (value == null) continue;

    if (value instanceof Uint8Array) {
      chunk = decoder.decode(value, { stream: true });
    } else if (typeof value === "string") {
      chunk = value;
    } else if (typeof value === "object" && "data" in value) {
      chunk = String(value.data ?? "");
    } else {
      chunk = String(value);
    }

    // 兼容 \r\n
    chunk = chunk.replace(/\r\n/g, "\n");

    buffer += chunk;

    // 2) SSE 事件以空行分隔：\n\n
    while (true) {
      const idx = buffer.indexOf("\n\n");
      if (idx === -1) break;

      const eventBlock = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);

      // 3) 只取 data: 行（可能有多行 data:，合并起来）
      const dataLines = eventBlock
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.replace(/^data:\s*/, ""));

      if (dataLines.length === 0) continue;

      const payload = dataLines.join("\n").trim();
      if (!payload) continue;
      if (payload === "[DONE]") return newConversationId;

      // 4) 只 parse 纯 JSON，不要因为一次 parse 失败就 abort（否则就“不流式”了）
      try {
        const jsonData = JSON.parse(payload);
        handleJson(jsonData);
      } catch (e) {
        console.warn("SSE JSON 解析失败，payload=", payload);
        // 不 abort，不 return，让流继续
      }
    }
  }

  return newConversationId;
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
        localStorage.removeItem("loginStatus");
        return "";
      }
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    // 后端返回Result格式: {code: 200, msg: "success", data: {username: "..."}}
    if (data.code === 200 && data.data && typeof data.data.username === "string") {
      return data.data.username;
    }
    return "";
  } catch (error) {
    console.error("Failed to fetch username:", error);
    return "";
  }
};

export { createUserMessage, createAIMessage, processSSE, fetchUsername };
