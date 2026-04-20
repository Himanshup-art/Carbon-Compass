import Link from "next/link";
import { Logo } from "@/components/logo";

export default function PrivacyPage() {
  return (
    <div className="landing-shell fade-in">
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
        <h1 style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--text)", marginBottom: 24, letterSpacing: "-0.03em" }}>Privacy Policy</h1>
        <p style={{ color: "var(--muted)", marginBottom: 40 }}>Last Updated: April 2026</p>

        <h2 style={{ fontSize: "1.4rem", fontWeight: 700, margin: "32px 0 16px" }}>1. Information We Collect</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
          We collect personal information that you provide to us directly, including your name, email address, and the specific daily habits you input into the calculator (such as travel distance and diet type) in order to compute your carbon footprint.
        </p>

        <h2 style={{ fontSize: "1.4rem", fontWeight: 700, margin: "32px 0 16px" }}>2. How We Use Your Data</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
          The data you provide is used strictly for generating your personal sustainability reports and calculating your footprint history. 
          When operating in local mode, your data never leaves your device&apos;s local storage. When operating in cloud mode, data is stored securely in our designated databases.
        </p>

        <h2 style={{ fontSize: "1.4rem", fontWeight: 700, margin: "32px 0 16px" }}>3. Data Sharing</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
          We do not sell, rent, or trade your personal information to third parties. We only share data with trusted service providers necessary to operate the application.
        </p>
        
        <h2 style={{ fontSize: "1.4rem", fontWeight: 700, margin: "32px 0 16px" }}>4. Your Rights</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
          You retain the right to delete your data at any time using the &quot;Delete&quot; functionality embedded within your Dashboard History.
        </p>

        <div style={{ marginTop: 60, padding: 24, background: "var(--bg-warm)", borderRadius: 16, border: "1px solid rgba(16, 185, 129, 0.1)" }}>
          <p style={{ margin: 0, fontWeight: 600, color: "var(--green-800)" }}>Detailed Inquiries</p>
          <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>Contact our privacy compliance team at carboncompass@gmail.com</p>
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
