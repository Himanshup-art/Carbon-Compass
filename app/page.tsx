import Link from "next/link";
import { Logo } from "@/components/logo";

export default function LandingPage() {
  return (
    <div className="landing-shell fade-in">
      {/* Marketing Navbar */}
      <nav className="marketing-nav">
        <div className="navbar-brand">
          <Logo width={34} height={34} />
          <strong className="navbar-title" style={{ marginLeft: 12, fontSize: "1.2rem" }}>Carbon Compass</strong>
        </div>
        <div className="nav-links">
          <Link href="/login" className="nav-link">Log In</Link>
          <Link href="/register" className="btn btn-primary" style={{ padding: "10px 24px" }}>Start Free</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="login-bg-orb login-bg-orb-1" />
        <div className="login-bg-orb login-bg-orb-2" />
        <h1 className="hero-title fade-in-delay-1">Measure your impact. <br/>Master your footprint.</h1>
        <p className="hero-subtitle fade-in-delay-2">
          The most intuitive personal sustainability tracker. Understand your carbon emissions, 
          set reduction goals, and build daily habits that protect the planet.
        </p>
        <div className="hero-actions fade-in-delay-3">
          <Link href="/register" className="btn btn-primary btn-large">Create Free Account</Link>
          <a href="#features" className="btn btn-secondary btn-large">See How It Works</a>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="features-section">
        <h2 className="hero-title" style={{ fontSize: "2.5rem", margin: "0 auto 16px" }}>Everything you need to go green.</h2>
        <p className="hero-subtitle" style={{ margin: "0 auto", maxWidth: 600 }}>We translate confusing carbon metrics into actionable, real-world data.</p>
        
        <div className="features-grid">
          <article className="feature-card">
            <div className="feature-icon">📊</div>
            <h3 className="feature-title">Beautiful Dashboard</h3>
            <p className="feature-desc">Visualize your emissions across travel, home energy, and diet in real-time with stunning, presentation-ready charts.</p>
          </article>
          <article className="feature-card">
            <div className="feature-icon">🌳</div>
            <h3 className="feature-title">Real-World Equivalencies</h3>
            <p className="feature-desc">Stop looking at abstract numbers. We show you exactly how many trees it takes to offset your footprint.</p>
          </article>
          <article className="feature-card">
            <div className="feature-icon">☁️</div>
            <h3 className="feature-title">Cloud Synced</h3>
            <p className="feature-desc">Your history is securely synced to the cloud. Access your check-ins and trend data from anywhere, on any device.</p>
          </article>
        </div>
      </section>

      {/* Final CTA */}
      <section className="cta-section">
        <h2 className="cta-title">Ready to reduce your impact?</h2>
        <p className="cta-desc">Join thousands of conscious citizens actively tracking their emissions and making a difference.</p>
        <Link href="/register" className="btn btn-primary btn-large" style={{ background: "#fff", color: "var(--green-800)" }}>Get Started Today</Link>
      </section>

      {/* Footer */}
      <footer className="app-footer">
        <p style={{ marginBottom: 12 }}>Carbon Compass © {new Date().getFullYear()} · Dedicated to a sustainable future</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 24, fontSize: "0.9rem" }}>
          <Link href="/terms" style={{ color: "var(--text-secondary)", textDecoration: "underline" }}>Terms of Service</Link>
          <Link href="/privacy" style={{ color: "var(--text-secondary)", textDecoration: "underline" }}>Privacy Policy</Link>
        </div>
      </footer>
    </div>
  );
}
