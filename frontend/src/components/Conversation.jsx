import { useLocation, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { EventSourceParserStream } from "eventsource-parser/stream";
import { MarkdownRenderer } from "./chat/Markdown"; // markdown渲染组件
import { createUserMessage, createAIMessage, processSSE } from "./chat/utils";
import { toastIfLogin } from "./user/utils";
import { models } from "@/constants";
import {
  BreadcrumbIcon,
  DeepThinkIcon,
  ArrowUpIcon,
  StopIcon,
  ImageUpLoadIcon,
} from "./svg-icons";
import HeadBar from "./chat/HeadBar";
import SideBar from "./chat/Sidebar";

function ChatPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { conversation_id } = useParams();
  const [selectedCode, setSelectedCode] = useState(2);
  const [deepThink, setDeepThink] = useState(true);
  const [inputText, setInputText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const textareaRef = useRef(null);
  // ai消息处理
  const abortController = useRef(new AbortController()); // 中断ai消息生成
  const [finishText, setFinishText] = useState(true); // 是否正文输出完毕
  const [showThinkText, setShowThinkText] = useState({});
  const [conversationId, setConversationId] = useState(conversation_id || "");
  // 处理自动滚动页面事件
  const bottomRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  // 知识库
  const baseIdRef = useRef(null);
  //处理上传图片
  const fileInputRef = useRef(null);

  // 触发文件选择窗口
  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // 处理文件选择变化
  const handleFileChange = (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file && file.type.startsWith("image/")) {
        console.log("选择的图片文件:", file);
      } else {
        alert("请选择一个图片文件");
      }
    }
  };

  // 处理 conversationId 更新
  useEffect(() => {
    if (conversation_id) {
      setConversationId(conversation_id);
    }
  }, [conversation_id]);

  const processMessages = (currentId, messages) => {
    const messageMap = {};
    messages.map((message) => {
      messageMap[message.message_id] = message; // 存入消息map
      if (message.message.author.role === "assistant") {
        message.message.thinking = false;
        const textArray = message.message.content.text.split("</think>");
        if (textArray.length === 1) {
          message.message.content.thinkText = textArray[0];
          message.message.content.text = "";
        } else if (textArray.length === 2) {
          message.message.content.thinkText = textArray[0];
          message.message.content.text = textArray[1];
        }
      }
      return message;
    });
    const messageChain = [];
    while (currentId && messageMap[currentId]) {
      const currentMessage = messageMap[currentId];
      messageChain.unshift(currentMessage); // 添加到数组开头
      currentId = currentMessage.parent;
    }
    return messageChain;
  };

  // 处理初始消息（独立 effect）
  useEffect(() => {
    const initialMessage = location.state?.initialMessage;
    if (!conversationId) return;
    if (initialMessage) {
      // 立即清理 location.state
      navigate(location.pathname, {
        replace: true,
        state: {
          ...location.state,
          initialMessage: undefined,
        },
      });

      // 原子化更新消息并发送
      setMessages((prev) => {
        const newMessages = [...prev, initialMessage];
        setTimeout(() => handleSendMessage(initialMessage), 0);
        return newMessages;
      });

      setDeepThink(location.state?.useDeepTink || false);
      setSelectedCode(location.state?.selectedCode || 1);
      baseIdRef.current = location.state?.baseId;
    } else {
      const fetchConversationInfo = async () => {
        try {
          const response = await fetch(
            `/api/get/conversation/${conversationId}`,
            {
              method: "Get",
              headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.auth,
              },
            }
          );
          if (!response.ok) throw new Error("请求失败");
          const data = await response.json();
          console.log(data.data?.baseId)
          baseIdRef.current = data.data?.baseId || null;
        } catch (error) {
          console.error("请求失败:", error);
        }
      };

      const fetchMessages = async () => {
        try {
          const response = await fetch("/api/query/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: localStorage.auth,
            },
            body: JSON.stringify({ conversation_id: conversationId }),
          });
          if (!response.ok) throw new Error("服务器返回错误");
          // 切分解析ai文本
          const data = await response.json();
          const messages = processMessages(data.current_id, data.messages);
          setMessages(messages || []);
        } catch (error) {
          console.error("请求失败:", error);
        }
      };
      fetchConversationInfo();
      fetchMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]); // 只需要conversationId

  // 监听用户滚动，判断是否应该停止自动滚动
  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (!chatContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = chatContainer;
      const isUserScrollingUp = scrollTop + clientHeight < scrollHeight - 3; // 离底部的距离
      setShouldAutoScroll(!isUserScrollingUp);
    };

    chatContainer.addEventListener("scroll", handleScroll);
    return () => chatContainer.removeEventListener("scroll", handleScroll);
  }, []);

  //自适应输入栏
  useEffect(() => {
    if (textareaRef.current) {
      const e = textareaRef.current;
      e.style.height = "auto";
      const lineHeight = parseInt(window.getComputedStyle(e).lineHeight);
      const isSmallScreen = window.innerWidth < 768;
      let maxHeight = isSmallScreen ? lineHeight * 5.5 : lineHeight * 7;
      e.style.height = `${Math.min(e.scrollHeight, maxHeight)}px`;
    }
  }, [inputText]);

  // 当消息更新时，如果 shouldAutoScroll 为 true，则滚动到底部
  useEffect(() => {
    if (shouldAutoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, shouldAutoScroll]);

  // 发送消息到服务器
  const sendMessageToServer = async (
    userMessage,
    aiMessage,
    deepThink,
    abortController
  ) => {
    abortController.current?.abort();
    abortController.current = new AbortController();

    try {
      const response = await fetch("/api/new/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: localStorage.auth,
        },
        body: JSON.stringify({
          action: "next",
          message: userMessage.message,
          message_id: userMessage.message_id,
          conversation_id: userMessage.conversation_id,
          baseId: baseIdRef.current,
          parent: userMessage.parent,
          model: aiMessage.message.model,
          use_deep_think: deepThink,
          created_at: userMessage.created_at,
        }),
        signal: abortController.current.signal,
      });

      const contentType = response.headers.get("Content-Type") || "";
      if (contentType.includes("application/json")) {
        const data = await response.json();
        console.log("错误:", data);
        return;
      }

      if (contentType.includes("text/event-stream") && response.body) {
        const reader = response.body
          .pipeThrough(new TextDecoderStream()) // 解码 UTF-8 文本
          .pipeThrough(new EventSourceParserStream()) // 解析 SSE
          .getReader();

        await processSSE(reader, aiMessage, setMessages, abortController);
        aiMessage.message.thinking = false;
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("请求失败:", error);
        aiMessage.message.thinking = false;
      }
    }
  };

  // 发送消息
  const handleSendMessage = useCallback(
    async (initialMessage = null) => {
      // 检测是否登录
      if (
        !localStorage.getItem("auth") ||
        localStorage.getItem("loginStatus") !== "login"
      ) {
        toastIfLogin(0, 500);
        return;
      }
      const userMessage =
        initialMessage ||
        createUserMessage(inputText, messages, conversationId);
      if (!userMessage) return;

      if (!initialMessage) {
        setInputText("");
        setMessages((prev) => [...prev, userMessage]);
      }

      const aiMessage = createAIMessage(userMessage, selectedCode, models);
      setFinishText(false);
      setMessages((prev) => [...prev, aiMessage]);
      setShowThinkText((prev) => ({ ...prev, [aiMessage.message_id]: true }));

      await sendMessageToServer(
        userMessage,
        aiMessage,
        deepThink,
        abortController
      );
      setFinishText(true);
      // 流式结束后获取最新消息ID
      try {
        const response = await fetch("/api/get/latest/id", {
          method: "POST",
          headers: {
            Authorization: localStorage.auth,
          },
          body: JSON.stringify({
            conversation_id: conversationId,
          }),
        });

        if (response.ok) {
          const { current_id } = await response.json();

          // 更新占位消息的ID
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage.message.author.role === "assistant") {
              lastMessage.message_id = current_id;
              lastMessage.message.thinking = false;
              lastMessage.message.status = "finished_successfully";
            }
            return newMessages;
          });
        }
      } catch (error) {
        console.error("获取最新消息ID失败:", error);
      } finally {
        setFinishText(true);
      }
    },
    [inputText, messages, conversationId, selectedCode, deepThink]
  );

  // 切换显示思考文本
  const toggleThinkText = (message_id) => {
    setShowThinkText((prev) => ({
      ...prev,
      [message_id]: !(prev[message_id] ?? false), // 使用对象的键值对
    }));
  };

  return (
    <div className="flex flex-row h-[100dvh] sm:h-screen bg-white">
      {/*侧边栏部分 */}
      <SideBar isOpen={isOpen} setIsOpen={setIsOpen} finishText={finishText} />
      {/*右侧覆盖阴影 */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="absolute left-0 z-30 bg-black opacity-20 w-full lg:w-0 h-[100dvh] sm:h-screen"
        ></div>
      )}
      {/*对话部分*/}
      <div
        className={`${
          isOpen ? "w-full lg:w-4/5" : "w-full"
        } flex flex-col max-h-screen bg-white relative`}
      >
        {/* 头部导航栏 - 固定在主内容顶部 */}
        {/*进入具体内容页可加上: border-b border-gray-300 */}
        <HeadBar
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          selectedCode={selectedCode}
          setSelectedCode={setSelectedCode}
          baseIdRef={baseIdRef}
        />

        {/* 可滚动的主内容区域 */}
        <main
          ref={chatContainerRef}
          className="flex-grow h-full overflow-y-auto flex flex-col"
        >
          <div className="flex flex-col text-base mx-5 my-5 items-center gap-5 h-auto flex-grow">
            {/* 消息容器 */}
            <div
              className={`w-[90%] md:w-9/12 xl:w-7/12 flex flex-col text-base h-auto items-center gap-5 flex-grow overflow-hidden`}
            >
              {messages.map((msg, index) =>
                msg?.message.author.role == "user" ? (
                  <div
                    key={index}
                    className="md:max-w-[60%] max-w-[70%] ml-auto mt-14 px-5 py-4 bg-gray-50 border-gray-200 border shadow-sm rounded-3xl"
                  >
                    {msg.message?.content.text}
                  </div>
                ) : (
                  <div
                    key={index}
                    className="w-[95%] py-5 h-30 leading-relaxed"
                  >
                    <button
                      onClick={() => toggleThinkText(msg.message_id)}
                      className={`relative flex flex-row justify-center items-center min-h-2/5 gap-2 pl-3 pr-6 py-2 rounded-xl border-gray-200 border bg-gray-200  text-black hover:bg-gray-50 transition`}
                    >
                      <DeepThinkIcon className={"size-4"} />
                      <span className="text-sm select-none pr-2">
                        {msg.message.thinking
                          ? "正在深度思考"
                          : "已完成深度思考"}
                      </span>
                      <BreadcrumbIcon
                        className={`${
                          showThinkText[msg.message_id] &&
                          "transform scale-y-[-1]"
                        } absolute right-2 size-5 `}
                      />
                    </button>
                    {showThinkText[msg.message_id] && (
                      <div className="border-l-2 border-gray-300 ml-1 pl-4 text-gray-500 my-2">
                        <MarkdownRenderer
                          className={"text-sm"}
                          content={msg.message?.content.thinkText}
                        />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <MarkdownRenderer
                        className={"text-base text-black"}
                        content={msg.message?.content.text}
                      />
                    </div>
                  </div>
                )
              )}
              {/* 滚动定位到最底部 */}
              <div ref={bottomRef}></div>
            </div>
          </div>
        </main>
        <footer className="items-center flex flex-col w-full">
          <div
            className="flex flex-col h-auto w-[90%] rounded-3xl border shadow-sm border-gray-300 bg-gray-50 
              md:w-9/12 xl:w-7/12 px-4 py-1 md:py-2"
          >
            <div className="mx-3 mt-1 flex flex-col bg-inherit">
              <textarea
                ref={textareaRef}
                rows={1}
                className="w-full rounded-lg p-3 pe-12 pb-6 text-base bg-inherit outline-none resize-none overflow-y-auto"
                placeholder="问你所想 畅所欲言"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  // 如果按下 Enter 键
                  if (e.key === "Enter") {
                    if (!e.shiftKey) {
                      // 如果没有按下 Shift 键，触发发送
                      e.preventDefault(); // 防止换行
                      handleSendMessage(); // 调用发送消息的函数
                      e.target.style.height = "auto";
                      bottomRef.current.scrollIntoView({ behavior: "smooth" });
                    } else {
                      // 如果按下了 Shift 键，允许换行
                      e.stopPropagation(); // 防止事件传播，确保换行
                    }
                  }
                }}
              ></textarea>
              <div className="w-full flex flex-row justify-between md:mt-2">
                <div className="flex flex-row justify-start gap-2">
                  {/*深度思考icon*/}
                  <button
                    onClick={() => setDeepThink(!deepThink)}
                    className={`flex flex-row justify-center items-center gap-1 px-2 my-[0.2rem] rounded-full border ${
                      deepThink
                        ? "bg-blue-200 text-blue-600 border-blue-500"
                        : "bg-white border-gray-300 text-black hover:bg-gray-100"
                    } transition`}
                  >
                    <DeepThinkIcon className={"size-4"} />
                    <span className="text-sm select-none">深度思考</span>
                  </button>

                  {/* 图片上传icon */}
                  <button
                    className=" flex flex-row justify-start items-center gap-1 px-2 my-[0.2rem] rounded-full border bg-white border-gray-300 text-black hover:bg-gray-100 transition"
                    onClick={handleButtonClick}
                  >
                    <ImageUpLoadIcon className={"size-5"} />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                    accept="image/*" // 限制只能选择图片
                  />
                </div>

                {/*上传按钮/中断按钮 */}
                {finishText ? (
                  <button
                    onClick={() => {
                      handleSendMessage();
                      setShouldAutoScroll(true);
                    }}
                    className="size-9 mb-1 bg-indigo-600 text-white rounded-full hover:bg-indigo-500"
                  >
                    <ArrowUpIcon className={"size-9"} />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setFinishText(true);
                      abortController.current?.abort();
                      console.log("用户中断SSE.");
                    }}
                    className="size-9 mb-1 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 items-center justify-center"
                  >
                    <StopIcon className={"size-9"} />
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="w-full md:pt-0 bg-gray-50 flex">
            <div className="text-gray-800 mt-auto flex min-h-6 sm:min-h-8 w-full items-center justify-center text-center text-xs">
              <div>AI助手可能会犯错, 请核查重要信息。</div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default ChatPage;
