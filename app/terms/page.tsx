import Link from "next/link";
import { Logo } from "@/components/logo";

export default function TermsPage() {
  return (
    <div className="landing-shell fade-in">
      {/* Navbar overlay logic */}
      <nav className="marketing-nav">
        <Link href="/" className="navbar-brand">
          <Logo width={34} height={34} />
          <strong className="navbar-title" style={{ marginLeft: 12, fontSize: "1.2rem" }}>Carbon Compass</strong>
        </Link>
        <div className="nav-links">
          <Link href="/login" className="nav-link">Log In</Link>
          <Link href="/register" className="btn btn-primary" style={{ padding: "10px 24px" }}>Start Free</Link>
        </div>
      </nav>

      <section style={{ maxWidth: 800, margin: "0 auto", padding: "140px 24px 100px", lineHeight: "1.8" }}>
        <h1 style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--text)", marginBottom: 24, letterSpacing: "-0.03em" }}>Terms of Service</h1>
        <p style={{ color: "var(--muted)", marginBottom: 40 }}>Last Updated: April 2026</p>

        <h2 style={{ fontSize: "1.4rem", fontWeight: 700, margin: "32px 0 16px" }}>1. Acceptance of Terms</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
          By accessing or using Carbon Compass, you agree to comply with and be bound by these Terms of Service. 
          If you do not agree to these terms, please do not use our services.
        </p>

        <h2 style={{ fontSize: "1.4rem", fontWeight: 700, margin: "32px 0 16px" }}>2. Description of Service</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
          Carbon Compass provides a personal sustainability tracking platform designed to help users calculate, track, and offset their carbon footprint.
          The calculations provided are estimates based on standardized environmental frameworks and should not be used for strict legal or scientific compliance.
        </p>

        <h2 style={{ fontSize: "1.4rem", fontWeight: 700, margin: "32px 0 16px" }}>3. User Conduct</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
          Users are expected to provide accurate information when utilizing the calculator for the best personal experience. 
          You agree not to misuse the platform, attempt to breach security measures, or use the service for any illegal activities.
        </p>
        
        <h2 style={{ fontSize: "1.4rem", fontWeight: 700, margin: "32px 0 16px" }}>4. Termination</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
          We reserve the right to suspend or terminate your account if you violate these Terms of Service without prior notice.
        </p>

        <div style={{ marginTop: 60, padding: 24, background: "var(--bg-warm)", borderRadius: 16, border: "1px solid rgba(16, 185, 129, 0.1)" }}>
          <p style={{ margin: 0, fontWeight: 600, color: "var(--green-800)" }}>Have questions?</p>
          <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>Contact our legal team at carboncompass@gmail.com</p>
        </div>
      </section>

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
