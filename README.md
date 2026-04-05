# FinPulse
FinPulse - Your Financial Vital Signs in One Screen


## Inspiration

Most people know they should save more. They just don't know *how much*, *when*, or *where* the money is hiding. Traditional budgeting apps show you a spreadsheet of the past — we wanted to build something that acts like a financial doctor: diagnosing problems, prescribing specific actions, and checking back in to see if you actually followed through.

We were also struck by a simple stat: **nearly 60% of Americans can't cover a $1,000 emergency**. Not because they don't earn enough — but because no tool has ever made micro-saving frictionless or behavioral nudges personal enough to stick.

FinPulse started as an answer to one question: *What if your bank statement could talk back?*

---

## What It Does

FinPulse is a single-page AI financial health companion with intelligent modules:

### AI Insights
Upload a bank statement (PDF or CSV) and receive an instant **Financial Health Score (0–100)** powered by multi-factor analysis. An interactive donut chart breaks down spending by category, and five AI diagnostics — each with a severity indicator — surface the findings that matter most.

### Optimize
AI-generated savings suggestions, each with projected impact at **1 month / 1 year / 5 years invested**. Accept a suggestion to earn **Pulse Points**. Upload next month's statement and the AI *verifies which changes you actually made* — awarding points automatically. Progress through badges: Starter → Saver → Optimizer → Master.

### Invest
Once your emergency buffer is healthy, FinPulse generates a **personalized investment allocation** (Conservative / Moderate / Moderate-Aggressive) based on your financial health score. Live market data covers VOO, QQQ, AAPL, MSFT, SCHD, VNQ, BND, and HYSA — with BUY/HOLD signals, risk levels, and AI reasoning for each position.

### Ask Agent
A fully agentic AI chat interface that knows your specific numbers. Ask about your coffee spending, debt payoff strategy, what a Roth IRA is, or how Pulse Points work. Supports file and image uploads inline. Quick-prompt buttons surface the most common questions automatically.

### Emergency Buffer
30-day cash flow prediction with shortfall detection, an auto-save micro-engine that finds surplus on low-spend days, and a daily anomaly detector that flags unusual charges.

---

## How We Built It

FinPulse is built as a **React single-page application** with no backend server — all intelligence runs through the **Anthropic Claude API** at runtime.

**Architecture:**
- **Frontend**: React with Tailwind CSS, Recharts for data visualization (radar chart, donut chart, bar charts, line charts)
- **AI Engine**: Claude Sonnet via the Anthropic API — handles statement parsing, health score calculation, diagnostic generation, nudge simulation, investment allocation, and agentic chat
- **File Processing**: Client-side PDF and CSV parsing with structured prompt injection into Claude's context window
- **State Management**: React hooks with live recalculation on every input change

**Key technical approaches:**

*Financial Health Score* — A weighted composite of savings rate, expense volatility, emergency buffer coverage, and debt-to-income ratio, normalized to 0–100.

*Cash Flow Prediction* — Time-series analysis over transaction history identifies spending patterns and projects forward 30 days, flagging predicted shortfall windows.

*Micro-Savings Engine* — Identifies "low-spend days" where actual spending fell below rolling average, calculates transferable surplus, and recommends automated round-up amounts.

*Behavioral Nudges* — Before a flagged purchase category is triggered, the AI simulates three interventions: the 48-hour rule, opportunity cost reframing ("that's $X/year invested"), and a cooling-off predictor based on past category regret.

*Verification Loop* — When a second statement is uploaded, the AI diffs category-level spending against accepted suggestions and awards Pulse Points for confirmed behavioral changes.

---

## Challenges We Faced

**Prompt engineering for structured financial output** — Getting Claude to return consistent, machine-parseable JSON across wildly varied statement formats required extensive prompt iteration and fallback parsing logic.

**Making AI feel personal, not generic** — Early versions of the diagnostic copy felt like a financial textbook. We rewrote the prompting layer to anchor every insight to the user's actual numbers and peer benchmarks, so outputs feel like advice from someone who actually read your statement.

**The verification problem** — Rewarding behavioral change (not just advice consumption) required designing a diffing system that could compare two months of spending at the category level and attribute changes to specific accepted suggestions — a surprisingly nuanced matching problem.

**Real-time interactivity** — Making every slider, input, and toggle trigger instant recalculation without API latency required careful separation of locally-computed estimates from AI-generated insights.

---

## What We Learned

- Behavioral economics framing (opportunity cost, identity-based goals, streaks) dramatically outperforms pure data presentation for financial engagement
- The gap between "I have a budget app" and "I changed my spending" is almost entirely an *interface* problem, not an information problem
- LLMs are remarkably capable financial analysts when given clean structured context — the hard work is in the data pipeline, not the model

---

## What's Next

- **Plaid integration** for automatic transaction sync (removing the upload step entirely)
- **Goal-setting module** — FinPulse prescribes a savings target; you set a deadline; the AI adjusts micro-save amounts weekly
- **Social benchmarking** — opt-in anonymous comparison with FinPulse users in your city and income bracket
- **Mobile app** with push notifications for real-time behavioral nudges at the point of purchase
