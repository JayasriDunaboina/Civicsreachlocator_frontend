import { Link } from "react-router-dom";
import "./AboutPage.css";

export function AboutPage() {
  return (
    <div className="about-page">
      <h1 className="page-title">About Public Service Access System</h1>
      <section className="about-block">
        <h2>What we do</h2>
        <p>
          Public Service Access System helps you find trusted local service providers—tailors, electricians, cobblers, and more—based on your location. Results are sorted by distance and ranked by community verification, so you can choose with confidence.
        </p>
      </section>
      <section className="about-block">
        <h2>Community trust</h2>
        <p>
          Providers earn a trust badge through community-submitted photos and confirmations. The more verified signals, the higher the trust score. We prioritise authenticity and accountability over paid listings.
        </p>
      </section>
      <section className="about-block">
        <h2>How it works</h2>
        <ol>
          <li>Share your location to search nearby.</li>
          <li>Filter by service type and search radius.</li>
          <li>View provider details, opening hours, and trust score.</li>
          <li>Save providers you like and contact them directly.</li>
        </ol>
      </section>
      <section className="about-block">
        <h2>For local economies</h2>
        <p>
          CivicReach supports informal and neighbourhood service economies. We don’t replace direct contact with providers; we help you discover and reach them.
        </p>
      </section>
      <p className="about-back">
        <Link to="/">← Back to Home</Link>
      </p>
    </div>
  );
}
