# Domino Sky: Flight Disruption Cascade & Recovery Simulator

> **"A 90-minute storm at Mumbai can cancel a Bengaluru–Kolkata flight five hours later."**  
> Domino Sky is an offline-first flight disruption cascade simulator and AI-augmented recovery copilot modeling aircraft rotation knock-ons, passenger connection breaks, and legal crew duty timeouts across India's domestic airspace.

---

## 🌟 What Makes Domino Sky Truly Unique

Domino Sky goes far beyond standard flight status dashboards by integrating 5 signature aviation innovations:

1. **⚡ Kinetic Domino DAG (Causal Graph)**:
   An interactive directed acyclic graph visualizing how disruptions topple downstream operations:
   `Patient Zero Trigger (BOM Closure) ➔ Primary Held Flight ➔ Rotational Knock-On ➔ Broken Connection ➔ Stranded Passengers`.
2. **📻 Tactical ATC Voice Communications**:
   Synthesizes authentic Air Traffic Control radio chatter and priority NOTAM broadcasts using Web Speech and Web Audio APIs (with realistic radio squelch, beeps, and audio oscilloscopes—100% offline).
3. **💔 Passenger Misery Index (PMI) & DGCA CAR Compliance**:
   Calculates cumulative lost passenger hours alongside mandatory statutory airline compensation liability under **DGCA Civil Aviation Requirements (CAR) Section 3, Series M, Part IV** (₹5,000–₹10,000 per passenger plus hotel care obligations).
4. **🌌 Multiverse "What-If" Dual-Timeline Divergence**:
   Directly compares **Timeline α (Unmitigated Disruption Disaster)** against **Timeline β (Domino Sky AI Recovery)** side-by-side, calculating the *Divergence Dividend* in saved minutes and Rupees.
5. **🛡️ Number Guard Anti-Hallucination Trust Layer**:
   Cryptographic-grade validation of all AI text against the deterministic engine ground-truth. Includes an interactive hover audit tool and a live **AI Tamper Test** button that demonstrates real-time detection and blocking of numeric hallucinations.

---

## ⚡ 2-Minute Demo Script (For Judges & Evaluators)

| Step | Action | What to Look For |
|---|---|---|
| **1. Clean Baseline** | Launch app or click **Reset** | Note the KPI strip: **0 min delay**, **0 cancellations**, **70/70 on-time flights**, and all 16 crews legal. The network map shows green flight arcs. |
| **2. Trigger Cascade** | Click **"⚡ 2-Min Demo Scenario"** (Navbar) | Injects a 90-minute storm at **Mumbai (BOM) from 14:00 to 15:30**. Notice BOM pulsing in red with storm warning ripples, and listen to the **ATC voice radio broadcast**. |
| **3. Watch Cascade Replay** | Press **REPLAY** on the Time Scrubber | Watch the time slider advance past 14:00. Aircraft entering or departing Mumbai turn from **Green ➔ Amber ➔ Red**. Downstream flights on the same aircraft rotations (e.g. into Ahmedabad, Delhi, Kolkata) turn amber even though their local weather is 100% clear! |
| **4. Inspect Delay DNA™** | Click flight **DS0405** or any delayed row in the **Flight Table** | The **Delay DNA™ modal** opens. Inspect the **Causal Blame Trace**: observe the exact chronological lineage from root Mumbai weather closure to aircraft turnaround knock-on. Look at the green badge: **"Verified Invariant: ∑(causes) = Flight Delay"**. |
| **5. Kinetic Domino DAG** | Click the **"⚡ Kinetic Domino DAG"** tab | View the interactive causal branching tree showing how the disruption toppled downstream aircraft, flights, and connections. |
| **6. Check Passenger Misery** | Look at the **PMI & DGCA Compliance Strip** | View total lost passenger hours and statutory compensation liability under DGCA CAR Section 3. |
| **7. Number Guard in Action** | Look at the AI Dispatcher text | Hover over any number in the text (e.g. `45 minutes`, `142 passengers`) to see the tooltip: `Verified by engine: ...`. The green badge shows: **"Verified by Engine: N/N numbers match 100%"**. |
| **8. Run AI Tamper Test** | Click **"⚡ AI Tamper Test"** | Injects deliberate numeric hallucinations into the AI text. **The Number Guard catches it instantly**, turns red, blocks the hallucinated sentences, and displays the verified fallback! |
| **9. Multiverse Divergence** | Switch to the **"🌌 Multiverse What-If"** tab | Compare Timeline α vs Timeline β to see the net savings dividend before and after intervention. |
| **10. Accept & Apply Plan** | Click **"Accept & Apply Plan"** | Confetti triggers! The network re-simulates with the chosen intervention applied, showing immediate Before vs After savings in green deltas. |

---

## 🏗️ Architecture & Component Flow

```
                      ┌────────────────────────────────────────┐
                      │    Organisers' Dataset (JSON/CSV)      │
                      │ 16 Airports · 70 Flights · 18 Aircraft │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │          loadDataset() Adapter         │
                      │  Health Validation & Integrity Checks  │
                      └───────────────────┬────────────────────┘
                                          │
              ┌───────────────────────────┴───────────────────────────┐
              ▼                                                       ▼
   [ Airport Closures ]                                    [ Recovery Actions ]
   (BOM 14:00-15:30, etc.)                                 (Spare Swaps, Holds)
              │                                                       │
              └───────────────────────────┬───────────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │      engine.ts (Deterministic Core)    │
                      │  • Airport closure ground holds        │
                      │  • Rotational turnaround propagation   │
                      │  • Passenger connection evaluation     │
                      │  • DGCA crew duty meter tracking       │
                      │  • Causal blame lineage (Delay DNA)    │
                      │  • Full simulation runtime: < 1 ms     │
                      └───────────────────┬────────────────────┘
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    ▼                                           ▼
       ┌─────────────────────────┐                 ┌─────────────────────────┐
       │     Simulation KPIs     │                 │   Recovery Candidates   │
       │ Delays, Stranded Pax,   │                 │ Ranked by Transparent   │
       │ Cancellations, Costs    │                 │ Cost Score Deltas       │
       └────────────┬────────────┘                 └────────────┬────────────┘
                    │                                           │
                    └─────────────────────┬─────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │          AI Operations Officer         │
                      │  • Receives ONLY Engine Ground-Truth   │
                      │  • Selects best candidate & explains   │
                      │  • Strictly prohibited from computing  │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │     NUMBER GUARD (Anti-Hallucination)  │
                      │  • Regex numeric claim extraction      │
                      │  • Bi-directional ground-truth check   │
                      │  • Sentence blocking & auto-fallback   │
                      │  • Interactive audit hover metadata    │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │    Control Tower UI (React + Vite)     │
                      │  • Vector Radar Map with Flight Arcs   │
                      │  • FIR Airspace Boundaries             │
                      │  • Kinetic Domino Causal DAG Tree      │
                      │  • Tactical ATC Voice Synthesizer      │
                      │  • 05:00-24:00 Dynamic Time Scrubber   │
                      │  • Rotational Gantt Chart & Tables     │
                      │  • Multiverse Timeline Comparison      │
                      │  • Delay DNA Causal Lineage Modal      │
                      └────────────────────────────────────────┘
```

---

## 🔒 Determinism Guarantee: How It Works

- **Zero Randomness**: No `Math.random()`, no non-deterministic hash iteration, no network latency variations.
- **Pure Functions**: `runSimulation(dataset, closures, options)` is a pure function. Given identical inputs, it outputs bit-for-bit identical flight delays, statuses, cause chains, and KPI metrics.
- **Reproducibility Test**: The test suite executes 10 consecutive simulation runs under identical storm conditions and asserts strict JSON equality across every flight state.
- **Sub-50ms Performance**: The entire 70-flight network re-simulates in **~0.8 milliseconds**, allowing real-time 60fps scrubbing and instantaneous recovery searches across 20+ candidate combinations.

---

## 💻 Setup & Quick Start

```powershell
cd domino-sky
npm install
npm test
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 🧪 Unit Test Suite

Run the full suite using:
```powershell
npm test
```

### Tests Covered:
- **`engine.test.ts`**:
  - `validates official dataset integrity on load` (16 airports, 70 flights, 18 aircraft, 21 connections, 16 crews, 2 spares)
  - `guarantees zero-disruption baseline equals the published schedule` (0 delay, 0 cancelled, 0 stranded)
  - `guarantees absolute determinism: same input -> same output across 10 runs`
  - `guarantees the mathematical invariant: sum of cause-chain minutes strictly equals each flight delay`
  - `propagates rotational delay to downstream flights on the same aircraft`
- **`validator.test.ts`**:
  - `verifies 100% of numbers when claims match engine output`
  - `detects hallucinated / tampered numbers and blocks offending sentences`
  - `associates verified numbers with their exact engine source`
