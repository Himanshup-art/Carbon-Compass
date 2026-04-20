"use client";

import { FormEvent, useEffect, useState } from "react";
import { calculateCarbonFootprint } from "@/lib/carbon";
import { CarbonDashboardResponse, CarbonEntryRecord, CarbonFormValues } from "@/lib/types";
import { getMonthKey } from "@/lib/carbon";
import { loadDashboard as loadLocalDashboard, saveEntry as saveLocalEntry, getUser, setUser, logout as doLogout, deleteEntry as deleteLocalEntry } from "@/lib/storage";
import { Logo } from "@/components/logo";

type Tab = "dashboard" | "calculator" | "history" | "settings";

const defaultValues: CarbonFormValues = {
  profileId: "", name: "", email: "",
  travelMode: "car", dailyTravelKm: 12,
  monthlyElectricityUnits: 180, dietType: "vegetarian",
  weeklyMeatMeals: 0, targetReductionPercent: 15
};

const travelLabels: Record<CarbonFormValues["travelMode"], string> = {
  car: "Private car", bike: "Bike or scooter", bus: "Bus", train: "Train or metro", flight: "Frequent flights"
};
const dietLabels: Record<CarbonFormValues["dietType"], string> = {
  vegan: "Vegan", vegetarian: "Vegetarian", nonVegetarian: "Non-vegetarian"
};
const breakdownIcons: Record<string, string> = { travel: "🚀", electricity: "⚡", food: "🥗" };

function getFocusArea(breakdown: ReturnType<typeof calculateCarbonFootprint>["breakdown"]) {
  return [...breakdown].sort((a, b) => b.annualKg - a.annualKg)[0];
}
function getMonthlyGap(currentAnnualKg: number, targetAnnualKg: number) {
  return Math.max(0, Math.round((currentAnnualKg - targetAnnualKg) / 12));
}

/* Environmental equivalencies — make CO2 relatable */
function getEquivalencies(annualKg: number) {
  return [
    { icon: "🌳", label: "Trees needed to offset", value: Math.round(annualKg / 22), unit: "trees/year" },
    { icon: "🚗", label: "Equivalent car distance", value: Math.round(annualKg / 0.21), unit: "km driven" },
    { icon: "💡", label: "Light bulbs powered", value: Math.round(annualKg / 36), unit: "bulbs for a year" },
    { icon: "✈️", label: "Flights (domestic)", value: Math.round(annualKg / 300 * 10) / 10, unit: "round trips" },
  ];
}

/* Eco level badge system */
function getEcoLevel(annualKg: number): { level: string; title: string; icon: string; color: string; desc: string } {
  if (annualKg < 1200) return { level: "5", title: "Eco Champion", icon: "🏆", color: "#059669", desc: "Top tier! You are living a deeply sustainable lifestyle that acts as a blueprint for reversing climate change." };
  if (annualKg < 1900) return { level: "4", title: "Green Leader", icon: "🌿", color: "#10b981", desc: "Excellent habits. You are significantly below the global average and actively leading the way towards net-zero." };
  if (annualKg < 3000) return { level: "3", title: "Conscious Citizen", icon: "🌱", color: "#34d399", desc: "You are making solid structural choices to keep your footprint at bay, but there are still clear areas to optimize." };
  if (annualKg < 4500) return { level: "2", title: "Eco Aware", icon: "🌍", color: "#f59e0b", desc: "You are aware of your impact and sit near the global average. Now is the time to start taking targeted reduction actions." };
  return { level: "1", title: "Just Starting", icon: "🔥", color: "#ef4444", desc: "Your footprint is currently quite high. You have a massive opportunity to dramatically reduce your environmental impact!" };
}

import { useRouter } from "next/navigation";

export function Dashboard() {
  const router = useRouter();
  const [values, setValues] = useState<CarbonFormValues>(defaultValues);
  const [dashboard, setDashboard] = useState<CarbonDashboardResponse>({ latestEntry: null, history: [], trend: [] });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [storageMode, setStorageMode] = useState<"local" | "cloud">("local");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  useEffect(() => {
    const user = getUser();
    if (!user) return;
    setUserName(user.name);
    setEditName(user.name);
    setEditEmail(user.email);
    setValues((c) => ({ ...c, profileId: user.profileId, name: user.name, email: user.email }));
    void loadData(user.profileId);
  }, []);

  async function loadData(profileId: string) {
    try {
      const r = await fetch(`/api/carbon?profileId=${encodeURIComponent(profileId)}`);
      const d = await r.json();
      if (d.mode === "cloud" && r.ok) {
        setStorageMode("cloud");
        setDashboard({ latestEntry: d.latestEntry ?? null, history: d.history ?? [], trend: d.trend ?? [] });
        return;
      }
    } catch { /* fallback */ }
    setStorageMode("local");
    setDashboard(loadLocalDashboard(profileId));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError(""); setStatus("");
    try {
      let entry: CarbonEntryRecord;
      if (storageMode === "cloud") {
        const r = await fetch("/api/carbon", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
        const d = await r.json();
        if (!r.ok || !d.entry) throw new Error(d.error ?? "Unable to save");
        entry = d.entry;
      } else {
        const calc = calculateCarbonFootprint(values);
        entry = saveLocalEntry({ ...values, calculation: calc, createdAt: new Date().toISOString(), monthKey: getMonthKey() });
      }
      setDashboard((c) => ({
        latestEntry: entry,
        history: [entry, ...c.history].slice(0, 12),
        trend: [...c.trend.filter((t) => t.monthKey !== entry.monthKey),
          { monthKey: entry.monthKey, totalAnnualKg: entry.calculation.totalAnnualKg }].slice(-6)
      }));
      setStatus("Report saved successfully! Switch to Dashboard to see your updated results.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save entry");
    } finally { setLoading(false); }
  }

  async function handleDeleteEntry(id: string) {
    if (!window.confirm("Are you sure you want to delete this check-in?")) return;
    
    setLoading(true);
    try {
      if (storageMode === "cloud") {
        await fetch(`/api/carbon?id=${id}`, { method: "DELETE" });
      } else {
        deleteLocalEntry(id);
      }
      await loadData(values.profileId);
    } catch (e) {
      alert("Failed to delete entry");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    if (!editName.trim() || !editEmail.trim()) {
      alert("Name and email are required");
      return;
    }

    const btn = document.getElementById("profile-save-btn");
    const orig = btn ? btn.innerText : "Save Changes";
    if (btn) btn.innerText = "Saving...";

    try {
      if (storageMode === "cloud") {
        const res = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileId: values.profileId, newName: editName.trim() })
        });
        if (!res.ok) throw new Error("Failed to save to cloud");
      }
      
      setUser(editName.trim(), editEmail.trim());
      setUserName(editName.trim());
      setValues((c) => ({ ...c, name: editName.trim(), email: editEmail.trim() }));
      
      if (btn) {
        btn.innerText = "Saved!";
        setTimeout(() => (btn.innerText = orig), 2000);
      }
    } catch (e) {
      alert("Error saving profile");
      if (btn) btn.innerText = orig;
    }
  }

  async function handleUpdatePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const passInput = form.elements.namedItem("new-pass") as HTMLInputElement;
    const confirmInput = form.elements.namedItem("confirm-pass") as HTMLInputElement;
    const btn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    if (passInput.value !== confirmInput.value) {
      alert("Passwords do not match"); return;
    }
    
    const orig = btn.innerText;
    btn.innerText = "Updating...";
    
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: values.profileId, newPassword: passInput.value })
      });
      if (!res.ok) throw new Error("Failed to update password");
      alert("Password updated successfully!");
      form.reset();
    } catch (e) {
      alert("Error updating password");
    } finally {
      btn.innerText = orig;
    }
  }

  const preview = calculateCarbonFootprint(values);
  const focusArea = getFocusArea(preview.breakdown);
  const latestFootprint = dashboard.latestEntry?.calculation.totalAnnualKg ?? preview.totalAnnualKg;
  const trend = dashboard.trend.length ? dashboard.trend : [{ monthKey: "Current", totalAnnualKg: preview.totalAnnualKg }];
  const maxTrendValue = Math.max(...trend.map((t) => t.totalAnnualKg), 1);
  const monthlyGap = getMonthlyGap(preview.totalAnnualKg, preview.targetAnnualKg);
  const progressDelta = dashboard.history[1] ? dashboard.history[0].calculation.totalAnnualKg - dashboard.history[1].calculation.totalAnnualKg : 0;
  const firstName = userName.split(" ")[0] || "there";
  const ecoLevel = getEcoLevel(preview.totalAnnualKg);
  const equivalencies = getEquivalencies(preview.totalAnnualKg);
  const progressPercent = Math.min(100, Math.round((1 - preview.totalAnnualKg / preview.globalAverageKg) * 100));
  const gaugePercent = Math.max(0, Math.min(100, Math.round((preview.totalAnnualKg / 6000) * 100)));

  return (
    <main className="app-shell">
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="navbar-logo">
            <Logo width={34} height={34} />
          </div>
          <div>
            <strong className="navbar-title">Carbon Compass</strong>
            <span className="navbar-tagline">Personal Sustainability Tracker</span>
          </div>
        </div>
        <div className="navbar-right">
          <button 
            className="navbar-user" 
            onClick={() => setActiveTab("settings")}
            style={{ background: "transparent", border: "none", padding: "4px 8px", borderRadius: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", transition: "background 0.2s" }}
            onMouseOver={(e) => e.currentTarget.style.background = "rgba(16, 185, 129, 0.08)"}
            onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
            title="Open Settings"
          >
            <div className="user-avatar">{editName.charAt(0).toUpperCase()}</div>
            <span className="user-greeting">Welcome, {editName.split(" ")[0] || "User"}</span>
          </button>
          <button className="btn btn-ghost" type="button" onClick={() => { doLogout(); router.push("/login"); }}>Sign Out</button>
        </div>
      </nav>

      {/* TAB NAV */}
      <div className="tab-bar fade-in">
        <button className={`tab-btn ${activeTab === "dashboard" ? "tab-active" : ""}`} onClick={() => setActiveTab("dashboard")}>
          📊 Dashboard
        </button>
        <button className={`tab-btn ${activeTab === "calculator" ? "tab-active" : ""}`} onClick={() => setActiveTab("calculator")}>
          📋 Calculator
        </button>
        <button className={`tab-btn ${activeTab === "history" ? "tab-active" : ""}`} onClick={() => setActiveTab("history")}>
          📂 History
        </button>
      </div>

      {/* ═══ DASHBOARD TAB ═══ */}
      {activeTab === "dashboard" && (
        <div className="fade-in">
          {/* Quick Stats Row */}
          <div className="stats-row">
            <button className="stat-card stat-primary" onClick={() => setActiveTab("calculator")} title="Edit in Calculator">
              <div className="stat-icon">🌍</div>
              <div style={{ textAlign: "left" }}>
                <span className="stat-label">Annual Footprint</span>
                <strong className="stat-value">{preview.totalAnnualKg} <small>kg CO₂</small></strong>
              </div>
            </button>
            <button className="stat-card" onClick={() => alert(`Level ${ecoLevel.level}: ${ecoLevel.title}\n\n${ecoLevel.desc}`)} title="Learn about your Eco Level">
              <div className="stat-icon">{ecoLevel.icon}</div>
              <div style={{ textAlign: "left" }}>
                <span className="stat-label">Eco Level</span>
                <strong className="stat-value">{ecoLevel.title}</strong>
              </div>
            </button>
            <button className="stat-card" onClick={() => setActiveTab("calculator")} title="Change Target">
              <div className="stat-icon">🎯</div>
              <div style={{ textAlign: "left" }}>
                <span className="stat-label">Reduction Target</span>
                <strong className="stat-value">{values.targetReductionPercent}%</strong>
              </div>
            </button>
            <button className="stat-card" onClick={() => setActiveTab("history")} title="View History">
              <div className="stat-icon">{progressDelta <= 0 ? "📉" : "📈"}</div>
              <div style={{ textAlign: "left" }}>
                <span className="stat-label">Latest Change</span>
                <strong className={`stat-value ${progressDelta <= 0 ? "trend-good" : "trend-bad"}`}>
                  {progressDelta === 0 ? "—" : `${progressDelta > 0 ? "+" : ""}${progressDelta} kg`}
                </strong>
              </div>
            </button>
          </div>

          <div className="dashboard-grid">
            <div className="left-column">
              {/* Impact Gauge */}
              <section className="surface section-block fade-in-delay-1">
                <div className="section-heading compact">
                  <div>
                    <span className="section-kicker">📊 Impact Score</span>
                    <h2>Your carbon footprint at a glance</h2>
                  </div>
                </div>
                <div className="gauge-section">
                  <div className="gauge-container">
                    <svg className="gauge-svg" viewBox="0 0 200 120">
                      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#e5e7eb" strokeWidth="14" strokeLinecap="round"/>
                      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke={`url(#gauge-grad)`} strokeWidth="14" strokeLinecap="round"
                        strokeDasharray={`${gaugePercent * 2.51} 251`} style={{ transition: "stroke-dasharray 1s ease" }}/>
                      <defs>
                        <linearGradient id="gauge-grad" x1="0" y1="0" x2="200" y2="0">
                          <stop offset="0%" stopColor="#10b981"/>
                          <stop offset="50%" stopColor="#f59e0b"/>
                          <stop offset="100%" stopColor="#ef4444"/>
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="gauge-center">
                      <strong>{preview.totalAnnualTonnes}</strong>
                      <span>tonnes CO₂/yr</span>
                    </div>
                  </div>
                  <div className="gauge-legend">
                    <div><span className="legend-dot legend-green"></span> Below 1.9t — Great</div>
                    <div><span className="legend-dot legend-amber"></span> 1.9t–4t — Average</div>
                    <div><span className="legend-dot legend-red"></span> Above 4t — High</div>
                  </div>
                </div>
                <div className="comparison-bar-section">
                  <h3 className="comparison-title">How you compare</h3>
                  <div className="comparison-bars">
                    <div className="cbar">
                      <div className="cbar-label"><span>You</span><strong>{preview.totalAnnualKg} kg</strong></div>
                      <div className="cbar-track"><div className="cbar-fill cbar-you" style={{ width: `${Math.min(100, (preview.totalAnnualKg / 6000) * 100)}%` }}/></div>
                    </div>
                    <div className="cbar">
                      <div className="cbar-label"><span>National avg.</span><strong>{preview.nationalAverageKg} kg</strong></div>
                      <div className="cbar-track"><div className="cbar-fill cbar-nat" style={{ width: `${(preview.nationalAverageKg / 6000) * 100}%` }}/></div>
                    </div>
                    <div className="cbar">
                      <div className="cbar-label"><span>Global avg.</span><strong>{preview.globalAverageKg} kg</strong></div>
                      <div className="cbar-track"><div className="cbar-fill cbar-glob" style={{ width: `${(preview.globalAverageKg / 6000) * 100}%` }}/></div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Breakdown */}
              <section className="surface section-block fade-in-delay-2">
                <div className="section-heading compact">
                  <div>
                    <span className="section-kicker">📊 Breakdown</span>
                    <h2>Where emissions come from</h2>
                  </div>
                </div>
                <div className="breakdown-cards">
                  {preview.breakdown.map((item) => (
                    <article className="breakdown-card" key={item.key}>
                      <div className="breakdown-icon">{breakdownIcons[item.key]}</div>
                      <strong>{item.label}</strong>
                      <div className="breakdown-value">{item.annualKg} kg</div>
                      <div className="breakdown-share">{item.share}%</div>
                      <div className="bar"><span style={{ width: `${item.share}%` }} /></div>
                    </article>
                  ))}
                </div>
              </section>

              {/* Environmental Equivalencies */}
              <section className="surface section-block fade-in-delay-3">
                <div className="section-heading compact">
                  <div>
                    <span className="section-kicker">🌎 Real-World Impact</span>
                    <h2>What your footprint means</h2>
                  </div>
                </div>
                <div className="equiv-grid">
                  {equivalencies.map((eq) => (
                    <article className="equiv-card" key={eq.label}>
                      <div className="equiv-icon">{eq.icon}</div>
                      <strong className="equiv-value">{eq.value}</strong>
                      <span className="equiv-unit">{eq.unit}</span>
                      <p className="equiv-label">{eq.label}</p>
                    </article>
                  ))}
                </div>
              </section>

              {/* Global Benchmarks Comparison */}
              <section className="surface section-block fade-in-delay-4" style={{ marginTop: 24 }}>
                <div className="section-heading compact">
                  <div>
                    <span className="section-kicker">📊 Global Benchmarks</span>
                    <h2>How you compare globally</h2>
                  </div>
                </div>
                <div style={{ display: "grid", gap: "16px", marginTop: "20px" }}>
                  {[
                    { country: "Average American", footprint: 14500, flag: "🇺🇸" },
                    { country: "Global Average", footprint: 4700, flag: "🌐" },
                    { country: "Average Indian", footprint: 1900, flag: "🇮🇳" }
                  ].map((bench) => (
                    <div key={bench.country} style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: "100%" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.85rem" }}>
                          <span style={{ fontWeight: "600" }}>{bench.flag} {bench.country}</span>
                          <span style={{ color: "var(--muted)" }}>{bench.footprint} kg</span>
                        </div>
                        <div style={{ height: "8px", background: "var(--bg-warm)", borderRadius: "99px", overflow: "hidden" }}>
                          <div style={{ 
                            height: "100%", 
                            width: `${Math.min(100, (bench.footprint / 16000) * 100)}%`, 
                            background: bench.footprint > preview.totalAnnualKg ? "var(--green-400)" : "var(--red)",
                            opacity: 0.7,
                            borderRadius: "inherit"
                          }} />
                        </div>
                      </div>
                      <div style={{ textAlign: "right", minWidth: "80px" }}>
                        <span style={{ 
                          fontSize: "0.75rem", 
                          fontWeight: "800", 
                          color: preview.totalAnnualKg < bench.footprint ? "var(--green-600)" : "var(--red)" 
                        }}>
                          {preview.totalAnnualKg < bench.footprint ? "BETTER" : "HIGHER"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Eco-Tip Card */}
              <section className="surface" style={{ marginTop: 24, padding: "24px", background: "linear-gradient(135deg, var(--green-600), var(--green-800))", color: "#fff", borderRadius: "var(--radius-xl)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", right: "-10px", bottom: "-10px", fontSize: "5rem", opacity: 0.1 }}>🍃</div>
                <span style={{ display: "block", fontSize: "0.7rem", fontWeight: "800", letterSpacing: "0.15em", textTransform: "uppercase", opacity: 0.8, marginBottom: "8px" }}>💡 Daily Eco-Tip</span>
                <strong style={{ display: "block", fontSize: "1.1rem", marginBottom: "8px" }}>Switch to LED lighting</strong>
                <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.9, lineHeight: 1.5 }}>Simply replacing 5 incandescent bulbs with LEDs in your home can save up to 400kg of CO₂ per year. That's equivalent to planting 15 trees!</p>
              </section>
            </div>

            <div className="right-column">
              {/* Eco Badge */}
              <section className="surface badge-panel fade-in-delay-1">
                <div className="badge-icon" style={{ background: ecoLevel.color + "18", color: ecoLevel.color }}>{ecoLevel.icon}</div>
                <div className="badge-level">Level {ecoLevel.level}</div>
                <strong className="badge-title" style={{ color: ecoLevel.color }}>{ecoLevel.title}</strong>
                <p className="badge-desc">
                  {ecoLevel.level === "5" ? "Outstanding! Your footprint is truly minimal." :
                   ecoLevel.level === "4" ? "Great work! You're well below average." :
                   ecoLevel.level === "3" ? "You're doing well. A few more changes can level you up." :
                   ecoLevel.level === "2" ? "You're aware. Now take targeted actions." :
                   "Every journey starts somewhere. Let's reduce your impact."}
                </p>
                <div className="badge-progress">
                  <div className="badge-progress-bar">
                    <div className="badge-progress-fill" style={{ width: `${Math.max(5, 100 - gaugePercent)}%`, background: ecoLevel.color }}/>
                  </div>
                  <span>{progressPercent > 0 ? `${progressPercent}% below global average` : `${Math.abs(progressPercent)}% above global average`}</span>
                </div>
              </section>

              {/* Monthly Trend */}
              <section className="surface section-block fade-in-delay-2">
                <div className="section-heading compact">
                  <div>
                    <span className="section-kicker">📈 Trend</span>
                    <h2>Monthly progress</h2>
                  </div>
                </div>
                <div className="trend-shell">
                  <div className="trend-header">
                    <div>
                      <span className="trend-label">Target</span>
                      <strong>{preview.targetAnnualKg} kg</strong>
                    </div>
                    <div>
                      <span className="trend-label">Gap/month</span>
                      <strong>−{monthlyGap} kg</strong>
                    </div>
                  </div>
                  <div className="history-chart">
                    {trend.map((point) => (
                      <div className="history-bar" key={point.monthKey}>
                        <span className="chart-value">{point.totalAnnualKg}</span>
                        <div className="column" style={{ height: `${Math.max((point.totalAnnualKg / maxTrendValue) * 180, 28)}px` }} />
                        <span className="chart-label">{point.monthKey}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Action Plan */}
              <section className="surface section-block fade-in-delay-3">
                <div className="section-heading compact">
                  <div>
                    <span className="section-kicker">💡 Action Plan</span>
                    <h2>Top recommendations</h2>
                  </div>
                </div>
                <div className="action-callout">
                  <span>Focus area</span>
                  <strong>{breakdownIcons[focusArea.key]} {focusArea.label}</strong>
                  <p>Your biggest contributor — changes here have the most impact.</p>
                </div>
                <div className="suggestions-list">
                  {preview.suggestions.map((s, i) => (
                    <article className="suggestion-card" key={s.title}>
                      <div className="suggestion-rank">#{i + 1}</div>
                      <div>
                        <strong>{s.title}</strong>
                        <p>{s.description}</p>
                        <small>Saves ~{s.estimatedSavingsKg} kg CO₂/year</small>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CALCULATOR TAB ═══ */}
      {activeTab === "calculator" && (
        <div className="fade-in">
          <div className="calc-layout">
            <div className="calc-main">
              <section className="surface section-block">
                <div className="section-heading">
                  <div>
                    <span className="section-kicker">📋 Calculator</span>
                    <h2>Build your carbon profile</h2>
                  </div>
                  <p>Fill in your daily habits. Results update instantly.</p>
                </div>
                <form onSubmit={handleSubmit} className="form-stack">
                  <div className="form-card-grid">
                    <section className="form-card">
                      <div className="card-intro">
                        <span className="card-step">01</span>
                        <div><h3>Profile</h3><p>Keep your check-ins linked to the same history.</p></div>
                      </div>
                      <div className="field-grid">
                        <label className="field"><span>Name</span>
                          <input value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} placeholder="Your full name"/>
                        </label>
                        <label className="field"><span>Email</span>
                          <input type="email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} placeholder="you@example.com"/>
                        </label>
                      </div>
                    </section>
                    <section className="form-card">
                      <div className="card-intro">
                        <span className="card-step">02</span>
                        <div><h3>Mobility</h3><p>How you commute shapes your footprint.</p></div>
                      </div>
                      <div className="field-grid">
                        <label className="field"><span>Travel mode</span>
                          <select value={values.travelMode} onChange={(e) => setValues({ ...values, travelMode: e.target.value as CarbonFormValues["travelMode"] })}>
                            <option value="car">🚗 Car</option><option value="bike">🏍️ Bike/scooter</option><option value="bus">🚌 Bus</option><option value="train">🚆 Train/metro</option><option value="flight">✈️ Flights</option>
                          </select>
                        </label>
                        <label className="field"><span>Daily distance (km)</span>
                          <input type="number" min="0" value={values.dailyTravelKm} onChange={(e) => setValues({ ...values, dailyTravelKm: Number(e.target.value) })}/>
                        </label>
                      </div>
                    </section>
                    <section className="form-card">
                      <div className="card-intro">
                        <span className="card-step">03</span>
                        <div><h3>Home Energy</h3><p>Your electricity bill or a realistic estimate.</p></div>
                      </div>
                      <div className="field-grid single-column">
                        <label className="field"><span>Monthly electricity (kWh)</span>
                          <input type="number" min="0" value={values.monthlyElectricityUnits} onChange={(e) => setValues({ ...values, monthlyElectricityUnits: Number(e.target.value) })}/>
                        </label>
                      </div>
                    </section>
                    <section className="form-card">
                      <div className="card-intro">
                        <span className="card-step">04</span>
                        <div><h3>Food & Goals</h3><p>Diet and your reduction ambition.</p></div>
                      </div>
                      <div className="field-grid">
                        <label className="field"><span>Diet type</span>
                          <select value={values.dietType} onChange={(e) => setValues({ ...values, dietType: e.target.value as CarbonFormValues["dietType"] })}>
                            <option value="vegan">🌱 Vegan</option><option value="vegetarian">🥬 Vegetarian</option><option value="nonVegetarian">🍖 Non-veg</option>
                          </select>
                        </label>
                        <label className="field"><span>Meat meals/week</span>
                          <input type="number" min="0" value={values.weeklyMeatMeals} onChange={(e) => setValues({ ...values, weeklyMeatMeals: Number(e.target.value) })}/>
                        </label>
                        <label className="field field-full"><span>Reduction goal — {values.targetReductionPercent}%</span>
                          <input type="range" min="0" max="50" value={values.targetReductionPercent} onChange={(e) => setValues({ ...values, targetReductionPercent: Number(e.target.value) })}/>
                        </label>
                      </div>
                    </section>
                  </div>
                  <div className="form-actions">
                    <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "Saving..." : "💾 Save Check-in"}</button>
                    <button className="btn btn-secondary" type="button" onClick={() => window.print()}>🖨️ Export PDF</button>
                  </div>
                  {status ? <div className="status-banner">✅ {status}</div> : null}
                  {error ? <div className="error-banner">⚠️ {error}</div> : null}
                </form>
              </section>

              {/* 🎁 Sustainability Rewards Program (Utilizing the Left Space) */}
              <section className="surface section-block fade-in-delay-1" style={{ marginTop: 24 }}>
                <div className="section-heading compact">
                  <div>
                    <span className="section-kicker">🎁 Rewards Program</span>
                    <h2>Unlock trees and vouchers</h2>
                  </div>
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginTop: "24px" }}>
                  <div className={`reward-tier ${values.targetReductionPercent >= 10 ? "active" : ""}`} style={{ 
                    padding: "24px", 
                    borderRadius: "var(--radius-lg)", 
                    background: values.targetReductionPercent >= 10 ? "var(--green-50)" : "var(--bg-warm)", 
                    border: "2px solid", 
                    borderColor: values.targetReductionPercent >= 10 ? "var(--green-400)" : "rgba(0,0,0,0.05)",
                    transition: "all 0.4s ease",
                    transform: values.targetReductionPercent >= 10 ? "scale(1.02)" : "scale(1)"
                  }}>
                    <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🌱</div>
                    <strong style={{ display: "block", fontSize: "1.1rem", color: "var(--green-800)", marginBottom: "4px" }}>Tier 1: Explorer</strong>
                    <span style={{ color: "var(--muted)", fontSize: "0.85rem", fontWeight: "600", display: "block", marginBottom: "12px" }}>10% REDUCTION</span>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.88rem", display: "grid", gap: "8px" }}>
                      <li>✅ 1 Tree Planted Monthly</li>
                      <li>✅ 5% Discount Voucher</li>
                    </ul>
                  </div>

                  <div className={`reward-tier ${values.targetReductionPercent >= 20 ? "active" : ""}`} style={{ 
                    padding: "24px", 
                    borderRadius: "var(--radius-lg)", 
                    background: values.targetReductionPercent >= 20 ? "var(--green-50)" : "var(--bg-warm)", 
                    border: "2px solid", 
                    borderColor: values.targetReductionPercent >= 20 ? "var(--green-400)" : "rgba(0,0,0,0.05)",
                    transition: "all 0.4s ease",
                    transform: values.targetReductionPercent >= 20 ? "scale(1.02)" : "scale(1)"
                  }}>
                    <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🌲</div>
                    <strong style={{ display: "block", fontSize: "1.1rem", color: "var(--green-800)", marginBottom: "4px" }}>Tier 2: Guardian</strong>
                    <span style={{ color: "var(--muted)", fontSize: "0.85rem", fontWeight: "600", display: "block", marginBottom: "12px" }}>20% REDUCTION</span>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.88rem", display: "grid", gap: "8px" }}>
                      <li>✅ 2 Trees Planted Monthly</li>
                      <li>✅ 15% Discount Voucher</li>
                    </ul>
                  </div>

                  <div className={`reward-tier ${values.targetReductionPercent >= 40 ? "active" : ""}`} style={{ 
                    padding: "24px", 
                    borderRadius: "var(--radius-lg)", 
                    background: values.targetReductionPercent >= 40 ? "var(--green-50)" : "var(--bg-warm)", 
                    border: "2px solid", 
                    borderColor: values.targetReductionPercent >= 40 ? "var(--green-400)" : "rgba(0,0,0,0.05)",
                    transition: "all 0.4s ease",
                    transform: values.targetReductionPercent >= 40 ? "scale(1.02)" : "scale(1)"
                  }}>
                    <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🌳</div>
                    <strong style={{ display: "block", fontSize: "1.1rem", color: "var(--green-800)", marginBottom: "4px" }}>Tier 3: Champion</strong>
                    <span style={{ color: "var(--muted)", fontSize: "0.85rem", fontWeight: "600", display: "block", marginBottom: "12px" }}>40% REDUCTION</span>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.88rem", display: "grid", gap: "8px" }}>
                      <li>✅ 5 Trees Planted Monthly</li>
                      <li>✅ 30% Discount Voucher</li>
                    </ul>
                  </div>
                </div>

                <div style={{ marginTop: "24px", padding: "20px", borderRadius: "var(--radius-md)", background: "var(--green-50)", border: "1px solid rgba(16, 185, 129, 0.15)", color: "var(--green-800)", fontSize: "0.9rem", display: "flex", gap: "12px", alignItems: "center" }}>
                  <span style={{ fontSize: "1.2rem" }}>💡</span>
                  <p style={{ margin: 0 }}><strong>How it works:</strong> Adjust your <strong>Reduction Goal</strong> slider in the form above. Your account automatically qualifies for these real-world impact rewards based on your monthly commitment!</p>
                </div>
              </section>
            </div>

            {/* Live preview sidebar */}
            <div className="calc-sidebar">
              <section className="surface report-panel">
                <div className="report-topline">
                  <span className={`score-pill score-${preview.rating}`}>{preview.ratingLabel}</span>
                  <span className="report-badge">Live</span>
                </div>
                <div className="report-main-number">
                  <strong>{preview.totalAnnualKg}</strong>
                  <span>kg CO₂ / year</span>
                </div>
                <p className="report-copy">{preview.headline}</p>
                <div className="report-mini-metrics">
                  <article><span>Monthly</span><strong>{preview.monthlyProjectionKg} kg</strong></article>
                  <article><span>Target</span><strong>{preview.targetAnnualKg} kg</strong></article>
                </div>
              </section>
              <section className="surface section-block">
                <div className="section-heading compact"><div><span className="section-kicker">🎯 Goal Coach</span><h2>Stay on track</h2></div></div>
                <div className="coach-grid">
                  <article className="coach-card"><span>Target</span><strong>{values.targetReductionPercent}%</strong><p>Reach {preview.targetAnnualKg} kg annually.</p></article>
                  <article className="coach-card"><span>Monthly gap</span><strong>{monthlyGap} kg</strong><p>Needed monthly drop.</p></article>
                </div>
              </section>
              <section className="surface action-callout" style={{ marginTop: 24, textAlign: 'center' }}>
                <span style={{ marginBottom: 12 }}>{values.targetReductionPercent >= 10 ? "🎁 This Month's Reward" : "🔒 Rewards Locked"}</span>
                
                {values.targetReductionPercent >= 40 ? (
                  <>
                    <strong style={{ fontSize: "1.8rem" }}>🌳 5 Trees Planted</strong>
                    <p style={{ fontSize: "0.8rem" }}>Incredible! We've planted 5 trees on your behalf.</p>
                    <button className="btn btn-primary" type="button" style={{ marginTop: 12, width: '100%', padding: "10px 16px" }} onClick={() => alert("🎉 SUPER REWARD: You unlocked a 30% discount voucher! Code: GREEN30")}>Claim 30% Voucher</button>
                  </>
                ) : values.targetReductionPercent >= 20 ? (
                  <>
                    <strong style={{ fontSize: "1.8rem" }}>🌲 2 Trees Planted</strong>
                    <p style={{ fontSize: "0.8rem" }}>Great goal! We've planted 2 trees for you.</p>
                    <button className="btn btn-primary" type="button" style={{ marginTop: 12, width: '100%', padding: "10px 16px" }} onClick={() => alert("🎉 Congratulations: You unlocked a 15% discount voucher! Code: GREEN15")}>Claim 15% Voucher</button>
                  </>
                ) : values.targetReductionPercent >= 10 ? (
                  <>
                    <strong style={{ fontSize: "1.8rem" }}>🌱 1 Tree Planted</strong>
                    <p style={{ fontSize: "0.8rem" }}>Good start! You've earned 1 newly planted tree.</p>
                    <button className="btn btn-primary" type="button" style={{ marginTop: 12, width: '100%', padding: "10px 16px" }} onClick={() => alert("✅ You unlocked a 5% discount voucher! Code: GREEN5")}>Claim 5% Voucher</button>
                  </>
                ) : (
                  <>
                    <strong style={{ fontSize: "1.8rem", color: "var(--muted)" }}>0 Trees</strong>
                    <p style={{ fontSize: "0.8rem", color: "var(--red)" }}>Commit to 10% to unlock rewards!</p>
                    <button className="btn btn-secondary" type="button" style={{ marginTop: 12, width: '100%', opacity: 0.5, cursor: "not-allowed", padding: "10px 16px" }} disabled>Set Target</button>
                  </>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

      {/* ═══ HISTORY TAB ═══ */}
      {activeTab === "history" && (
        <div className="fade-in">
          <section className="surface section-block">
            <div className="section-heading">
              <div>
                <span className="section-kicker">📂 History</span>
                <h2>All saved reports</h2>
              </div>
              <p>Every check-in is timestamped. Compare your progress over time.</p>
            </div>
            {dashboard.history.length ? (
              <div className="history-table-wrap">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Footprint</th>
                      <th>Rating</th>
                      <th>Travel</th>
                      <th>Diet</th>
                      <th>Goal</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.history.map((item) => (
                      <tr key={item.id}>
                        <td><strong>{item.createdAt.slice(0, 10)}</strong></td>
                        <td>{item.calculation.totalAnnualKg} kg</td>
                        <td><span className={`score-pill score-${item.calculation.rating}`}>{item.calculation.ratingLabel}</span></td>
                        <td>{travelLabels[item.travelMode]}</td>
                        <td>{dietLabels[item.dietType]}</td>
                        <td>{item.targetReductionPercent}%</td>
                        <td>
                          <button className="btn btn-ghost" onClick={() => handleDeleteEntry(item.id)} style={{ padding: "6px 12px", fontSize: "0.8rem", color: "var(--red)" }}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <article className="timeline-card timeline-empty">
                <strong>No reports yet</strong>
                <p>Go to the Calculator tab, fill in your data, and save your first check-in.</p>
                <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setActiveTab("calculator")}>📋 Open Calculator</button>
              </article>
            )}
          </section>
        </div>
      )}

      {/* ═══ SETTINGS TAB ═══ */}
      {activeTab === "settings" && (
        <div className="fade-in settings-layout">
          {/* Profile Card Sidebar */}
          <div className="settings-profile-card">
            <div className="settings-avatar">{editName.charAt(0).toUpperCase() || "C"}</div>
            <h2 className="settings-name">{userName || "Your Profile"}</h2>
            <p className="settings-meta">Joined Carbon Compass</p>
            <div className="settings-badge">
              {ecoLevel.icon} {ecoLevel.title}
            </div>
            <div style={{ marginTop: 24, fontSize: "0.9rem", color: "var(--text-secondary)" }}>
              <strong>{dashboard.history.length}</strong> total check-ins
            </div>
          </div>

          {/* Settings Editor */}
          <div>
            <section className="settings-form-section">
              <h3>Edit Profile</h3>
              <form onSubmit={handleSaveProfile} className="form-stack">
                <div className="login-field">
                  <label htmlFor="edit-name">First Name</label>
                  <input id="edit-name" type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required />
                </div>
                <div className="login-field">
                  <label htmlFor="edit-email">Email Address</label>
                  <input id="edit-email" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} required />
                </div>
                <div className="settings-actions">
                  <button type="submit" id="profile-save-btn" className="btn btn-primary" style={{ padding: "14px 28px", fontSize: "1rem" }}>Save Changes</button>
                </div>
              </form>
            </section>

            <section className="settings-form-section" style={{ marginTop: "32px" }}>
              <h3>Security</h3>
              <form onSubmit={handleUpdatePassword} className="form-stack">
                <div className="login-field">
                  <label htmlFor="new-pass">New Password</label>
                  <input id="new-pass" name="new-pass" type="password" placeholder="••••••••" required minLength={6} />
                </div>
                <div className="login-field">
                  <label htmlFor="confirm-pass">Confirm Password</label>
                  <input id="confirm-pass" name="confirm-pass" type="password" placeholder="••••••••" required minLength={6} />
                </div>
                <div className="settings-actions">
                  <button type="submit" className="btn btn-secondary" style={{ padding: "14px 28px", fontSize: "1rem" }}>Update Password</button>
                </div>
              </form>
            </section>
          </div>
        </div>
      )}

      {/* ═══ PRINTABLE PDF REPORT ═══ */}
      <div className="print-only">
        <div className="print-header">
          <div>
            <h1>Carbon Compass Report</h1>
            <div className="print-meta">Official Footprint Analysis</div>
          </div>
          <div className="print-meta" style={{ textAlign: "right" }}>
            <span style={{ display: "block" }}>Name: <strong>{userName}</strong></span>
            <span style={{ display: "block" }}>Date: <strong>{new Date().toLocaleDateString()}</strong></span>
          </div>
        </div>

        <div className="print-section">
          <h2>Summary</h2>
          <div className="print-grid">
            <div className="print-card">
              <span>Annual Footprint</span>
              <strong>{latestFootprint} kg CO₂/yr</strong>
            </div>
            <div className="print-card">
              <span>Eco Level Rating</span>
              <strong style={{ color: ecoLevel.color }}>{ecoLevel.title} (Level {ecoLevel.level})</strong>
            </div>
            <div className="print-card">
              <span>Reduction Target</span>
              <strong>{values.targetReductionPercent}%</strong>
            </div>
            <div className="print-card">
              <span style={{ color: "#000" }}>Offset Required</span>
              <strong>${Math.max(1, Math.round((preview.totalAnnualKg / 1000) * 15))} USD / ₹{Math.max(83, Math.round((preview.totalAnnualKg / 1000) * 15 * 83))}</strong>
            </div>
          </div>
        </div>

        <div className="print-section">
          <h2>Lifestyle Breakdown</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Habit Details</th>
                <th>Calculated Footprint</th>
                <th>Share %</th>
              </tr>
            </thead>
            <tbody>
              {preview.breakdown.map((b) => (
                <tr key={b.key}>
                  <td><strong>{b.label}</strong></td>
                  <td>
                    {b.key === "travel" && `${values.dailyTravelKm} km/day via ${values.travelMode}`}
                    {b.key === "food" && `${values.dietType} (${values.weeklyMeatMeals} meat meals/wk)`}
                    {b.key === "electricity" && `${values.monthlyElectricityUnits} kWh/mo`}
                  </td>
                  <td>{b.annualKg} kg CO₂</td>
                  <td>{b.share}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="print-section" style={{ marginTop: "40px" }}>
          <h2>Goal Coach & Action Plan</h2>
          <div className="print-card" style={{ marginBottom: "16px", background: "#f0fdf4", borderColor: "#bbf7d0" }}>
            <span>Monthly Target Strategy</span>
            <p style={{ margin: "5px 0 0", color: "#166534" }}>To achieve your {values.targetReductionPercent}% reduction goal, you need to cut exactly <strong>{monthlyGap} kg</strong> of CO₂ from your footprint this month. Focus on reducing your <strong>{focusArea.label.toLowerCase()}</strong> emissions first.</p>
          </div>
          <table className="print-table">
            <thead>
              <tr>
                <th>Priority</th>
                <th>Action Recommendation</th>
                <th>Est. Savings</th>
              </tr>
            </thead>
            <tbody>
              {preview.suggestions.map((s, i) => (
                <tr key={s.title}>
                  <td><strong>#{i + 1}</strong></td>
                  <td>
                    <strong style={{ display: "block", color: "#111827", marginBottom: "4px" }}>{s.title}</strong>
                    <span style={{ fontSize: "10pt", color: "#4b5563" }}>{s.description}</span>
                  </td>
                  <td><strong style={{ color: "#059669" }}>~{s.estimatedSavingsKg} kg/yr</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div style={{ textAlign: "center", marginTop: "60px", fontSize: "9pt", color: "#9ca3af" }}>
          Generated safely by Carbon Compass - Empowering Personal Sustainability
        </div>
      </div>

      <footer className="app-footer">
        <p>Carbon Compass © {new Date().getFullYear()} · Empowering personal sustainability</p>
      </footer>
    </main>
  );
}
