import { useState } from "react";
import { MessageCircle, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatDrawer from "./ChatDrawer";

const FloatingAIChat = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full neon-button shadow-lg hover-lift z-50"
        aria-label="Open AI Chat"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <div className="relative">
            <MessageCircle className="w-6 h-6" />
            <Sparkles className="w-3 h-3 text-accent absolute -top-1 -right-1 animate-pulse-glow" />
          </div>
        )}
      </Button>

      <ChatDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default FloatingAIChat;
