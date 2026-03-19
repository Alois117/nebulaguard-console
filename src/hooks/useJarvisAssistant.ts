import { useState, useCallback } from "react";
import { useAuthenticatedFetch } from "@/keycloak/hooks/useAuthenticatedFetch";
import { WEBHOOK_AI_CHAT_URL } from "@/config/env";
import { safeParseResponse } from "@/lib/safeFetch";

type AIChatPayload = {
  answer_markdown: string;
  followups?: string[];
};

// Webhook may return either an object OR an array (your current webhook returns an array)
type WebhookAIResponse = AIChatPayload | AIChatPayload[];

interface UseJarvisAssistantReturn {
  sendMessage: (message: string) => Promise<{ message: string; followups?: string[] } | null>;
  isLoading: boolean;
  error: string | null;
}

const useJarvisAssistant = (): UseJarvisAssistantReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { authenticatedFetch } = useAuthenticatedFetch();

  const sendMessage = useCallback(
    async (message: string): Promise<{ message: string; followups?: string[] } | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await authenticatedFetch(WEBHOOK_AI_CHAT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        });

        const result = await safeParseResponse<WebhookAIResponse>(response, WEBHOOK_AI_CHAT_URL);
        if (!result.ok) {
          throw new Error(result.userMessage);
        }

        const raw = result.data;

        // Normalize: if webhook returns an array, use the first item
        const data: AIChatPayload | undefined = Array.isArray(raw) ? raw[0] : raw;

        return {
          message: data?.answer_markdown?.trim() || "I received your message but couldn't generate a response.",
          followups: Array.isArray(data?.followups) && data.followups.length > 0 ? data.followups : undefined,
        };
      } catch (err) {
        const safe =
          err instanceof Error ? err.message : "The AI assistant is temporarily unavailable. Please try again.";
        console.error("[useJarvisAssistant] Error:", err);
        setError(safe);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [authenticatedFetch]
  );

  return { sendMessage, isLoading, error };
};

export default useJarvisAssistant;