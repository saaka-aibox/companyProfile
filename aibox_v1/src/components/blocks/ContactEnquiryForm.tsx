"use client";

import type { FormEvent } from "react";

export function ContactEnquiryForm({ email, buttonClass }: { email: string; buttonClass: string }) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const fields = new FormData(event.currentTarget);
    const subject = encodeURIComponent(`AIBOX enquiry from ${String(fields.get("name") || "website visitor")}`);
    const body = encodeURIComponent(
      Array.from(fields.entries())
        .map(([name, value]) => `${name}: ${String(value)}`)
        .join("\n"),
    );

    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <div className="contact-fields">
        <label>
          <span>Your name</span>
          <input name="name" autoComplete="name" placeholder="Name" required />
        </label>
        <label>
          <span>Work email</span>
          <input name="email" type="email" autoComplete="email" placeholder="you@company.com" required />
        </label>
        <label>
          <span>Event or venue</span>
          <input name="event" placeholder="Tell us where you imagine MagicBooth" />
        </label>
        <label>
          <span>Phone (optional)</span>
          <input name="phone" type="tel" autoComplete="tel" placeholder="+62" />
        </label>
        <label className="contact-message-field">
          <span>What are you planning?</span>
          <textarea name="message" rows={4} placeholder="Share a little about your event, venue, or business." required />
        </label>
      </div>
      <button className={buttonClass} type="submit">Send an enquiry <span aria-hidden="true">↗</span></button>
      <p className="contact-form-note">Your email app will open with your enquiry ready to send.</p>
    </form>
  );
}
