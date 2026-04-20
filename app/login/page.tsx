"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { getUser, setUser } from "@/lib/storage";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    if (!email.trim() || !password.trim()) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login Failed");

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
          <h1 className="login-title">Welcome Back</h1>
          <p className="login-subtitle">Log in to view your impact and progress.</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {errorMsg && <div style={{ color: "var(--red)", fontSize: "0.9rem", textAlign: "center", marginBottom: "1rem" }}>{errorMsg}</div>}
          <div className="login-field">
            <label htmlFor="login-email">Email Address</label>
            <input id="login-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </div>
          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <input id="login-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? <span className="login-spinner" /> : "Secure Log In"}
          </button>
        </form>

        <p className="login-footer">
          Don&apos;t have an account? <Link href="/register" style={{ color: "var(--green-600)", fontWeight: "600", textDecoration: "underline" }}>Create one here</Link>.
        </p>
      </div>
    </div>
  );
}
