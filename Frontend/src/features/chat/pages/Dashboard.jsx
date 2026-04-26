import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useSelector } from "react-redux";
import { useChat } from "../hooks/useChat";
import remarkGfm from "remark-gfm";

const Dashboard = () => {
  const chat = useChat();
  const [chatInput, setChatInput] = useState("");
  const chats = useSelector((state) => state.chat.chats);
  const currentChatId = useSelector((state) => state.chat.currentChatId);

  useEffect(() => {
    chat.initializeSocketConnection();
    chat.handleGetChats();
  }, []);

  const handleSubmitMessage = (event) => {
    event.preventDefault();
    const trimmedMessage = chatInput.trim();
    if (!trimmedMessage) return;
    chat.handleSendMessage({ message: trimmedMessage, chatId: currentChatId });
    setChatInput("");
  };

  const openChat = (chatId) => {
    chat.handleOpenChat(chatId, chats);
  };

  return (
    <main className="h-screen w-full bg-[#18181a] flex font-sans overflow-hidden">
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-white/[0.06] bg-[#101011] px-4 py-6 overflow-hidden">
     
     
        <div className="flex items-center gap-2.5 mb-8 px-1">
          <div className="w-8 h-8 rounded-lg bg-[#ffff] flex items-center justify-center shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              shape-rendering="geometricPrecision"
              text-rendering="geometricPrecision"
              image-rendering="optimizeQuality"
              fill-rule="evenodd"
              clip-rule="evenodd"
              viewBox="0 0 512 509.64"
            >
              <path
                fill="#1F1F1F"
                d="M115.613 0h280.774C459.974 0 512 52.025 512 115.612v278.415c0 63.587-52.026 115.613-115.613 115.613H115.613C52.026 509.64 0 457.614 0 394.027V115.612C0 52.025 52.026 0 115.613 0z"
              />
              <path
                fill="#fff"
                fill-rule="nonzero"
                d="M348.851 128.063l-68.946 58.302h68.946v-58.302zm-83.908 48.709l100.931-85.349v94.942h32.244v143.421h-38.731v90.004l-94.442-86.662v83.946h-17.023v-83.906l-96.596 86.246v-89.628h-37.445V186.365h38.732V90.768l95.309 84.958v-83.16h17.023l-.002 84.206zm-29.209 26.616c-34.955.02-69.893 0-104.83 0v109.375h20.415v-27.121l84.415-82.254zm41.445 0l82.208 82.324v27.051h21.708V203.388c-34.617 0-69.274.02-103.916 0zm-42.874-17.023l-64.669-57.646v57.646h64.669zm13.617 124.076v-95.2l-79.573 77.516v88.731l79.573-71.047zm17.252-95.022v94.863l77.19 70.83c0-29.485-.012-58.943-.012-88.425l-77.178-77.268z"
              />
            </svg>{" "}
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-white/90">
            Perplexity
          </span>
        </div>

        <button
          type="button"
          className="flex items-center gap-2 mb-6 px-3 py-2 rounded-lg border border-white/10 text-white/50 text-[13px] hover:border-white/20 hover:text-white/70 transition-all duration-150 group"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 13 13"
            fill="none"
            className="opacity-60 group-hover:opacity-90"
          >
            <path
              d="M6.5 1.5V11.5M1.5 6.5H11.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          New Chat
        </button>

        <p className="text-[10px] uppercase tracking-widest text-white/25 font-medium mb-2 px-1">
          Recents
        </p>

        <nav className="flex flex-col gap-0.5 overflow-y-auto flex-1">
          {Object.values(chats).map((c, index) => (
            <button
              key={index}
              type="button"
              onClick={() => openChat(c.id)}
              className={`group w-full text-left px-3 py-2 rounded-lg text-[13px] transition-all duration-150 truncate
                ${
                  c.id === currentChatId
                    ? "bg-white/[0.08] text-white font-medium"
                    : "text-white/45 hover:bg-white/[0.05] hover:text-white/75"
                }`}
            >
              {c.title}
            </button>
          ))}
        </nav>

        <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center gap-2.5 px-1">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 shrink-0" />
          <span className="text-[12px] text-white/40 truncate">My Account</span>
        </div>
      </aside>

      <section className="flex flex-col flex-1 min-w-0 relative">
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2">
            <div className="md:hidden w-6 h-6 rounded-md bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center">
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 1L12.5 4.5V9.5L7 13L1.5 9.5V4.5L7 1Z"
                  fill="white"
                  fillOpacity="0.9"
                />
              </svg>
            </div>
            <span className="text-[13px] text-white/30 hidden md:block">
              Perplexity
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[11px] text-white/70 font-medium tracking-wide
transition-all duration-200 ease-out hover:bg-red-500/10 hover:border-red-400/40 hover:text-red-300 hover:shadow-lg hover:shadow-red-500/20 hover:scale-105 active:scale-95"
            >
              Delete
            </button>
          </div>
        </header>


        <div className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-16 xl:px-32 py-8 space-y-6 pb-40">
          {chats[currentChatId]?.messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role !== "user" && (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center shrink-0 mt-0.5">
                  <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M7 1L12.5 4.5V9.5L7 13L1.5 9.5V4.5L7 1Z"
                      fill="white"
                      fillOpacity="0.85"
                    />
                  </svg>
                </div>
              )}

              <div
                className={`max-w-[72%] text-[14px] leading-relaxed
                  ${
                    message.role === "user"
                      ? "bg-white/[0.07] border border-white/[0.09] text-white/85 rounded-2xl rounded-tr-sm px-4 py-3"
                      : "text-white/80"
                  }`}
              >
                {message.role === "user" ? (
                  <p>{message.content}</p>
                ) : (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => (
                        <p className="mb-3 last:mb-0 text-white/75">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="mb-3 list-disc pl-5 space-y-1 text-white/70">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="mb-3 list-decimal pl-5 space-y-1 text-white/70">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="text-[13.5px]">{children}</li>
                      ),
                      h1: ({ children }) => (
                        <h1 className="text-base font-semibold text-white/90 mb-2 mt-4">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-[14px] font-semibold text-white/85 mb-2 mt-3">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-[13px] font-semibold text-white/80 mb-1 mt-2">
                          {children}
                        </h3>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-white/90">
                          {children}
                        </strong>
                      ),
                      code: ({ children, className }) => {
                        const isBlock = className?.includes("language-");
                        return isBlock ? (
                          <code className="block">{children}</code>
                        ) : (
                          <code className="rounded-md bg-white/[0.08] border border-white/[0.06] px-1.5 py-0.5 text-[12.5px] font-mono text-violet-300">
                            {children}
                          </code>
                        );
                      },
                      pre: ({ children }) => (
                        <pre className="mb-3 overflow-x-auto rounded-xl bg-white/[0.04] border border-white/[0.07] p-4 text-[12.5px] font-mono text-white/65">
                          {children}
                        </pre>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-violet-500/40 pl-3 my-2 text-white/55 italic">
                          {children}
                        </blockquote>
                      ),
                    }}
                    remarkPlugins={[remarkGfm]}
                  >
                    {message.content}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── Input Footer ── */}
        <div className="absolute bottom-0 left-0 right-0 px-4 md:px-8 lg:px-16 xl:px-32 pb-6 pt-4 bg-gradient-to-t from-[#0a0c10] via-[#0a0c10]/95 to-transparent">
          <form
            onSubmit={handleSubmitMessage}
            className="flex items-end gap-2 bg-[#151618] border border-white/[0.09] rounded-2xl px-4 py-3 focus-within:border-white/20 transition-colors duration-200 shadow-xl shadow-black/30"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask anything..."
              className="flex-1 bg-transparent text-[14px] text-white/85 placeholder-white/20 outline-none py-0.5 min-h-[24px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) handleSubmitMessage(e);
              }}
            />

            <button
              type="submit"
              disabled={!chatInput.trim()}
              className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150
                ${
                  chatInput.trim()
                    ? "bg-gradient-to-br from-[#8e91df] to-[#1c1c1c] text-white hover:opacity-90 active:scale-95"
                    : "bg-white/[0.05] text-white/20 cursor-not-allowed"
                }`}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path
                  d="M6.5 11V2M2 6.5L6.5 2L11 6.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </form>
        </div>
      </section>
    </main>
  );
};

export default Dashboard;
