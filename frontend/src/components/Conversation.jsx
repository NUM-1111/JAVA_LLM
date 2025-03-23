import { useLocation } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import SideBar from "./sidebar";
import { globalData, models } from "@/constants";
import { DeepThinkIcon, ArrowUpIcon } from "./svg-icons";
import HeadBar from "./HeadBar";

function ChatPage() {
  const location = useLocation();
  // 控制模型选择

  const [selectedCode, setSelectedCode] = useState(2);
  const [deepThink, setDeepThink] = useState(false);
  const [text, setText] = useState(""); // 存储 textarea 内容

  const [isOpen, setIsOpen] = useState(true); // 控制侧边栏展开/折叠

  // 存储所有消息
  const [messages, setMessages] = useState([]); // 存储所有消息（用户 & AI）
  const [conversationId, setConversationId] = useState("");
  const initialMessageRef = useRef(null); // 用 ref 存储初始消息，防止 useEffect 依赖问题

  // 获取新对话页传递的初始消息
  const initialMessage = location.state?.initialMessage;

  useEffect(() => {
    if (initialMessage) {
      initialMessageRef.current = initialMessage; // 存入 ref
      setMessages([initialMessage]);
      setConversationId(initialMessage.conversation_id);
      setDeepThink(location.state?.useDeepTink);
      setSelectedCode(location.state?.selectedCode);
    }
  }, [
    initialMessage,
    location.state?.useDeepTink,
    location.state?.selectedCode,
  ]);

  // **优化后的 handleSendMessage**
  const handleSendMessage = useCallback(async () => {
    // **封装获取用户消息的方法**
    const getUserMessage = () => {
      if (messages.length === 1 && initialMessageRef.current)
        return initialMessageRef.current;
      else if (messages.length > 2 && text.trim() !== "") {
        const userMessage = {
          author: { role: "user" },
          content: { content_type: "text", Text: text.trim() },
          status: "finished_successfully",
          message_id: crypto.randomUUID(),
          conversation_id: conversationId,
          parent: messages[messages.length - 1].message_id,
          children: [],
          created_at: new Date().toISOString(),
        };
        setMessages((prevMessages) => [...prevMessages, userMessage]);
        setText(""); // 发送后清空输入框
        return userMessage;
      } else {
        console.log("不符合发送条件!");
      }
      return null;
    };
    const userMessage = getUserMessage();
    if (!userMessage) return;

    // 生成 AI 占位消息
    const aiMessage = {
      message: {
        author: { role: "assistant" },
        content: { content_type: "text", text: "你好,我是人工智能助手" },
        status: "processing",
        model: models[selectedCode],
      },
      message_id: crypto.randomUUID(),
      conversation_id: conversationId,
      parent: userMessage.message_id,
      children: [],
      created_at: new Date().toISOString(),
    };

    setMessages((prevMessages) => [...prevMessages, aiMessage]); // 添加占位消息

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

      if (!response.ok) throw new Error("服务器返回错误");

      const contentType = response.headers.get("Content-Type") || "";

      if (contentType.includes("application/json")) {
        const data = await response.json();
        console.log("错误:", data);
        return;
      }

      if (contentType.includes("text/event-stream") && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          let dataStr = decoder.decode(value, { stream: true });
          if (dataStr.startsWith("data:")) {
            const jsonStr = dataStr.replace("data:", "").trim();
            if (jsonStr === "[DONE]") return;
            console.log("SSE 响应:", JSON.parse(jsonStr));
          }
        }
      }
    } catch (error) {
      console.error("请求失败:", error);
    }
  }, [selectedCode, conversationId, messages, text, deepThink]);

  // **确保页面渲染完成后自动发送初始消息**
  useEffect(() => {
    if (initialMessageRef.current) {
      handleSendMessage();
    }
  }, [handleSendMessage]);

  return (
    <div className="flex flex-row max-h-screen bg-gray-100 gap-2">
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
        <main className="flex-grow h-screen overflow-y-auto flex flex-col">
          <div className="flex flex-col text-base mx-5 items-center gap-5 h-auto flex-grow mb-40">
            {/* 消息容器 */}
            <div
              className={`${
                isOpen ? "w-full" : "w-full xl:w-[80%]"
              } flex flex-col text-base h-auto items-center gap-5 flex-grow overflow-hidden`}
            >
              {messages.map((msg, index) =>
                index % 2 === 0 ? (
                  <div
                    key={index}
                    className="ml-[30%] w-[60%] md:mr-[15%] p-5 h-30 bg-gray-50 border-gray-200 border shadow-sm rounded-3xl"
                  >
                    {msg.message.content.text}
                  </div>
                ) : (
                  <div
                    key={index}
                    className="w-[78%] py-5 h-30 leading-relaxed"
                  >
                    {msg.message.content.text}
                  </div>
                )
              )}
              {messages.map((msg, index) =>
                index % 2 === 0 ? (
                  <div
                    key={index}
                    className="ml-[30%] w-[60%] md:mr-[15%] p-5 h-30 bg-gray-50 border-gray-200 border shadow-sm rounded-3xl"
                  >
                    {msg.message.content.text}
                  </div>
                ) : (
                  <div
                    key={index}
                    className="w-[78%] py-5 h-30 leading-relaxed"
                  >
                    {msg.message.content.text}
                  </div>
                )
              )}
            </div>
            <div
              className="flex flex-col h-auto w-[90%] rounded-3xl border shadow-sm border-gray-300 bg-gray-50 
                md:w-9/12 xl:w-7/12 absolute bottom-8 px-4 py-1 md:py-2"
            >
              <div className="mx-3 mt-1 flex flex-col bg-inherit">
                <textarea
                  rows={1}
                  className="w-full rounded-lg p-3 pe-12 pb-6 text-base bg-inherit outline-none resize-none overflow-y-auto"
                  placeholder="问你所想 畅所欲言"
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                  }}
                  onInput={(e) => {
                    e.target.style.height = "auto"; // 先重置高度，防止高度收缩不生效
                    const lineHeight = parseInt(
                      window.getComputedStyle(e.target).lineHeight
                    );
                    const isSmallScreen = window.innerWidth < 768; // 判断是否为 md 以下
                    let maxHeight = isSmallScreen
                      ? lineHeight * 5.5
                      : lineHeight * 7;
                    e.target.style.height = `${Math.min(
                      e.target.scrollHeight,
                      maxHeight
                    )}px`; // 根据内容调整高度
                  }}
                ></textarea>
                <div className="w-full flex justify-between md:mt-2">
                  <button
                    onClick={() => setDeepThink(!deepThink)}
                    className={`flex flex-row justify-center items-center gap-1 px-2 my-[0.2rem] rounded-full border ${
                      deepThink
                        ? "bg-blue-200 text-blue-600 border-blue-500"
                        : "bg-white border-gray-300  text-black  hover:bg-gray-100"
                    } transition`}
                  >
                    <DeepThinkIcon className={"size-4"} />
                    <span className="text-sm select-none">深度思考</span>
                  </button>
                  <button
                    onClick={async () => await handleSendMessage()}
                    className="size-9 mb-1 bg-indigo-600 text-white rounded-full hover:bg-indigo-500"
                  >
                    <ArrowUpIcon className={"size-9"} />
                  </button>
                </div>
              </div>
            </div>
            <div className="absolute bottom-0 w-[70%] md:pt-0 bg-gray-50 flex flex-grow">
              <div class="text-gray-800 mt-auto flex min-h-8 w-full items-center justify-center  text-center text-xs">
                <div>AI助手也可能会犯错, 请核查重要信息。</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ChatPage;
