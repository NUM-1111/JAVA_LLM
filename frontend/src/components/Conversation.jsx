import { useLocation, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { EventSourceParserStream } from "eventsource-parser/stream";
import { MarkdownRenderer } from "./chat/Markdown"; // markdown渲染组件
import { createUserMessage, createAIMessage, processSSE } from "./chat/utils";
import {toastIfLogin} from "./user/utils"
import { globalData, models } from "@/constants";
import {
  BreadcrumbIcon,
  DeepThinkIcon,
  ArrowUpIcon,
  StopIcon,
} from "./svg-icons";
import HeadBar from "./HeadBar";
import SideBar from "./Sidebar";

function ChatPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { conversation_id } = useParams();
  const [selectedCode, setSelectedCode] = useState(2);
  const [deepThink, setDeepThink] = useState(true);
  const [inputText, setInputText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const messagesRef = useRef(messages);
  const textareaRef = useRef(null);
  // ai消息处理
  const abortController = useRef(new AbortController()); // 中断ai消息生成
  const finishThink = useRef(false); // 是否结束思考
  const [finishText, setFinishText] = useState(true); // 是否正文输出完毕
  const [showThinkText, setShowThinkText] = useState({});
  const [conversationId, setConversationId] = useState(conversation_id || "");
  // 处理自动滚动页面事件
  const bottomRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // 同步最新消息到 ref
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // 处理 conversationId 更新
  useEffect(() => {
    if (conversation_id) {
      setConversationId(conversation_id);
    }
  }, [conversation_id]);

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
    } else {
      const fetchMessages = async () => {
        try {
          const response = await fetch(
            globalData.domain + "/api/query/messages",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.auth,
              },
              body: JSON.stringify({ conversation_id: conversationId }),
            }
          );

          if (!response.ok) throw new Error("服务器返回错误");
          const data = await response.json();
          setMessages(data.messages || []);
        } catch (error) {
          console.error("请求失败:", error);
        }
      };
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
      const response = await fetch(globalData.domain + "/api/new/message", {
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

        await processSSE(reader, setMessages, finishThink, abortController);
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("请求失败:", error);
      }
    }
  };

  // 发送消息
  const handleSendMessage = useCallback(
    async (initialMessage = null) => {
      // 检测是否登录
    if (!localStorage.getItem("auth") || localStorage.getItem("loginStatus")!=="login"){
      toastIfLogin(0,500);
      return
    }
      const userMessage =
        initialMessage ||
        createUserMessage(inputText, messagesRef, conversationId);
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
    },
    [selectedCode, conversationId, inputText, deepThink]
  );

  // 切换显示思考文本
  const toggleThinkText = (message_id) => {
    setShowThinkText((prev) => ({
      ...prev,
      [message_id]: !(prev[message_id] ?? true), // 使用对象的键值对
    }));
  };

  return (
    <div className="flex flex-row h-screen bg-white">
      {/*侧边栏部分 */}
      <SideBar isOpen={isOpen} setIsOpen={setIsOpen} />

      {/*对话部分*/}
      <div
        className={`${
          isOpen ? "w-full lg:w-4/5" : "w-full"
        } flex flex-col h-full max-h-screen bg-white relative`}
      >
        {/* 头部导航栏 - 固定在主内容顶部 */}
        {/*进入具体内容页可加上: border-b border-gray-300 */}
        <HeadBar
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          selectedCode={selectedCode}
          setSelectedCode={setSelectedCode}
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
                    className="md:max-w-[60%] max-w-[70%] ml-auto mt-14 p-5 h-30 bg-gray-50 border-gray-200 border shadow-sm rounded-3xl"
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
                      className={`z relative flex flex-row justify-center items-center min-h-2/5 gap-2 pl-3 pr-6 py-2 rounded-xl border-gray-200 border bg-gray-200  text-black hover:bg-gray-50 transition`}
                    >
                      <DeepThinkIcon className={"size-4"} />
                      <span className="text-sm select-none pr-2">
                        {finishThink.current
                          ? "已完成深度思考"
                          : "正在深度思考"}
                      </span>
                      <BreadcrumbIcon
                        className={`${
                          showThinkText[msg.message_id] && "transform scale-y-[-1]"
                        } absolute right-2 size-5 `}
                      />
                    </button>
                    {showThinkText[msg.message_id] && (
                      <MarkdownRenderer
                        className={"text-sm text-gray-500"}
                        content={msg.message?.content.thinkText}
                      />
                    )}
                    <MarkdownRenderer
                      className={"text-base text-black"}
                      content={msg.message?.content.text}
                    />
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
              <div className="w-full flex justify-between md:mt-2">
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
          <div className="w-[70%] md:pt-0 bg-gray-50 flex">
            <div className="text-gray-800 mt-auto flex min-h-8 w-full items-center justify-center text-center text-xs">
              <div>AI助手也可能会犯错, 请核查重要信息。</div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default ChatPage;
