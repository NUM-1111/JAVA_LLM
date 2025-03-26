import { useLocation, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { EventSourceParserStream } from "eventsource-parser/stream";
import SideBar from "./Sidebar";
import { globalData, models } from "@/constants";
import { DeepThinkIcon, ArrowUpIcon } from "./svg-icons";
import HeadBar from "./HeadBar";
import {MarkdownRenderer} from "./Markdown" // markdown渲染组件

function ChatPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { conversation_id } = useParams();
  const [selectedCode, setSelectedCode] = useState(2);
  const [deepThink, setDeepThink] = useState(false);
  const [text, setText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const messagesRef = useRef(messages);
  const [generated,setGenerated] = useState(false) // ai消息是否完成
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
  }, [conversationId]); // 只需要conversationId

  // 监听用户滚动，判断是否应该停止自动滚动
  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (!chatContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = chatContainer;
      const isUserScrollingUp = scrollTop + clientHeight < scrollHeight - 100; // 离底部100px
      setShouldAutoScroll(!isUserScrollingUp);
    };

    chatContainer.addEventListener("scroll", handleScroll);
    return () => chatContainer.removeEventListener("scroll", handleScroll);
  }, []);

  // 当消息更新时，如果 shouldAutoScroll 为 true，则滚动到底部
  useEffect(() => {
    if (shouldAutoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, shouldAutoScroll]);
  // 发送消息
  const handleSendMessage = useCallback(
    async (initialMessage = null) => {
      // 使用 ref 获取最新消息或传入的初始消息
      const currentMessages = messagesRef.current;
      const userMessage =
        initialMessage ||
        (() => {
          if (currentMessages.length>0 && text.trim() !== "") {
            return {
              message: {
                author: { role: "user" },
                content: { content_type: "text", text: text.trim() },
                status: "finished_successfully",
              },
              message_id: crypto.randomUUID(),
              conversation_id: conversationId,
              parent:
                currentMessages[currentMessages.length - 1]?.message_id || null,
              children: [],
              created_at: new Date().toISOString(),
            };
          }
          return null;
        })();

      if (!userMessage) return;

      // 如果是文本输入的消息，更新状态
      if (!initialMessage) {
        setText("");
        setMessages((prev) => [...prev, userMessage]);
      }

      // 创建 AI 消息
      const aiMessage = {
        message: {
          author: { role: "assistant" },
          content: { content_type: "text", text: "" },
          status: "processing",
          model: models[selectedCode],
        },
        message_id: crypto.randomUUID(),
        conversation_id: conversationId,
        parent: userMessage.message_id,
        children: [],
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMessage]);
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
        });

        const contentType = response.headers.get("Content-Type") || "";
        if (contentType.includes("application/json")) {
          const data = await response.json();
          console.log("错误:", data);
          return;
        }

        if (contentType.includes("text/event-stream") && response.body) {
          setGenerated(false)
          const reader = response.body
            .pipeThrough(new TextDecoderStream()) // 解码 UTF-8 文本
            .pipeThrough(new EventSourceParserStream()) // 解析 SSE
            .getReader();
          
          while (!generated) {
            const { done, value } = await reader.read();
            if (done) {
              console.log("SSE完毕");
              break;
            }
            console.log(JSON.stringify(value));
            try {
              const jsonData = JSON.parse(value.data);
              if (jsonData.type === "answer_chunk" && jsonData.content) {
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const aiMsg = newMessages[newMessages.length - 1];
                  if (aiMsg.message.author.role != "assistant") {
                    console.log("最新消息为用户消息,ai消息更新失败!");
                    setGenerated(true)
                  }
                  aiMsg.message.content.text += jsonData.content;
                  return newMessages;
                });
              } else if (
                jsonData.type === "status" &&
                jsonData.message === "ANSWER_DONE"
              ) {
                console.log("SSE 响应接受完成.");
                setGenerated(true)
                return;
              }
              console.log("SSE 响应:", jsonData);
            } catch (e) {
              console.error("JSON 解析错误:", e, "内容:", value.data);
              setGenerated(true)
              return
            }
          }
        }
      } catch (error) {
        console.error("请求失败:", error);
        setGenerated(true)
        return
      }
    },
    [selectedCode, conversationId, text, deepThink, generated]
  );

  return (
    <div className="flex flex-row h-screen bg-gray-100 gap-2">
      {/*侧边栏部分 */}
      <SideBar isOpen={isOpen} setIsOpen={setIsOpen} />

      {/*对话部分*/}
      <div
        className={`${
          isOpen ? "w-full lg:w-4/5" : "w-full"
        } flex flex-col h-full max-h-screen bg-gray-100`}
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
                msg?.message.author.role=="user"? (
                  <div
                    key={index}
                    className="md:max-w-[60%] max-w-[70%] ml-auto p-5 h-30 bg-gray-50 border-gray-200 border shadow-sm rounded-3xl"
                  >
                    {msg.message?.content.text}
                  </div>
                ) : (
                  <div
                    key={index}
                    className="w-[95%] py-5 h-30 leading-relaxed"
                  >
                    <MarkdownRenderer content={msg.message?.content.text}/>
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
                rows={1}
                className="w-full rounded-lg p-3 pe-12 pb-6 text-base bg-inherit outline-none resize-none overflow-y-auto"
                placeholder="问你所想 畅所欲言"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onInput={(e) => {
                  e.target.style.height = "auto";
                  const lineHeight = parseInt(
                    window.getComputedStyle(e.target).lineHeight
                  );
                  const isSmallScreen = window.innerWidth < 768;
                  let maxHeight = isSmallScreen
                    ? lineHeight * 5.5
                    : lineHeight * 7;
                  e.target.style.height = `${Math.min(
                    e.target.scrollHeight,
                    maxHeight
                  )}px`;
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
                <button
                  onClick={async () => {
                    await handleSendMessage();
                    setShouldAutoScroll(true);
                  }}
                  className="size-9 mb-1 bg-indigo-600 text-white rounded-full hover:bg-indigo-500"
                >
                  <ArrowUpIcon className={"size-9"} />
                </button>
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
