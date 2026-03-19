import { useState, useCallback } from "react";
import { WEBHOOK_FEEDBACK_URL } from "@/config/env";

export interface FeedbackPayload {
  fullName: string;
  email: string;
  department: string;
  feedback: string;
}

interface UseFeedbackReturn {
  submitFeedback: (payload: FeedbackPayload) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
  success: boolean;
  reset: () => void;
}

/**
 * Hook for submitting user feedback to an n8n Webhook Trigger endpoint.
 * Sends JSON (application/json) with only the core feedback fields.
 */
export const useFeedback = (): UseFeedbackReturn => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = useCallback(() => {
    setError(null);
    setSuccess(false);
  }, []);

  const submitFeedback = useCallback(async (payload: FeedbackPayload) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      // Clean inputs (consistent with previous validation/sanitization)
      const cleanFullName   = payload.fullName.trim();
      const cleanEmail      = payload.email.trim().toLowerCase();
      const cleanDepartment = payload.department.trim();
      const cleanFeedback   = payload.feedback.trim();

      const response = await fetch(WEBHOOK_FEEDBACK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: cleanFullName,
          email: cleanEmail,
          department: cleanDepartment,
          feedback: cleanFeedback,
        }),
      });

      if (!response.ok) {
        let details = "";
        try {
          details = await response.text();
        } catch {
          // ignore response parsing failure
        }

        throw new Error(details || `Server responded with ${response.status}`);
      }

      setSuccess(true);
    } catch (err: unknown) {
      const raw =
        err instanceof Error ? err.message : "An unexpected error occurred";

      const friendly =
        raw.toLowerCase().includes("failed to fetch") ||
        raw.toLowerCase().includes("network") ||
        raw.toLowerCase().includes("fetch")
          ? "Unable to reach the feedback service. Please try again later."
          : "Failed to submit feedback. Please try again.";

      setError(friendly);
      console.error("[useFeedback] submitFeedback failed", err);
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return { submitFeedback, isSubmitting, error, success, reset };
};

export default useFeedback;