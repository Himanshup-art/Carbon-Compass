"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { getUser, setUser } from "@/lib/storage";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [shake, setShake] = useState(false);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (getUser()) {
      router.replace("/dashboard");
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMsg("");
    if (!name.trim() || !email.trim() || !password || !agreed) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration Failed");

      setUser(data.name, data.email);
      router.push("/dashboard");
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setErrorMsg(e.message);
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-bg-orb login-bg-orb-1" />
      <div className="login-bg-orb login-bg-orb-2" />
      <div className="login-bg-orb login-bg-orb-3" />

      <div className={`login-card ${shake ? "login-shake" : ""} ${loading ? "login-loading" : ""}`}>
        <div className="login-brand">
          <Link href="/" className="login-logo" style={{ display: 'inline-flex' }}>
            <Logo />
          </Link>
          <h1 className="login-title">Create Account</h1>
          <p className="login-subtitle">Join us and start tracking your carbon footprint.</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {errorMsg && <div style={{ color: "var(--red)", fontSize: "0.9rem", textAlign: "center", marginBottom: "1rem" }}>{errorMsg}</div>}
          <div className="login-field">
            <label htmlFor="reg-name">Full Name</label>
            <input id="reg-name" type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="login-field">
            <label htmlFor="reg-email">Email Address</label>
            <input id="reg-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="login-field">
            <label htmlFor="reg-password">Password</label>
            <input id="reg-password" type="password" placeholder="Create a strong password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          
          <div className="checkbox-field">
            <input id="reg-terms" type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <label htmlFor="reg-terms">
              I agree to the Carbon Compass <Link href="/terms">Terms of Service</Link> and <Link href="/privacy">Privacy Policy</Link>.
            </label>
          </div>

          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? <span className="login-spinner" /> : "Create Account"}
          </button>
        </form>

        <p className="login-footer">
          Already have an account? <Link href="/login" style={{ color: "var(--green-600)", fontWeight: "600", textDecoration: "underline" }}>Log in here</Link>.
        </p>
      </div>
    </div>
  );
}
