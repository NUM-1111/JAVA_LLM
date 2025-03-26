import { useNavigate } from "react-router-dom";
import { useState } from "react";
import SideBar from "./Sidebar";
import { DeepThinkIcon, ArrowUpIcon } from "./svg-icons";
import HeadBar from "./HeadBar";

function NewChatPage() {
  const navigate = useNavigate(); // 获取导航函数

  // 控制模型选择
  const [selectedCode, setSelectedCode] = useState(2);
  const [deepThink, setDeepThink] = useState(true);
  const [text, setText] = useState(""); // 存储 textarea 内容

  const [isOpen, setIsOpen] = useState(false); // 控制侧边栏展开/折叠

  const handleSendMessage = () => {
    if (!text.trim()) return; // 防止发送空消息
    const message = {
      author: { role: "user" },
      content: {
        content_type: "text",
        text: text,
      },
      status: "finished_successfully",
    };
    const conversationId = crypto.randomUUID();
    const userMessage = {
      message: message,
      message_id: crypto.randomUUID(),
      conversation_id: conversationId,
      parent: "client-created-root",
      children: [],
      created_at: new Date().toISOString(),
    };
    navigate(`/c/${conversationId}`, {
      state: {
        initialMessage: userMessage,
        selectedCode: selectedCode,
        useDeepTink: deepThink,
      },
    });
  };

  return (
    <div className="flex flex-row  max-h-screen bg-gray-100 gap-2">
      {/*侧边栏部分 */}
      <SideBar isOpen={isOpen} setIsOpen={setIsOpen} />
      {isOpen && <div className="absolute left-0 z-20 bg-black opacity-20 w-full lg:w-0 h-full"> </div>}
      {/*对话部分*/}
      <div
        className={`${
          isOpen ? "w-full lg:w-4/5" : "w-full"
        } flex flex-col h-full max-h-screen bg-gray-100 relative`}
      >
        {/* 头部导航栏 - 固定在主内容顶部 */}
        <HeadBar
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          selectedCode={selectedCode}
          setSelectedCode={setSelectedCode}
        />

        {/* 可滚动的主内容区域 */}
        <main className="flex-grow h-screen overflow-auto flex flex-col">
          <div className="flex flex-col text-base mx-5 items-center mt-44 gap-5 flex-grow">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-indigo-600 to-indigo-500 leading-[34px] tracking-[0.38px] select-none">
              有什么可以帮忙的?
            </h1>

            <div
              id="InputContainer"
              className="flex flex-col h-auto w-[90%] rounded-3xl border shadow-md border-gray-200 bg-gray-50 
                 md:static md:w-7/12 
                 absolute bottom-5 px-4 py-1 md:py-2"
            >
              <div className="mx-3 mt-1 flex flex-col bg-inherit mb-2">
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
                onKeyDown={(e) => {
                  // 如果按下 Enter 键
                  if (e.key === "Enter") {
                    if (!e.shiftKey) {
                      // 如果没有按下 Shift 键，触发发送
                      e.preventDefault(); // 防止换行
                      handleSendMessage(); // 调用发送消息的函数
                      e.target.style.height = "auto";
                    } else {
                      // 如果按下了 Shift 键，允许换行
                      e.stopPropagation(); // 防止事件传播，确保换行
                    }
                  }
                }}
              ></textarea>
                <div className="w-full flex justify-between  md:mt-2">
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
                    onClick={() => handleSendMessage()}
                    className="size-9 bg-indigo-600 text-white rounded-full hover:bg-indigo-500"
                  >
                    <ArrowUpIcon className={"size-9"} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default NewChatPage;
