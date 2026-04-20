"use client";

import { FormEvent, useEffect, useState } from "react";
import { calculateCarbonFootprint } from "@/lib/carbon";
import { CarbonDashboardResponse, CarbonEntryRecord, CarbonFormValues } from "@/lib/types";

const defaultValues: CarbonFormValues = {
  profileId: "",
  name: "",
  email: "",
  travelMode: "car",
  dailyTravelKm: 12,
  monthlyElectricityUnits: 180,
  dietType: "vegetarian",
  weeklyMeatMeals: 0,
  targetReductionPercent: 15
};

const travelLabels: Record<CarbonFormValues["travelMode"], string> = {
  car: "Private car",
  bike: "Bike or scooter",
  bus: "Bus",
  train: "Train or metro",
  flight: "Frequent flights"
};

const dietLabels: Record<CarbonFormValues["dietType"], string> = {
  vegan: "Vegan",
  vegetarian: "Vegetarian",
  nonVegetarian: "Non-vegetarian"
};

function createProfileId() {
  return `evs-${Math.random().toString(36).slice(2, 10)}`;
}

function getFocusArea(
  breakdown: ReturnType<typeof calculateCarbonFootprint>["breakdown"]
) {
  return [...breakdown].sort((a, b) => b.annualKg - a.annualKg)[0];
}

function getMonthlyGap(currentAnnualKg: number, targetAnnualKg: number) {
  return Math.max(0, Math.round((currentAnnualKg - targetAnnualKg) / 12));
}

function getLifestyleSummary(values: CarbonFormValues) {
  return `${travelLabels[values.travelMode]} commute, ${dietLabels[values.dietType].toLowerCase()} diet, ${values.monthlyElectricityUnits} kWh/month electricity use.`;
}

export function Dashboard() {
  const [values, setValues] = useState<CarbonFormValues>(defaultValues);
  const [dashboard, setDashboard] = useState<CarbonDashboardResponse>({
    latestEntry: null,
    history: [],
    trend: []
  });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedProfileId = window.localStorage.getItem("evs-profile-id") ?? createProfileId();
    const savedName = window.localStorage.getItem("evs-name") ?? "";
    const savedEmail = window.localStorage.getItem("evs-email") ?? "";

    window.localStorage.setItem("evs-profile-id", savedProfileId);
    setValues((current) => ({ ...current, profileId: savedProfileId, name: savedName, email: savedEmail }));
    void loadDashboard(savedProfileId);
  }, []);

  async function loadDashboard(profileId: string) {
    try {
      const response = await fetch(`/api/carbon?profileId=${encodeURIComponent(profileId)}`);
      const data = (await response.json()) as CarbonDashboardResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load history");
      }

      setDashboard(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load history");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setStatus("");

    try {
      window.localStorage.setItem("evs-name", values.name);
      window.localStorage.setItem("evs-email", values.email);

      const response = await fetch("/api/carbon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(values)
      });

      const data = (await response.json()) as { entry?: CarbonEntryRecord; error?: string };

      if (!response.ok || !data.entry) {
        throw new Error(data.error ?? "Unable to save entry");
      }

      const entry = data.entry;

      setDashboard((current) => ({
        latestEntry: entry,
        history: [entry, ...current.history].slice(0, 12),
        trend: [...current.trend.filter((item) => item.monthKey !== entry.monthKey), {
          monthKey: entry.monthKey,
          totalAnnualKg: entry.calculation.totalAnnualKg
        }].slice(-6)
      }));

      setStatus("Your carbon report has been updated and saved. You can now track progress month by month.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save entry");
    } finally {
      setLoading(false);
    }
  }

  const preview = calculateCarbonFootprint(values);
  const focusArea = getFocusArea(preview.breakdown);
  const latestFootprint = dashboard.latestEntry?.calculation.totalAnnualKg ?? preview.totalAnnualKg;
  const trend = dashboard.trend.length
    ? dashboard.trend
    : [{ monthKey: "Current", totalAnnualKg: preview.totalAnnualKg }];
  const maxTrendValue = Math.max(...trend.map((item) => item.totalAnnualKg), 1);
  const monthlyGap = getMonthlyGap(preview.totalAnnualKg, preview.targetAnnualKg);
  const progressDelta = dashboard.history[1]
    ? dashboard.history[0].calculation.totalAnnualKg - dashboard.history[1].calculation.totalAnnualKg
    : 0;

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="brand-kicker">Carbon Compass</p>
          <strong className="brand-title">Personal Sustainability Dashboard</strong>
        </div>
        <div className="topbar-badges">
          <span className="chip chip-ghost">India-first factors</span>
          <span className="chip chip-ghost">Firestore tracking</span>
        </div>
      </section>

      <section className="hero-panel">
        <div className="hero-main">
          <span className="eyebrow">Real-life carbon tracking for students and families</span>
          <h1>See what your lifestyle costs the planet and what to change first.</h1>
          <p className="hero-copy-text">
            Built from your EVS brief, but designed like a real product: a guided calculator, a personal impact score,
            monthly progress tracking, and practical actions people can use in daily life.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary" type="button" onClick={() => document.getElementById("calculator")?.scrollIntoView()}>
              Start assessment
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => window.print()}>
              Export report
            </button>
          </div>
          <div className="metric-strip">
            <article className="metric-card">
              <span className="metric-label">Current annual footprint</span>
              <strong>{latestFootprint} kg</strong>
            </article>
            <article className="metric-card">
              <span className="metric-label">Main impact area</span>
              <strong>{focusArea.label}</strong>
            </article>
            <article className="metric-card">
              <span className="metric-label">Target monthly reduction</span>
              <strong>{monthlyGap} kg</strong>
            </article>
          </div>
        </div>

        <aside className="hero-sidecard">
          <div className="hero-sidecard-header">
            <span className={`score-pill score-${preview.rating}`}>{preview.ratingLabel}</span>
            <strong>{preview.totalAnnualTonnes} t CO2/year</strong>
          </div>
          <p className="hero-sidecard-copy">{preview.headline}</p>
          <div className="comparison-grid">
            <div>
              <span>India average</span>
              <strong>{preview.indiaAverageKg} kg</strong>
            </div>
            <div>
              <span>Global average</span>
              <strong>{preview.globalAverageKg} kg</strong>
            </div>
          </div>
          <div className="focus-card">
            <span className="focus-label">Lifestyle snapshot</span>
            <p>{getLifestyleSummary(values)}</p>
          </div>
        </aside>
      </section>

      <section className="dashboard-grid">
        <div className="left-column">
          <section className="surface section-block" id="calculator">
            <div className="section-heading">
              <div>
                <span className="section-kicker">Guided Calculator</span>
                <h2>Build your personal carbon profile</h2>
              </div>
              <p>
                Fill in realistic daily values. The calculator updates instantly and saves each submission as a monthly
                check-in.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="form-stack">
              <div className="form-card-grid">
                <section className="form-card">
                  <div className="card-intro">
                    <span className="card-step">01</span>
                    <div>
                      <h3>Profile</h3>
                      <p>Identify the user and keep future check-ins linked to the same history.</p>
                    </div>
                  </div>
                  <div className="field-grid">
                    <label className="field">
                      <span>Name</span>
                      <input
                        value={values.name}
                        onChange={(event) => setValues({ ...values, name: event.target.value })}
                        placeholder="Your full name"
                      />
                    </label>
                    <label className="field">
                      <span>Email</span>
                      <input
                        type="email"
                        value={values.email}
                        onChange={(event) => setValues({ ...values, email: event.target.value })}
                        placeholder="you@example.com"
                      />
                    </label>
                  </div>
                </section>

                <section className="form-card">
                  <div className="card-intro">
                    <span className="card-step">02</span>
                    <div>
                      <h3>Mobility</h3>
                      <p>Travel habits usually dominate the footprint for active commuters.</p>
                    </div>
                  </div>
                  <div className="field-grid">
                    <label className="field">
                      <span>Primary travel mode</span>
                      <select
                        value={values.travelMode}
                        onChange={(event) =>
                          setValues({ ...values, travelMode: event.target.value as CarbonFormValues["travelMode"] })
                        }
                      >
                        <option value="car">Car</option>
                        <option value="bike">Bike or scooter</option>
                        <option value="bus">Bus</option>
                        <option value="train">Train or metro</option>
                        <option value="flight">Frequent flights</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Average daily distance</span>
                      <input
                        type="number"
                        min="0"
                        value={values.dailyTravelKm}
                        onChange={(event) => setValues({ ...values, dailyTravelKm: Number(event.target.value) })}
                      />
                      <small>Enter the total kilometers you usually travel in a day.</small>
                    </label>
                  </div>
                </section>

                <section className="form-card">
                  <div className="card-intro">
                    <span className="card-step">03</span>
                    <div>
                      <h3>Home energy</h3>
                      <p>Use your electricity bill or a realistic estimate of monthly units consumed.</p>
                    </div>
                  </div>
                  <div className="field-grid single-column">
                    <label className="field">
                      <span>Monthly electricity use (kWh)</span>
                      <input
                        type="number"
                        min="0"
                        value={values.monthlyElectricityUnits}
                        onChange={(event) => setValues({ ...values, monthlyElectricityUnits: Number(event.target.value) })}
                      />
                    </label>
                  </div>
                </section>

                <section className="form-card">
                  <div className="card-intro">
                    <span className="card-step">04</span>
                    <div>
                      <h3>Food and goals</h3>
                      <p>Diet patterns matter across the whole year, especially with regular meat consumption.</p>
                    </div>
                  </div>
                  <div className="field-grid">
                    <label className="field">
                      <span>Diet type</span>
                      <select
                        value={values.dietType}
                        onChange={(event) =>
                          setValues({ ...values, dietType: event.target.value as CarbonFormValues["dietType"] })
                        }
                      >
                        <option value="vegan">Vegan</option>
                        <option value="vegetarian">Vegetarian</option>
                        <option value="nonVegetarian">Non-vegetarian</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Meat meals per week</span>
                      <input
                        type="number"
                        min="0"
                        value={values.weeklyMeatMeals}
                        onChange={(event) => setValues({ ...values, weeklyMeatMeals: Number(event.target.value) })}
                      />
                      <small>Use 0 for vegetarian or vegan diets.</small>
                    </label>
                    <label className="field field-full">
                      <span>Reduction goal</span>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={values.targetReductionPercent}
                        onChange={(event) => setValues({ ...values, targetReductionPercent: Number(event.target.value) })}
                      />
                      <small>Target: {values.targetReductionPercent}% reduction over the next few months.</small>
                    </label>
                  </div>
                </section>
              </div>

              <div className="form-actions">
                <button className="btn btn-primary" type="submit" disabled={loading}>
                  {loading ? "Saving report..." : "Save monthly check-in"}
                </button>
                <button className="btn btn-secondary" type="button" onClick={() => window.print()}>
                  Download PDF report
                </button>
              </div>

              {status ? <div className="status-banner">{status}</div> : null}
              {error ? <div className="error-banner">{error}</div> : null}
            </form>
          </section>

          <section className="surface section-block">
            <div className="section-heading compact">
              <div>
                <span className="section-kicker">Progress</span>
                <h2>Monthly trend</h2>
              </div>
              <p>See whether your footprint is moving in the right direction with each saved check-in.</p>
            </div>
            <div className="trend-shell">
              <div className="trend-header">
                <div>
                  <span className="trend-label">Latest change</span>
                  <strong className={progressDelta <= 0 ? "trend-good" : "trend-bad"}>
                    {progressDelta === 0 ? "No previous data yet" : `${progressDelta > 0 ? "+" : ""}${progressDelta} kg`}
                  </strong>
                </div>
                <div>
                  <span className="trend-label">Target annual footprint</span>
                  <strong>{preview.targetAnnualKg} kg</strong>
                </div>
              </div>
              <div className="history-chart">
                {trend.map((point) => (
                  <div className="history-bar" key={point.monthKey}>
                    <span className="chart-value">{point.totalAnnualKg}</span>
                    <div className="column" style={{ height: `${Math.max((point.totalAnnualKg / maxTrendValue) * 220, 30)}px` }} />
                    <span className="chart-label">{point.monthKey}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="surface section-block">
            <div className="section-heading compact">
              <div>
                <span className="section-kicker">History</span>
                <h2>Saved reports</h2>
              </div>
              <p>Every save becomes a timestamped entry you can show in your final EVS presentation.</p>
            </div>
            <div className="history-timeline">
              {dashboard.history.length ? (
                dashboard.history.map((item) => (
                  <article className="timeline-card" key={item.id}>
                    <div className="timeline-head">
                      <strong>{item.createdAt.slice(0, 10)}</strong>
                      <span className={`score-pill score-${item.calculation.rating}`}>{item.calculation.ratingLabel}</span>
                    </div>
                    <p>{item.calculation.totalAnnualKg} kg CO2 per year</p>
                    <small>Goal {item.targetReductionPercent}% | {travelLabels[item.travelMode]} | {dietLabels[item.dietType]}</small>
                  </article>
                ))
              ) : (
                <article className="timeline-card">
                  <strong>No reports saved yet</strong>
                  <p>Your first check-in will appear here and start your progress journey.</p>
                </article>
              )}
            </div>
          </section>
        </div>

        <div className="right-column">
          <section className="surface report-panel">
            <div className="report-topline">
              <span className={`score-pill score-${preview.rating}`}>{preview.ratingLabel}</span>
              <span className="report-badge">Live assessment</span>
            </div>
            <div className="report-main-number">
              <strong>{preview.totalAnnualKg}</strong>
              <span>kg CO2 / year</span>
            </div>
            <p className="report-copy">{preview.headline}</p>
            <div className="report-mini-metrics">
              <article>
                <span>Monthly projection</span>
                <strong>{preview.monthlyProjectionKg} kg</strong>
              </article>
              <article>
                <span>Reduction target</span>
                <strong>{preview.targetAnnualKg} kg</strong>
              </article>
            </div>
          </section>

          <section className="surface section-block">
            <div className="section-heading compact">
              <div>
                <span className="section-kicker">Breakdown</span>
                <h2>Where the emissions come from</h2>
              </div>
            </div>
            <div className="impact-list">
              {preview.breakdown.map((item) => (
                <article className="impact-card" key={item.key}>
                  <div className="impact-head">
                    <strong>{item.label}</strong>
                    <span>{item.annualKg} kg</span>
                  </div>
                  <p>{item.share}% of your annual footprint</p>
                  <div className="bar">
                    <span style={{ width: `${item.share}%` }} />
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="surface section-block">
            <div className="section-heading compact">
              <div>
                <span className="section-kicker">Action Plan</span>
                <h2>What to do next</h2>
              </div>
              <p>The app prioritizes realistic steps based on your highest-emission category.</p>
            </div>
            <div className="action-callout">
              <span>Main opportunity</span>
              <strong>{focusArea.label}</strong>
              <p>
                This is currently your biggest contributor, so changes here will reduce your footprint fastest.
              </p>
            </div>
            <div className="suggestions-list">
              {preview.suggestions.map((suggestion, index) => (
                <article className="suggestion-card" key={suggestion.title}>
                  <div className="suggestion-rank">#{index + 1}</div>
                  <div>
                    <strong>{suggestion.title}</strong>
                    <p>{suggestion.description}</p>
                    <small>Estimated yearly saving: {suggestion.estimatedSavingsKg} kg CO2</small>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="surface section-block">
            <div className="section-heading compact">
              <div>
                <span className="section-kicker">Goal Coach</span>
                <h2>Stay on track</h2>
              </div>
            </div>
            <div className="coach-grid">
              <article className="coach-card">
                <span>Target reduction</span>
                <strong>{values.targetReductionPercent}%</strong>
                <p>Keep lowering your annual number until you reach {preview.targetAnnualKg} kg.</p>
              </article>
              <article className="coach-card">
                <span>Monthly gap</span>
                <strong>{monthlyGap} kg</strong>
                <p>That is the approximate monthly drop needed from your current baseline.</p>
              </article>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
