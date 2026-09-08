import { plans } from "./data";

export function Pricing() {
  return <section className="pricing section-shell" id="pricing"><div className="center-heading"><p className="section-kicker">✦ Choose your plan</p><h2>Own Your <span>aibox</span></h2><p>Choose the plan that fits your business. All are shipped worldwide.</p></div><div className="plans-grid">{plans.map((plan) => <article className={`plan-card ${plan.featured ? "plan-featured" : ""}`} key={plan.name}><p className="plan-name">{plan.name}</p><strong className="plan-price">{plan.price}<small>/mo</small></strong><ul>{plan.features.map((feature) => <li key={feature}>✓ {feature}</li>)}</ul><a className="button button-dark" href="#contact">Primary Button</a></article>)}</div></section>;
}
