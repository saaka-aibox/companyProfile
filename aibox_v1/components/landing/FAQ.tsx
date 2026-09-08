import { faqs } from "./data";

export function FAQ() {
  return <section className="faq section-shell" id="faq"><div className="center-heading"><p className="section-kicker">✦ Need to know</p><h2>Frequently Asked <span>Questions</span></h2></div><div className="faq-list">{faqs.map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div></section>;
}
