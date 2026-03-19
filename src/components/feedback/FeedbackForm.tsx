import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle } from "lucide-react";
import { useFeedback, type FeedbackPayload } from "@/hooks/useFeedback";

const DEPARTMENTS = ["IT", "Projects", "Accounts", "Executive", "Sales"] as const;
const MAX_NAME_LENGTH = 80;
const MAX_EMAIL_LENGTH = 120;
const MAX_FEEDBACK_LENGTH = 2000;

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();
const sanitizeText = (value: string) =>
  value.replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
const sanitizeMultilineText = (value: string) =>
  value.replace(/[<>]/g, "").replace(/\r/g, "").trim();

const isValidFullName = (value: string) => {
  const normalized = normalizeWhitespace(value);
  if (!normalized) return false;
  if (normalized.length < 2 || normalized.length > MAX_NAME_LENGTH) return false;
  const fullNameRegex =
    /^[A-Za-z]+(?:[.'-]?[A-Za-z]+)*(?:\s+[A-Za-z]+(?:[.'-]?[A-Za-z]+)*)+$/;
  return fullNameRegex.test(normalized);
};

const isValidEmail = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized.length > MAX_EMAIL_LENGTH) return false;
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailRegex.test(normalized);
};

const FeedbackForm = ({ onClose }: { onClose: () => void }) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [feedback, setFeedback] = useState("");
  const [touched, setTouched] = useState(false);
  const { submitFeedback, isSubmitting, error, success, reset } = useFeedback();
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => {
      onClose();
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [success, onClose]);

  const normalizedFullName = useMemo(() => normalizeWhitespace(fullName), [fullName]);
  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const normalizedFeedback = useMemo(() => feedback.trim(), [feedback]);

  const nameError =
    touched && !normalizedFullName
      ? "Full name is required."
      : touched && !isValidFullName(normalizedFullName)
      ? "Enter your first and last name in a valid format."
      : "";
  const emailError =
    touched && !normalizedEmail
      ? "Email is required."
      : touched && !isValidEmail(normalizedEmail)
      ? "Enter a valid email address."
      : "";
  const departmentError = touched && !department ? "Department is required." : "";
  const feedbackError =
    touched && !normalizedFeedback
      ? "Feedback is required."
      : touched && normalizedFeedback.length > MAX_FEEDBACK_LENGTH
      ? `Feedback must be ${MAX_FEEDBACK_LENGTH} characters or fewer.`
      : "";

  const isValid =
    isValidFullName(normalizedFullName) &&
    isValidEmail(normalizedEmail) &&
    !!department &&
    !!normalizedFeedback &&
    normalizedFeedback.length <= MAX_FEEDBACK_LENGTH;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;
    const payload: FeedbackPayload = {
      fullName: sanitizeText(normalizedFullName),
      email: normalizedEmail,
      department,
      feedback: sanitizeMultilineText(normalizedFeedback),
    };
    await submitFeedback(payload);
    setFullName("");
    setEmail("");
    setDepartment("");
    setFeedback("");
    setTouched(false);
  };

  if (success) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 py-6 sm:min-h-[240px] sm:py-8">
        <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 text-[hsl(var(--success))]" />
        <p className="text-center text-sm sm:text-base font-medium text-foreground">
          Thank you for your feedback!
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:gap-3.5" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="fb-name" className="text-xs sm:text-sm text-muted-foreground">
          Full Name
        </Label>
        <Input
          ref={nameRef}
          id="fb-name"
          value={fullName}
          onChange={(e) => {
            reset();
            setFullName(e.target.value);
          }}
          placeholder="John Doe"
          autoComplete="name"
          disabled={isSubmitting}
          maxLength={MAX_NAME_LENGTH}
          className="h-10 sm:h-11 text-sm sm:text-base"
          aria-invalid={!!nameError}
          aria-describedby={nameError ? "fb-name-error" : undefined}
        />
        {nameError && (
          <p id="fb-name-error" className="text-xs text-destructive">
            {nameError}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="fb-email" className="text-xs sm:text-sm text-muted-foreground">
          Email
        </Label>
        <Input
          id="fb-email"
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => {
            reset();
            setEmail(e.target.value);
          }}
          placeholder="john.doe@example.com"
          autoComplete="email"
          disabled={isSubmitting}
          maxLength={MAX_EMAIL_LENGTH}
          className="h-10 sm:h-11 text-sm sm:text-base"
          aria-invalid={!!emailError}
          aria-describedby={emailError ? "fb-email-error" : undefined}
        />
        {emailError && (
          <p id="fb-email-error" className="text-xs text-destructive">
            {emailError}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="fb-dept" className="text-xs sm:text-sm text-muted-foreground">
          Department
        </Label>
        <Select
          value={department}
          onValueChange={(value) => {
            reset();
            setDepartment(value);
          }}
          disabled={isSubmitting}
        >
          <SelectTrigger
            id="fb-dept"
            className="h-10 sm:h-11 text-sm sm:text-base"
            aria-invalid={!!departmentError}
          >
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent className="z-[70]">
            {DEPARTMENTS.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {departmentError && (
          <p className="text-xs text-destructive">{departmentError}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="fb-msg" className="text-xs sm:text-sm text-muted-foreground">
          Feedback
        </Label>
        <Textarea
          id="fb-msg"
          value={feedback}
          onChange={(e) => {
            reset();
            setFeedback(e.target.value);
          }}
          placeholder="Share your thoughts..."
          disabled={isSubmitting}
          maxLength={MAX_FEEDBACK_LENGTH}
          className="min-h-[96px] sm:min-h-[110px] md:min-h-[120px] text-sm sm:text-base resize-none"
          aria-invalid={!!feedbackError}
          aria-describedby={feedbackError ? "fb-msg-error" : "fb-msg-help"}
        />
        <div className="flex items-center justify-between gap-3">
          <p id="fb-msg-help" className="text-[11px] sm:text-xs text-muted-foreground">
            Please be clear and concise.
          </p>
          <p className="text-[11px] sm:text-xs text-muted-foreground">
            {feedback.length}/{MAX_FEEDBACK_LENGTH}
          </p>
        </div>
        {feedbackError && (
          <p id="fb-msg-error" className="text-xs text-destructive">
            {feedbackError}
          </p>
        )}
      </div>
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs sm:text-sm text-destructive">
          {error}
        </p>
      )}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="mt-1 h-11 sm:h-12 w-full neon-button text-sm sm:text-base"
      >
        {isSubmitting ? "Sending..." : "Send Feedback"}
      </Button>
    </form>
  );
};

export default FeedbackForm;