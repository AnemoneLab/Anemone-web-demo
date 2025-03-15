import { Text } from "@radix-ui/themes";
import { useState, useRef, useEffect } from "react";
import { PaperPlaneIcon, ReloadIcon } from "@radix-ui/react-icons";
import { useParams } from "react-router-dom";
import { apiClient } from './api/apiClient';
import { AgentSidebar } from './components/AgentSidebar';

interface Message {
  role: "user" | "assistant";
  content: string;
  id: string; // 添加唯一ID
}

export function Chat() {
  const { roleId } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 生成唯一ID
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  };

  // 自动滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 自动调整文本框高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !roleId) return;

    const userMessage = input.trim();
    setInput("");
    
    // 重置文本区域高度
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // 添加用户消息
    setMessages(prev => [...prev, { role: "user", content: userMessage, id: generateId() }]);
    setIsLoading(true); // 设置加载状态

    // 添加等待消息
    const loadingMessageId = generateId();
    setMessages(prev => [...prev, { role: "assistant", content: "Loading...", id: loadingMessageId }]);

    try {
      const data = await apiClient.sendMessage(roleId, userMessage);
      
      // 处理新的API响应格式
      if (data.success && data.response) {
        // 更新消息，替换等待消息
        setMessages(prev => {
          const updatedMessages = prev.filter(msg => msg.id !== loadingMessageId); // 移除等待消息
          return [...updatedMessages, {
            role: "assistant",
            content: data.response.text || "无回复内容",
            id: generateId()
          }];
        });
      } else {
        throw new Error("API返回错误响应");
      }
    } catch (error) {
      console.error("发送消息失败:", error);
      setMessages(prev => {
        const updatedMessages = prev.filter(msg => msg.id !== loadingMessageId); // 移除等待消息
        return [...updatedMessages, {
          role: "assistant",
          content: error instanceof Error ? error.message : "抱歉，发送消息失败，请稍后重试。",
          id: generateId()
        }];
      });
    } finally {
      setIsLoading(false); // 结束加载状态
    }
  };

  return (
    <div className="chat-wrapper">
      {/* 侧边栏 */}
      <aside className="agent-sidebar">
        <AgentSidebar />
      </aside>

      {/* 聊天主界面 */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* 顶部导航栏 */}
        <header className="chat-header">
          <Text className="chat-title">Agent Chat</Text>
        </header>

        {/* 消息区域 - 使用最大高度并允许滚动 */}
        <div className="flex-1 overflow-y-auto py-6 px-4 md:px-8 chat-messages-container">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.length === 0 ? (
              <div className="empty-chat-state">
                <div className="empty-chat-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 3H5C3.89543 3 3 3.89543 3 5V15C3 16.1046 3.89543 17 5 17H8L11.6464 20.6464C11.8417 20.8417 12.1583 20.8417 12.3536 20.6464L16 17H19C20.1046 17 21 16.1046 21 15V5C21 3.89543 20.1046 3 19 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="empty-chat-title">开始与您的 Agent 对话</h3>
                <p className="empty-chat-description">发送消息，Agent 将回复您的问题和请求</p>
              </div>
            ) : (
              messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} message-animation`}
                >
                  <div 
                    className={`message-bubble ${
                      message.role === "user" 
                        ? "user" 
                        : (message.content === "Loading..." 
                          ? "loading" 
                          : "assistant")
                    } px-4 py-3`}
                  >
                    {message.content === "Loading..." ? (
                      <div className="thinking-animation">
                        <span>Agent 正在思考</span>
                        <div className="thinking-dot"></div>
                        <div className="thinking-dot"></div>
                        <div className="thinking-dot"></div>
                      </div>
                    ) : (
                      <div className="message-content markdown-container">{message.content}</div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 底部输入区域 - 固定在底部 */}
        <footer className="border-t border-gray-700 bg-gray-800 p-4">
          <form 
            onSubmit={handleSubmit}
            className="max-w-3xl mx-auto"
          >
            <div className="chat-input-container">
              <textarea
                ref={textareaRef}
                className="chat-textarea"
                placeholder="输入消息..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button
                type="submit"
                className="chat-send-button"
                disabled={isLoading || !input.trim()}
              >
                <PaperPlaneIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="chat-input-hint">
              按 Enter 发送，按 Shift+Enter 换行
            </div>
          </form>
        </footer>
      </main>
    </div>
  );
} 