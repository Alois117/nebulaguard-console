import { useState } from "react";
import { MessageCircle, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatDrawer from "./ChatDrawer";

const FloatingAIChat = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen((prev) => !prev)}
        className="
          fixed z-50 rounded-full neon-button
          bottom-4 right-4
          h-12 w-12
          sm:bottom-5 sm:right-5
          sm:h-13 sm:w-13
          md:bottom-6 md:right-6
          md:h-14 md:w-14
        "
        aria-label={isOpen ? "Close AI Chat" : "Open AI Chat"}
      >
        {isOpen ? (
          <X className="h-5 w-5 md:h-6 md:w-6" />
        ) : (
          <div className="relative">
            <MessageCircle className="h-5 w-5 md:h-6 md:w-6" />
            <Sparkles className="absolute -right-1 -top-1 h-2 w-2 md:h-3 md:w-3 text-accent animate-pulse-glow" />
          </div>
        )}
      </Button>

      <ChatDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default FloatingAIChat;