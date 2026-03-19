import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useJarvisAssistant from "@/hooks/useJarvisAssistant";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
  followups?: string[];
}

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatDrawer = ({ isOpen }: ChatDrawerProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your AI assistant. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { sendMessage, isLoading } = useJarvisAssistant();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (!isOpen) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [isOpen]);

  const handleSend = async (text?: string) => {
    const userText = text || input.trim();
    if (!userText || isLoading) return;

    const userMessage: Message = { role: "user", content: userText };
    setMessages((prev) => [...prev, userMessage]);

    if (!text) setInput("");

    try {
      const response = await sendMessage(userText);

      if (response) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: response.message,
            followups: response.followups,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "I'm having trouble connecting right now. Please try again later.",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Something went wrong while sending your message. Please try again.",
        },
      ]);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="
        fixed z-50 flex flex-col overflow-hidden
        bottom-20 right-4
        sm:bottom-24 sm:right-6
        w-[calc(100vw-2rem)]
        sm:w-[420px]
        md:w-[520px]
        lg:w-[620px]
        xl:w-[720px]
        2xl:w-[800px]
        max-w-[92vw]
        h-[70vh]
        sm:h-[72vh]
        lg:h-[74vh]
        glass-card rounded-xl lg:rounded-2xl
        border border-primary/20 shadow-xl
        animate-scale-in
      "
      role="dialog"
      aria-label="AI Assistant Chat"
      aria-modal="true"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="rounded-lg bg-primary/10 p-2 sm:p-2.5 shrink-0">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary glow-primary" />
          </div>

          <div className="min-w-0">
            <h3 className="truncate font-semibold text-sm sm:text-base lg:text-lg">
              Avis AI
            </h3>
            <p className="truncate text-xs sm:text-sm text-muted-foreground">
              Your AI Assistant
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-smooth [scrollbar-gutter:stable] px-3 py-3 sm:px-4 sm:py-4 space-y-3 sm:space-y-4"
        style={{ overscrollBehavior: "contain" }}
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex animate-fade-in ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`rounded-lg lg:rounded-xl p-3 sm:p-4 text-sm sm:text-base shadow-sm max-w-[88%] lg:max-w-[82%] xl:max-w-[78%] ${
                message.role === "user"
                  ? "bg-primary/20 border border-primary/30"
                  : "glass-card border border-border"
              }`}
            >
              {message.role === "assistant" && (
                <div className="flex items-center gap-1.5 mb-2">
                  <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                </div>
              )}

              {message.role === "assistant" ? (
                <div className="prose prose-invert max-w-none text-sm sm:text-base lg:text-[17px] leading-relaxed break-words">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: (props) => (
                        <h1
                          className="mb-2 text-lg sm:text-xl font-semibold"
                          {...props}
                        />
                      ),
                      h2: (props) => (
                        <h2
                          className="mb-2 text-base sm:text-lg font-semibold"
                          {...props}
                        />
                      ),
                      h3: (props) => (
                        <h3
                          className="mb-2 text-sm sm:text-base font-semibold"
                          {...props}
                        />
                      ),
                      p: (props) => (
                        <p className="my-1 whitespace-pre-wrap" {...props} />
                      ),
                      ul: (props) => (
                        <ul className="my-1 list-disc pl-5" {...props} />
                      ),
                      ol: (props) => (
                        <ol className="my-1 list-decimal pl-5" {...props} />
                      ),
                      li: (props) => <li className="my-0.5" {...props} />,
                      strong: (props) => (
                        <strong className="font-semibold" {...props} />
                      ),
                      em: (props) => <em className="italic" {...props} />,
                      a: (props) => (
                        <a
                          className="underline underline-offset-2 break-all"
                          target="_blank"
                          rel="noreferrer"
                          {...props}
                        />
                      ),
                      code: ({ className, children, ...props }) => {
                        const isBlock =
                          typeof className === "string" &&
                          className.includes("language-");

                        if (isBlock) {
                          return (
                            <pre className="overflow-x-auto rounded-md border border-primary/20 bg-primary/10 p-2 sm:p-3">
                              <code className={className} {...props}>
                                {children}
                              </code>
                            </pre>
                          );
                        }

                        return (
                          <code
                            className="rounded border border-primary/20 bg-primary/10 px-1 py-0.5"
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words leading-relaxed text-sm sm:text-base lg:text-[17px]">
                  {message.content}
                </p>
              )}

              {message.role === "assistant" &&
                message.followups &&
                message.followups.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-border/50 pt-3">
                    {message.followups.map((followup, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(followup)}
                        disabled={isLoading}
                        className="rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1.5 text-xs sm:text-sm text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                      >
                        {followup}
                      </button>
                    ))}
                  </div>
                )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start animate-fade-in">
            <div className="glass-card rounded-lg border border-border p-3">
              <div className="flex gap-1.5">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <div
                  className="h-2 w-2 rounded-full bg-primary animate-pulse"
                  style={{ animationDelay: "0.2s" }}
                />
                <div
                  className="h-2 w-2 rounded-full bg-primary animate-pulse"
                  style={{ animationDelay: "0.4s" }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 sm:gap-3 border-t border-border px-3 py-3 sm:px-4 sm:py-4">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask me anything..."
          className="glass-input flex-1 h-10 sm:h-11 text-sm sm:text-base"
          disabled={isLoading}
          aria-label="Type your message"
        />

        <Button
          onClick={() => handleSend()}
          className="neon-button h-10 sm:h-11 px-3 sm:px-4 shrink-0"
          disabled={isLoading}
          aria-label="Send message"
        >
          <Send className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>
    </div>
  );
};

export default ChatDrawer;