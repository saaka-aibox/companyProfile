"use client";

import { ArrowUpRight, Check, CircleAlert } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";

const FORM_ENDPOINT = process.env.NEXT_PUBLIC_FORMSPREE_ENDPOINT || "https://formspree.io/f/xyzzypra";

type Feedback = { type: "success" | "error"; message: string };
type FormspreeError = { errors?: { message?: string }[] };

async function submissionError(response: Response): Promise<string> {
  if (response.status === 429) return "Too many messages were sent just now. Please wait a moment and try again.";
  if (response.headers.get("content-type")?.includes("application/json")) {
    const details = await response.json().catch(() => null) as FormspreeError | null;
    const message = details?.errors?.find((item) => item.message)?.message;
    if (message) return message;
  }
  return "We couldn't send your message. Please check your details and try again.";
}

export function EventEnquiry() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const submittingRef = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    const form = event.currentTarget;
    const values = new FormData(form);
    const value = (name: string) => String(values.get(name) ?? "").trim();

    submittingRef.current = true;
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          name: value("name"),
          email: value("email"),
          eventType: value("eventType"),
          date: value("date"),
          location: value("location"),
          message: value("message"),
        }),
      });

      if (!response.ok) {
        setFeedback({ type: "error", message: await submissionError(response) });
        return;
      }

      form.reset();
      setFeedback({ type: "success", message: "Thanks, your message was sent. We'll be in touch soon." });
    } catch {
      setFeedback({ type: "error", message: "We couldn't connect to the message service. Check your connection and try again." });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <form className="profile-enquiry" action={FORM_ENDPOINT} method="POST" onSubmit={handleSubmit} id="event-brief" aria-busy={isSubmitting}>
      <div className="profile-form-heading"><span className="profile-micro">your event brief</span><h2>Tell us a little.</h2><p>We’ll help you take it from there.</p></div>
      <div className="profile-form-grid">
        <label>Your name<input name="name" autoComplete="name" placeholder="How should we call you?" required maxLength={100} /></label>
        <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@company.com" required maxLength={200} /></label>
        <label>
          <span id="event-type-label">What are you planning?</span>
          <select name="eventType" aria-labelledby="event-type-label" defaultValue="" required>
            <option value="" disabled>Select an occasion</option>
            <option>Wedding or celebration</option>
            <option>Brand activation</option>
            <option>Corporate event</option>
            <option>Venue or attraction</option>
            <option>Something else</option>
          </select>
        </label>
        <label>Event date <span className="profile-field-optional">(optional)</span><input name="date" type="date" /></label>
        <label className="profile-field-wide">Location <span className="profile-field-optional">(optional)</span><input name="location" autoComplete="address-level2" placeholder="City or venue" maxLength={160} /></label>
        <label className="profile-field-wide">What do you have in mind?<textarea name="message" placeholder="The occasion, your guests, the feeling you want to create…" rows={4} required maxLength={2000} /></label>
      </div>
      <button className="button button-primary" type="submit" disabled={isSubmitting}>{isSubmitting ? "Sending…" : "Send my enquiry"} {!isSubmitting && <ArrowUpRight size={16} aria-hidden="true" />}</button>
      <p className="profile-note">Your enquiry goes directly to the AIBox team.</p>
      {feedback && <div className="profile-enquiry-result" data-state={feedback.type} role={feedback.type === "error" ? "alert" : "status"}>
        {feedback.type === "success" ? <Check size={19} aria-hidden="true" /> : <CircleAlert size={19} aria-hidden="true" />}
        <p>{feedback.message}</p>
      </div>}
    </form>
  );
}
