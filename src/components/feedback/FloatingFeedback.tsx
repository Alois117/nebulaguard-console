import { useState, useCallback, useEffect, useRef } from "react";
import { MessageSquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import FeedbackForm from "./FeedbackForm";

const FloatingFeedback = () => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => {
    setIsOpen(false);
    window.setTimeout(() => buttonRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, close]);

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

  // Add focus trap for accessibility
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;

    const focusableElements = panelRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    panelRef.current.addEventListener("keydown", handleTab);
    firstElement.focus();

    return () => {
      panelRef.current?.removeEventListener("keydown", handleTab);
    };
  }, [isOpen]);

  return (
    <>
      <Button
        ref={buttonRef}
        onClick={() => setIsOpen((open) => !open)}
        className={`
          fixed rounded-full neon-button
          bottom-[72px] right-4 h-11 w-11
          sm:bottom-[78px] sm:right-5 sm:h-12 sm:w-12
          md:bottom-[88px] md:right-6 md:h-12 md:w-12
          ${isOpen ? 'z-[70]' : 'z-50'}
        `}
        aria-label={isOpen ? "Close Feedback" : "Open Feedback"}
      >
        {isOpen ? (
          <X className="h-4 w-4 md:h-5 md:w-5" />
        ) : (
          <MessageSquarePlus className="h-4 w-4 md:h-5 md:w-5" />
        )}
      </Button>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/10"
          onClick={close}
          aria-hidden="true"
        />
      )}
      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Feedback form"
          aria-modal="true"
          className="
            fixed z-[60] flex flex-col overflow-hidden
            right-4 bottom-[126px]
            w-[calc(100vw-2rem)] max-w-[92vw]
            sm:right-5 sm:bottom-[136px] sm:w-[360px]
            md:right-6 md:bottom-[146px] md:w-[380px]
            lg:w-[400px]
            xl:w-[420px]
            max-h-[calc(100dvh-9rem)]
            sm:max-h-[calc(100dvh-10rem)]
            glass-card rounded-xl lg:rounded-2xl
            border border-border/50 shadow-2xl
          "
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border/30 px-4 py-3 sm:px-5 sm:py-4">
            <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-foreground">
              Feedback
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9 shrink-0"
              onClick={close}
              aria-label="Close feedback"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4 overscroll-contain [scrollbar-gutter:stable]">
            <p className="mb-3 sm:mb-4 text-xs sm:text-sm text-muted-foreground">
              Please provide feedback on the user experience.
            </p>
            <FeedbackForm onClose={close} />
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingFeedback;