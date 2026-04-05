import { useState, useEffect, useMemo, useRef, useCallback } from "react";

/* ----------------------------------------------------------------
   FinPulse — AI Financial Wellness · Scarlet Hacks 2026
   Enhanced with: stock predictions, investment suggestions,
   PDF parsing, aesthetic redesign, current stock status
   ---------------------------------------------------------------- */

// -- palette: soft, muted, aesthetic --
const bg       = "#F7F5F2";
const surface  = "#FFFFFF";
const surface2 = "#F2EFE9";
const border   = "#E8E3DA";
const ink      = "#1C1917";
const dim      = "#78716C";
const muted    = "#A8A29E";
const sage     = "#5C7A6B";
const sageSoft = "#EBF2EE";
const rose     = "#A85C5C";
const roseSoft = "#F7EDEC";
const gold     = "#8A7340";
const goldSoft = "#F5F0E6";
const sky      = "#4A6FA5";
const skySoft  = "#EBF0F8";
const lavSoft  = "#F0EDF7";
const lav      = "#6B5F8A";

const chartColors = [sage, rose, sky, gold, lav, "#6B8A7A", "#A07B4F", "#5A7EA8"];

// -- helpers --
const usd = (n, dec = 0) => {
  const abs = Math.abs(n);
  const str = dec > 0
    ? abs.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec })
    : abs.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return n < 0 ? `-$${str}` : `$${str}`;
};
const pct = (n) => `${(n * 100).toFixed(1)}%`;

// -- stock data (simulated real-time based on April 5, 2026) --
const STOCKS = [
  { ticker: "SPY",  name: "S&P 500 ETF",      price: 558.42,  change: -0.87, chgPct: -0.16, sector: "Index",   rec: "hold",   pe: 23.1,  yield: 1.3  },
  { ticker: "QQQ",  name: "Nasdaq 100 ETF",    price: 464.18,  change: +2.34, chgPct: +0.51, sector: "Index",   rec: "buy",    pe: 29.4,  yield: 0.6  },
  { ticker: "AAPL", name: "Apple Inc.",         price: 214.65,  change: -1.22, chgPct: -0.57, sector: "Tech",    rec: "hold",   pe: 33.2,  yield: 0.5  },
  { ticker: "MSFT", name: "Microsoft Corp.",    price: 418.30,  change: +3.10, chgPct: +0.75, sector: "Tech",    rec: "buy",    pe: 35.8,  yield: 0.7  },
  { ticker: "VTI",  name: "Total Market ETF",   price: 245.90,  change: -0.45, chgPct: -0.18, sector: "Index",   rec: "buy",    pe: 22.8,  yield: 1.4  },
  { ticker: "SCHD", name: "Dividend ETF",       price: 83.20,   change: +0.38, chgPct: +0.46, sector: "Div",     rec: "buy",    pe: 17.4,  yield: 3.5  },
  { ticker: "BND",  name: "Bond ETF",           price: 72.15,   change: +0.12, chgPct: +0.17, sector: "Bonds",   rec: "hold",   pe: null,  yield: 4.2  },
  { ticker: "VNQ",  name: "Real Estate ETF",    price: 88.60,   change: -0.92, chgPct: -1.03, sector: "REIT",    rec: "hold",   pe: 28.6,  yield: 3.9  },
];

// market sentiment for today
const MARKET_SENTIMENT = {
  date: "Apr 5, 2026",
  sp500: { level: 558.42, weekChg: -1.2, ytdChg: +3.8 },
  sentiment: "Cautious",
  vix: 18.4,
  note: "Markets digesting Fed rate pause signal. Consumer spending data due Monday.",
};

// -- pdf text extraction helper (basic) --
function extractTextFromPDF(arrayBuffer) {
  // Simple heuristic: look for ASCII text patterns in PDF binary
  // Real apps would use pdf.js; this extracts readable strings
  const bytes = new Uint8Array(arrayBuffer);
  let text = "";
  for (let i = 0; i < bytes.length - 1; i++) {
    const c = bytes[i];
    if (c >= 32 && c < 127) text += String.fromCharCode(c);
    else if (c === 10 || c === 13) text += "\n";
  }
  // Try to find CSV-like patterns in the extracted text
  const lines = text.split("\n").filter(l => l.trim());
  const csvLike = lines.filter(l => (l.match(/,/g) || []).length >= 3);
  return csvLike.join("\n");
}

// -- csv parser --
function loadCSV(raw) {
  const rows = raw.trim().split("\n");
  if (rows.length < 2) return [];
  // try to find header row
  let startIdx = 1;
  const header = rows[0].toLowerCase();
  if (!header.includes("date") && !header.includes("amount")) startIdx = 0;
  return rows.slice(startIdx).filter(r => r.trim()).map(r => {
    const cols = r.split(",");
    return {
      date:     cols[0]?.trim() || "",
      amount:   parseFloat(cols[1]) || 0,
      category: cols[2]?.trim() || "Other",
      merchant: cols[3]?.trim() || "",
      type:     (cols[4] || "").trim(),
    };
  }).filter(r => r.date && r.amount !== 0);
}

// -- analysis engine --
function crunch(txns) {
  if (!txns.length) return null;

  const expenses = txns.filter(t => t.type === "expense");
  const incomes  = txns.filter(t => t.type === "income");

  const totalIn  = incomes.reduce((s, t) => s + t.amount, 0);
  const totalOut = Math.abs(expenses.reduce((s, t) => s + t.amount, 0));

  const monthSet = new Set(txns.map(t => t.date.slice(0, 7)));
  const months   = Math.max(1, monthSet.size);
  const moIn     = totalIn / months;
  const moOut    = totalOut / months;
  const surplus  = moIn - moOut;
  const rate     = moIn > 0 ? surplus / moIn : 0;
  const annualSurplus = surplus * 12;

  // category totals
  const catMap = {};
  expenses.forEach(t => {
    const c = t.category;
    catMap[c] = (catMap[c] || 0) + Math.abs(t.amount);
  });
  const categories = Object.entries(catMap)
    .map(([name, total]) => ({ name, total, monthly: total / months, pct: totalOut > 0 ? total / totalOut : 0 }))
    .sort((a, b) => b.total - a.total);
  categories.forEach((c, i) => { c.color = chartColors[i % chartColors.length]; });

  // monthly breakdown
  const monthlyData = {};
  txns.forEach(t => {
    const m = t.date.slice(0, 7);
    if (!monthlyData[m]) monthlyData[m] = { income: 0, expense: 0, month: m };
    if (t.type === "income") monthlyData[m].income += t.amount;
    else monthlyData[m].expense += Math.abs(t.amount);
  });
  const history = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
  history.forEach(h => { h.savings = h.income - h.expense; h.rate = h.income > 0 ? h.savings / h.income : 0; });

  // score
  const dtiProxy = Math.min(1, moOut / (moIn || 1));
  const score = Math.round(Math.max(0, Math.min(100, rate * 220 + (1 - dtiProxy) * 70 + 15)));

  // micro-spending
  const coffeeItems = expenses.filter(t => t.category === "Coffee");
  const cofTotal    = Math.abs(coffeeItems.reduce((s, t) => s + t.amount, 0));
  const cofCount    = coffeeItems.length;
  const cofAvg      = cofCount > 0 ? cofTotal / cofCount : 0;
  const snackTotal  = Math.abs(expenses.filter(t => t.category === "Snacks").reduce((s, t) => s + t.amount, 0));
  const shopItems   = expenses.filter(t => t.category === "Shopping" && Math.abs(t.amount) > 50);
  const impulseOut  = Math.abs(shopItems.reduce((s, t) => s + t.amount, 0));
  const subItems    = expenses.filter(t => t.category === "Subscriptions");
  const subOut      = Math.abs(subItems.reduce((s, t) => s + t.amount, 0));
  const subMo       = subOut / months;
  const dinOut      = catMap["Dining"] || 0;
  const dinMo       = dinOut / months;
  const merchCount  = {};
  coffeeItems.forEach(t => { merchCount[t.merchant] = (merchCount[t.merchant] || 0) + 1; });
  const topCoffeeMerchant = Object.entries(merchCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "coffee shops";

  const recent = [...txns].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  // diagnostics
  const findings = [];
  if (rate < 0.10) findings.push({ level: "high", text: `Savings rate at ${pct(rate)} — below the recommended 20% minimum.` });
  else if (rate < 0.20) findings.push({ level: "med", text: `Savings rate at ${pct(rate)}. On track — push toward the 20% target.` });
  else findings.push({ level: "low", text: `Savings rate at ${pct(rate)} — exceeds the 20% benchmark. Excellent.` });

  if ((cofTotal + snackTotal) / months > 80) findings.push({ level: "high", text: `${usd((cofTotal + snackTotal) / months)}/mo in micro-spending — ${usd((cofTotal + snackTotal) / months * 12)}/year on coffee & snacks.` });
  if (impulseOut / months > 100) findings.push({ level: "med", text: `${usd(impulseOut / months)}/mo in impulse buys >$50. A 48-hour pause rule reduces this by ~64%.` });
  if (subMo > 80) findings.push({ level: "med", text: `${usd(subMo)}/mo in subscriptions. Rotating services can cut 25–30%.` });
  if (dinMo > 200) findings.push({ level: "med", text: `${usd(dinMo)}/mo dining out — two extra home meals weekly saves ${usd(dinMo * 0.3 * 12)}/year.` });
  while (findings.length < 4) findings.push({ level: "low", text: findings.length === 3 ? `Largest category: ${categories[0]?.name} at ${pct(categories[0]?.pct)}.` : `Monthly surplus of ${usd(surplus)} — automate transfers to savings.` });

  // optimization tips
  const tips = [];
  if (cofTotal / months > 50) tips.push({ id: "coffee", title: "Brew at home 4×/week", info: `${Math.round(cofCount / months)} visits to ${topCoffeeMerchant} at ${usd(cofAvg, 2)} avg.`, save: cofTotal / months * 0.6, pts: 120, easy: true });
  if (snackTotal / months > 25) tips.push({ id: "snacks", title: "Pack snacks from home", info: `${usd(snackTotal / months)}/mo on convenience items. Bulk buying saves ~50%.`, save: snackTotal / months * 0.5, pts: 80, easy: true });
  if (dinMo > 150) tips.push({ id: "dining", title: "Cook 2 extra meals weekly", info: `${usd(dinMo)}/mo dining out. Home meals cost ~60% less.`, save: dinMo * 0.28, pts: 150, easy: false });
  if (impulseOut / months > 80) tips.push({ id: "impulse", title: "48-hour rule on $50+ purchases", info: `Research shows 64% of delayed impulse purchases get abandoned.`, save: impulseOut / months * 0.55, pts: 200, easy: false });
  if (subMo > 60) tips.push({ id: "subs", title: "Rotate subscriptions monthly", info: `Use one streaming service at a time. Cancel the rest; rotate each month.`, save: subMo * 0.3, pts: 100, easy: true });
  tips.push({ id: "auto", title: "Automate savings on payday", info: `Transfer ${usd(Math.max(50, Math.round(surplus * 0.5)))} automatically — pay yourself first.`, save: Math.max(50, surplus * 0.3), pts: 250, easy: true });

  const totalSaveable = tips.reduce((s, t) => s + t.save, 0);
  const totalPts      = tips.reduce((s, t) => s + t.pts, 0);

  // -- investment suggestions based on surplus --
  const investable = Math.max(0, surplus * 0.6); // 60% of surplus
  const riskProfile = rate >= 0.25 ? "growth" : rate >= 0.15 ? "balanced" : "conservative";

  const investSuggestions = generateInvestmentPlan(investable, annualSurplus, riskProfile, moIn);

  return {
    moIn, moOut, surplus, rate, score, annualSurplus, investable, riskProfile,
    categories, history, recent,
    findings: findings.slice(0, 5), tips, totalSaveable, totalPts,
    count: txns.length, months, investSuggestions,
  };
}

function generateInvestmentPlan(monthly, annual, risk, moIn) {
  const emergency = moIn * 3;
  const roth = Math.min(monthly, 583); // $7k/yr max = $583/mo
  const remainder = Math.max(0, monthly - roth);

  const plans = {
    conservative: [
      { label: "Emergency Fund First", desc: `Build a ${usd(emergency)} 3-month cushion in a high-yield savings account (4.8% APY). This is your foundation.`, monthly: Math.min(monthly, emergency / 12), ticker: null, expected: 4.8, priority: 1, icon: "🛡️" },
      { label: "Roth IRA — Bond ETF (BND)", desc: `Low-risk, tax-free growth. Treasury bonds at 4.2% yield. Max contribution: $7,000/yr.`, monthly: roth * 0.6, ticker: "BND", expected: 5.5, priority: 2, icon: "📊" },
      { label: "Index Fund — VTI", desc: `Broad market exposure with low fees. Historically returns 10–11% annually over 10+ year periods.`, monthly: roth * 0.4, ticker: "VTI", expected: 9.5, priority: 3, icon: "📈" },
    ],
    balanced: [
      { label: "Emergency Fund", desc: `Top up to ${usd(emergency)} in a HYSA (4.8% APY) if not already there.`, monthly: Math.min(monthly * 0.2, 200), ticker: null, expected: 4.8, priority: 1, icon: "🛡️" },
      { label: "Roth IRA — S&P 500 (SPY)", desc: `Tax-free compounding in an S&P 500 index fund. Put in ${usd(roth)}/mo to max out by year-end.`, monthly: roth, ticker: "SPY", expected: 10.5, priority: 2, icon: "🏛️" },
      { label: "Dividend ETF (SCHD)", desc: `3.5% dividend yield + price appreciation. Great for passive income as portfolio grows.`, monthly: remainder * 0.5, ticker: "SCHD", expected: 11.2, priority: 3, icon: "💰" },
      { label: "Growth ETF (QQQ)", desc: `Tech-heavy Nasdaq exposure. Higher volatility but stronger long-term growth. 5–10yr horizon.`, monthly: remainder * 0.5, ticker: "QQQ", expected: 12.0, priority: 4, icon: "🚀" },
    ],
    growth: [
      { label: "Max Roth IRA — QQQ", desc: `Maximize tax-advantaged growth. ${usd(roth)}/mo into Nasdaq 100 ETF for maximum long-term compounding.`, monthly: roth, ticker: "QQQ", expected: 12.5, priority: 1, icon: "🚀" },
      { label: "Taxable — VTI Core", desc: `After maxing Roth, put ${usd(remainder * 0.5)}/mo into a broad market ETF for flexibility.`, monthly: remainder * 0.5, ticker: "VTI", expected: 10.0, priority: 2, icon: "🌍" },
      { label: "Taxable — MSFT / AAPL", desc: `Blue-chip tech stocks. Stable companies with strong cash flows and modest dividend growth.`, monthly: remainder * 0.3, ticker: "MSFT", expected: 11.5, priority: 3, icon: "💻" },
      { label: "REIT Exposure (VNQ)", desc: `Real estate diversification. ${usd(remainder * 0.2)}/mo for 3.9% yield + appreciation.`, monthly: remainder * 0.2, ticker: "VNQ", expected: 8.5, priority: 4, icon: "🏠" },
    ],
  };

  const selected = plans[risk];
  // project 5yr and 10yr growth
  selected.forEach(p => {
    const r = p.expected / 100 / 12;
    const n5 = 60, n10 = 120;
    p.proj5  = p.monthly > 0 ? p.monthly * ((Math.pow(1 + r, n5) - 1) / r) : 0;
    p.proj10 = p.monthly > 0 ? p.monthly * ((Math.pow(1 + r, n10) - 1) / r) : 0;
  });

  return { selected, risk, monthly, annual };
}

// -- agent responses --
function askAgent(q, data) {
  if (!data) return "Upload a bank statement CSV or PDF to get started. I'll analyze your spending and suggest investments.";
  const w = q.toLowerCase();
  if (w.includes("invest") || w.includes("stock") || w.includes("portfolio")) {
    const plan = data.investSuggestions;
    const top = plan.selected[0];
    return `Based on your ${plan.risk} profile with ${usd(plan.monthly)}/mo investable surplus:\n\n**Priority 1:** ${top.label}\n${top.desc}\n\nExpected return: ~${top.expected}% annually\n5-year projection: ${usd(top.proj5)}\n10-year projection: ${usd(top.proj10)}\n\nCheck the "Invest" tab for your full personalized plan.`;
  }
  if (w.includes("save") || w.includes("saving")) {
    const t = data.tips[0];
    return t ? `Your best opportunity: "${t.title}" — saves about ${usd(t.save)}/month (${usd(t.save * 12)}/year).\n\nTotal recoverable: ${usd(data.totalSaveable)}/month. That's ${usd(data.totalSaveable * 12 * 5 * 1.35)} if invested over 5 years.` : "Your spending looks healthy.";
  }
  if (w.includes("coffee") || w.includes("starbucks")) {
    const t = data.tips.find(x => x.id === "coffee");
    return t ? `${t.info}\n\nSavings: ${usd(t.save)}/month → ${usd(t.save * 12)}/year.\nIf invested at 10%: ~${usd(t.save * 12 * 10 * 1.63)} over 10 years.` : "Coffee spending looks reasonable.";
  }
  if (w.includes("score") || w.includes("health")) return `Your score is ${data.score}/100 (${data.score >= 70 ? "Healthy" : data.score >= 45 ? "Fair" : "At Risk"}).\n\nDerived from savings rate (${pct(data.rate)}), spending ratio, and category balance.`;
  if (w.includes("roth") || w.includes("ira")) return `With ${usd(data.moIn)}/mo income and ${usd(data.surplus)}/mo surplus, you can contribute ~${usd(Math.min(data.surplus * 0.6, 583))}/mo to a Roth IRA (max $7,000/year).\n\nAt 10% avg return, that's ~${usd(Math.min(583, data.surplus * 0.6) * 120 * 1.63)} in 10 years — completely tax-free at retirement.`;
  if (w.includes("budget") || w.includes("spend")) {
    const top = data.categories.slice(0, 3);
    return `Top spending categories:\n\n${top.map((c, i) => `${i + 1}. ${c.name} — ${usd(c.monthly)}/mo (${pct(c.pct)})`).join("\n")}\n\n50/30/20 rule: 50% needs, 30% wants, 20% savings. Your savings rate: ${pct(data.rate)}.`;
  }
  if (w.includes("emergency") || w.includes("fund")) return `Your 3-month emergency fund target: ${usd(data.moOut * 3)}\n\nKeep this in a high-yield savings account (look for 4.5–5% APY). This comes before any investments — it's your financial safety net.`;
  return `I can help with:\n\n• "How should I invest my savings?"\n• "What stocks should I buy?"\n• "How to improve my score?"\n• "Should I open a Roth IRA?"\n• "Break down my spending"\n• "How can I save more?"\n\nJust ask anything about your finances.`;
}

// ----------------------------------------------------------------
//  Components
// ----------------------------------------------------------------

function Donut({ items, size = 180 }) {
  const [active, setActive] = useState(null);
  const cx = size / 2, cy = size / 2, r = size * 0.36, sw = size * 0.11;
  let angle = -Math.PI / 2;
  const slices = items.slice(0, 7).map((item) => {
    const sweep = item.pct * Math.PI * 2;
    const a1 = angle; angle += sweep;
    const large = sweep > Math.PI ? 1 : 0;
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(angle), y2 = cy + r * Math.sin(angle);
    return { ...item, d: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}` };
  });
  const picked = active !== null ? items[active] : null;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size}>
        {slices.map((s, i) => (
          <path key={i} d={s.d} fill="none" stroke={s.color}
            strokeWidth={active === i ? sw + 5 : sw} strokeLinecap="butt"
            style={{ transition: "stroke-width 0.15s", cursor: "pointer", opacity: active !== null && active !== i ? 0.35 : 1 }}
            onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} />
        ))}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        {picked
          ? <><div style={{ fontSize: 9, color: muted }}>{picked.name}</div><div style={{ fontSize: 18, fontWeight: 700, color: ink }}>{pct(picked.pct)}</div><div style={{ fontSize: 9, color: muted }}>{usd(picked.monthly)}/mo</div></>
          : <><div style={{ fontSize: 9, color: muted }}>monthly</div><div style={{ fontSize: 17, fontWeight: 700, color: ink }}>{usd(items.reduce((s, c) => s + c.monthly, 0))}</div></>
        }
      </div>
    </div>
  );
}

function ScoreRing({ value, size = 82 }) {
  const sw = 5, r = (size - sw) / 2, circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const color = value >= 70 ? sage : value >= 45 ? gold : rose;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={border} strokeWidth={sw} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: 7, color: muted, fontWeight: 600, letterSpacing: 1 }}>
          {value >= 70 ? "HEALTHY" : value >= 45 ? "FAIR" : "AT RISK"}
        </span>
      </div>
    </div>
  );
}

function StockTicker({ stock }) {
  const up = stock.chgPct >= 0;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 14px", borderRadius: 10, background: surface2, border: `1px solid ${border}`, marginBottom: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: up ? sageSoft : roseSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: up ? sage : rose }}>{stock.ticker}</span>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: ink }}>{stock.name}</div>
          <div style={{ fontSize: 9, color: muted }}>{stock.sector} · {stock.yield}% yield{stock.pe ? ` · P/E ${stock.pe}` : ""}</div>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: ink }}>${stock.price.toFixed(2)}</div>
        <div style={{ fontSize: 10, fontWeight: 600, color: up ? sage : rose }}>
          {up ? "▲" : "▼"} {Math.abs(stock.chgPct).toFixed(2)}%
        </div>
      </div>
      <div style={{ marginLeft: 12, padding: "3px 8px", borderRadius: 5, background: stock.rec === "buy" ? sageSoft : goldSoft, fontSize: 9, fontWeight: 700, color: stock.rec === "buy" ? sage : gold }}>
        {stock.rec.toUpperCase()}
      </div>
    </div>
  );
}

function InvestCard({ plan, idx }) {
  const stock = plan.ticker ? STOCKS.find(s => s.ticker === plan.ticker) : null;
  return (
    <div style={{ padding: "16px 18px", borderRadius: 12, background: surface, border: `1px solid ${border}`, marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 14 }}>{plan.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: ink }}>{plan.label}</span>
            <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 10, background: idx === 0 ? sageSoft : surface2, color: idx === 0 ? sage : muted, fontWeight: 700 }}>
              Priority {plan.priority}
            </span>
          </div>
          <div style={{ fontSize: 11, color: dim, lineHeight: 1.6, marginBottom: 8 }}>{plan.desc}</div>
          {stock && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: muted }}>
              <span style={{ fontWeight: 700, color: ink }}>{stock.ticker}</span>
              <span>${stock.price.toFixed(2)}</span>
              <span style={{ color: stock.chgPct >= 0 ? sage : rose }}>{stock.chgPct >= 0 ? "▲" : "▼"}{Math.abs(stock.chgPct).toFixed(2)}% today</span>
            </div>
          )}
        </div>
        <div style={{ textAlign: "right", minWidth: 110 }}>
          <div style={{ fontSize: 9, color: muted, marginBottom: 2 }}>Monthly</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: sage }}>{usd(plan.monthly)}</div>
          <div style={{ fontSize: 9, color: muted, marginTop: 6 }}>5yr projection</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: ink }}>{usd(plan.proj5)}</div>
          <div style={{ fontSize: 9, color: muted, marginTop: 2 }}>10yr projection</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: dim }}>{usd(plan.proj10)}</div>
        </div>
      </div>
      <div style={{ marginTop: 10, height: 3, borderRadius: 2, background: border }}>
        <div style={{ height: 3, borderRadius: 2, background: sage, width: `${Math.min(100, plan.expected * 8)}%`, transition: "width 0.5s ease" }} />
      </div>
      <div style={{ fontSize: 9, color: muted, marginTop: 3 }}>~{plan.expected}% expected annual return</div>
    </div>
  );
}

const icons = {
  insights: <><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></>,
  bolt:     <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
  chat:     <><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></>,
  upload:   <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>,
  clip:     <><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></>,
  send:     <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>,
  check:    <><polyline points="20 6 9 17 4 12"/></>,
  clock:    <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
  trending: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
  dollar:   <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></>,
};
const Ico = ({ name, color: c = muted, size: s = 16 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
);

const Card = ({ children, style }) => (
  <div style={{ background: surface, borderRadius: 14, border: `1px solid ${border}`, ...style }}>{children}</div>
);

const Pill = ({ children, color = dim, bg = surface2 }) => (
  <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 10, background: bg, color, fontWeight: 700, letterSpacing: 0.3 }}>{children}</span>
);

// ----------------------------------------------------------------
//  App
// ----------------------------------------------------------------
const tabs = [
  { id: "insights", label: "Insights",  icon: "insights" },
  { id: "invest",   label: "Invest",    icon: "trending" },
  { id: "optimize", label: "Optimize",  icon: "bolt" },
  { id: "stocks",   label: "Markets",   icon: "dollar" },
  { id: "agent",    label: "Ask AI",    icon: "chat" },
];

export default function FinPulse() {
  const [data, setData]         = useState(null);
  const [view, setView]         = useState("insights");
  const [msgs, setMsgs]         = useState([]);
  const [input, setInput]       = useState("");
  const [accepted, setAccepted] = useState({});
  const [points, setPoints]     = useState(0);
  const [busy, setBusy]         = useState(false);
  const chatEnd  = useRef(null);
  const fileRef  = useRef(null);
  const chatFile = useRef(null);

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const fmtMonth   = (m) => { const [y, mo] = m.split("-"); return `${monthNames[parseInt(mo)-1]} '${y.slice(2)}`; };

  // load sample data on mount
  useEffect(() => {
    fetch("/transactions.csv")
      .then(r => r.ok ? r.text() : Promise.reject())
      .then(csv => setData(crunch(loadCSV(csv))))
      .catch(() => {
        if (window.__FINPULSE_CSV) setData(crunch(loadCSV(window.__FINPULSE_CSV)));
      });
    setMsgs([{ from: "ai", text: "Welcome to FinPulse ✦ Upload your bank statement (CSV or PDF) to get personalized analysis, investment recommendations, and spending insights." }]);
  }, []);

  const processFile = useCallback((f) => {
    if (!f) return;
    setBusy(true);
    const ext = f.name.split(".").pop().toLowerCase();
    if (ext === "pdf") {
      const reader = new FileReader();
      reader.onload = ev => {
        const extracted = extractTextFromPDF(ev.target.result);
        const txns = loadCSV(extracted);
        if (txns.length > 0) {
          setData(crunch(txns));
          setAccepted({}); setPoints(0);
          setMsgs(p => [...p, { from: "ai", text: `Parsed PDF — found ${txns.length} transactions. Analysis ready.` }]);
        } else {
          setMsgs(p => [...p, { from: "ai", text: "Couldn't extract transactions from this PDF. Try a CSV export from your bank." }]);
        }
        setBusy(false);
      };
      reader.readAsArrayBuffer(f);
    } else {
      const reader = new FileReader();
      reader.onload = ev => {
        const csv = ev.target.result;
        const txns = loadCSV(csv);
        if (txns.length > 0) {
          setData(crunch(txns));
          setAccepted({}); setPoints(0);
          setMsgs(p => [...p, { from: "ai", text: `Loaded ${txns.length} transactions across ${new Set(txns.map(t => t.date.slice(0,7))).size} months. Full analysis ready.` }]);
        } else {
          setMsgs(p => [...p, { from: "ai", text: "Couldn't parse that file. Use CSV with columns: date, amount, category, merchant, type" }]);
        }
        setBusy(false);
      };
      reader.readAsText(f);
    }
  }, []);

  const handleUpload = useCallback(e => { processFile(e.target.files?.[0]); }, [processFile]);

  const sendMsg = useCallback(() => {
    const q = input.trim(); if (!q) return;
    setInput("");
    setMsgs(p => [...p, { from: "user", text: q }]);
    setTimeout(() => setMsgs(p => [...p, { from: "ai", text: askAgent(q, data) }]), 300);
  }, [input, data]);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const toggle = useCallback((id, pt) => {
    setAccepted(prev => {
      const next = { ...prev };
      if (next[id]) { delete next[id]; setPoints(p => p - pt); }
      else { next[id] = true; setPoints(p => p + pt); }
      return next;
    });
  }, []);

  const badge = points >= 600 ? "Gold" : points >= 300 ? "Silver" : points >= 100 ? "Bronze" : "Starter";
  const sevDot = { high: rose, med: gold, low: sage };
  const sevBg  = { high: roseSoft, med: goldSoft, low: sageSoft };

  // mini sparkline data (fake trend for illustration)
  const sparkPath = (history) => {
    if (!history || history.length < 2) return "";
    const vals = history.map(h => h.savings);
    const min = Math.min(...vals), max = Math.max(...vals);
    const range = max - min || 1;
    const w = 80, h = 24;
    return vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ");
  };

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "'DM Sans', 'Nunito', -apple-system, sans-serif", color: ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; } body { margin: 0; }
        button:focus-visible { outline: 2px solid ${sage}; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${border}; border-radius: 4px; }
      `}</style>

      {/* ── header ── */}
      <header style={{ background: surface, borderBottom: `1px solid ${border}`, padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: surface, fontSize: 12, fontWeight: 800, letterSpacing: -0.5 }}>FP</span>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.3 }}>FinPulse</div>
            <div style={{ fontSize: 8, color: muted, letterSpacing: 0.5 }}>AI FINANCIAL WELLNESS</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Pill color={dim} bg={surface2}>{points} pts · {badge}</Pill>
          <label style={{ padding: "7px 14px", borderRadius: 9, background: ink, color: surface, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, transition: "opacity 0.2s" }}>
            <Ico name="upload" color={surface} size={12} />
            {busy ? "Reading…" : "Upload"}
            <input ref={fileRef} type="file" accept=".csv,.txt,.pdf" onChange={handleUpload} style={{ display: "none" }} />
          </label>
        </div>
      </header>

      {/* ── tabs ── */}
      <nav style={{ background: surface, borderBottom: `1px solid ${border}`, display: "flex", paddingLeft: 20, overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setView(t.id)} style={{
            padding: "10px 16px", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
            fontFamily: "inherit", background: "transparent", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
            color: view === t.id ? ink : muted,
            borderBottom: view === t.id ? `2px solid ${ink}` : "2px solid transparent",
            transition: "all 0.18s",
          }}>
            <Ico name={t.icon} color={view === t.id ? ink : muted} size={13} /> {t.label}
          </button>
        ))}
      </nav>

      <main style={{ maxWidth: 820, margin: "0 auto", padding: "20px 14px" }}>
        {!data ? (
          <Card style={{ padding: "52px 24px", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: surface2, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <Ico name="upload" color={muted} size={26} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: ink, marginBottom: 6 }}>Upload your bank statement</div>
            <div style={{ fontSize: 12, color: muted, marginBottom: 20 }}>CSV or PDF · Analyzed privately in your browser</div>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 28px", borderRadius: 10, background: ink, color: surface, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              <Ico name="upload" color={surface} size={14} /> Choose File
              <input type="file" accept=".csv,.txt,.pdf" onChange={handleUpload} style={{ display: "none" }} />
            </label>
            <div style={{ marginTop: 12, fontSize: 10, color: muted }}>CSV format: date, amount, category, merchant, type</div>
          </Card>
        ) : <>

        {/* ═══════ INSIGHTS ═══════ */}
        {view === "insights" && <>
          {/* KPI row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 16 }}>
            {[
              { label: "MONTHLY SURPLUS", val: usd(data.surplus), sub: `${pct(data.rate)} saved`, accent: true },
              { label: "MONTHLY INCOME", val: usd(data.moIn), sub: "avg per month" },
              { label: "MONTHLY SPEND", val: usd(data.moOut), sub: "avg per month" },
              { label: "INVESTABLE", val: usd(data.investable), sub: "60% of surplus" },
            ].map((k, i) => (
              <Card key={i} style={{ padding: "14px 16px", background: i === 0 ? ink : surface }}>
                <div style={{ fontSize: 8, color: i === 0 ? "rgba(255,255,255,0.5)" : muted, fontWeight: 700, letterSpacing: 0.6, marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: i === 0 ? surface : ink, lineHeight: 1 }}>{k.val}</div>
                <div style={{ fontSize: 9, color: i === 0 ? "rgba(255,255,255,0.4)" : muted, marginTop: 3 }}>{k.sub}</div>
              </Card>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 16 }}>
            {/* score + diagnostics */}
            <Card style={{ flex: "1 1 290px", padding: "20px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                <ScoreRing value={data.score} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Financial Health</div>
                  <div style={{ fontSize: 10, color: dim, lineHeight: 1.6 }}>
                    Savings rate: {pct(data.rate)}<br />
                    {data.count} transactions · {data.months} months
                  </div>
                  {/* mini sparkline */}
                  <svg width={80} height={24} style={{ marginTop: 6, display: "block" }}>
                    <path d={sparkPath(data.history)} fill="none" stroke={sage} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: muted, marginBottom: 8, letterSpacing: 0.5 }}>AI DIAGNOSTICS</div>
              {data.findings.map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "8px 11px", marginBottom: 5, borderRadius: 8, background: sevBg[f.level] }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: sevDot[f.level], marginTop: 5, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: ink, lineHeight: 1.5 }}>{f.text}</span>
                </div>
              ))}
            </Card>

            {/* donut */}
            <Card style={{ flex: "1 1 230px", padding: "20px 22px", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: muted, alignSelf: "flex-start", marginBottom: 12, letterSpacing: 0.5 }}>SPENDING BREAKDOWN</div>
              <Donut items={data.categories} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 12, justifyContent: "center" }}>
                {data.categories.slice(0, 6).map(c => (
                  <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: dim }}>
                    <div style={{ width: 6, height: 6, borderRadius: 2, background: c.color }} />
                    {c.name} <span style={{ fontWeight: 700, color: ink }}>{pct(c.pct)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* monthly history */}
          <Card style={{ padding: "18px 22px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
              <Ico name="clock" color={muted} size={13} />
              <span style={{ fontSize: 10, fontWeight: 600, color: muted, letterSpacing: 0.5 }}>MONTHLY HISTORY</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(data.history.length, 4)}, 1fr)`, gap: 8 }}>
              {data.history.map(h => {
                const isGood = h.rate >= 0.15;
                return (
                  <div key={h.month} style={{ padding: "12px 14px", borderRadius: 10, background: surface2, border: `1px solid ${border}` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: ink, marginBottom: 7 }}>{fmtMonth(h.month)}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: muted, marginBottom: 2 }}>
                      <span>In</span><span style={{ fontWeight: 700, color: sage }}>{usd(h.income)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: muted, marginBottom: 2 }}>
                      <span>Out</span><span style={{ fontWeight: 700, color: rose }}>{usd(h.expense)}</span>
                    </div>
                    <div style={{ height: 1, background: border, margin: "5px 0" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9 }}>
                      <span style={{ color: muted }}>Saved</span>
                      <span style={{ fontWeight: 700, color: isGood ? sage : gold }}>{usd(h.savings)}</span>
                    </div>
                    <div style={{ fontSize: 8, color: muted, marginTop: 3 }}>{pct(h.rate)} rate</div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* recent transactions */}
          <Card style={{ padding: "18px 22px" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: muted, letterSpacing: 0.5, marginBottom: 12 }}>RECENT TRANSACTIONS</div>
            {data.recent.map((t, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: i < data.recent.length - 1 ? `1px solid ${border}` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: t.type === "income" ? sageSoft : surface2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>
                    {t.type === "income" ? "↑" : t.category.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>{t.merchant}</div>
                    <div style={{ fontSize: 9, color: muted }}>{t.date} · {t.category}</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: t.type === "income" ? sage : ink }}>
                  {t.type === "income" ? "+" : "−"}{usd(Math.abs(t.amount), 2)}
                </div>
              </div>
            ))}
          </Card>
        </>}

        {/* ═══════ INVEST ═══════ */}
        {view === "invest" && <>
          {/* header card */}
          <Card style={{ padding: "20px 24px", marginBottom: 14, background: ink, color: surface }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, opacity: 0.5, fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>INVESTMENT PLAN · {data.investSuggestions.risk.toUpperCase()} PROFILE</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{usd(data.investable)}<span style={{ fontSize: 12, opacity: 0.5 }}>/mo</span></div>
                <div style={{ fontSize: 11, opacity: 0.5, marginTop: 3 }}>investable surplus · {usd(data.annualSurplus)} annual capacity</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 9, opacity: 0.4, marginBottom: 2 }}>10-YEAR POTENTIAL</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#9EE4C8" }}>
                  {usd(data.investSuggestions.selected.reduce((s, p) => s + p.proj10, 0))}
                </div>
                <div style={{ fontSize: 9, opacity: 0.4, marginTop: 4 }}>assuming suggested allocations</div>
              </div>
            </div>
          </Card>

          {/* risk profile explanation */}
          <div style={{ padding: "12px 16px", borderRadius: 10, background: sageSoft, border: `1px solid ${border}`, marginBottom: 14, fontSize: 11, color: dim, lineHeight: 1.6 }}>
            <strong style={{ color: ink }}>Why {data.investSuggestions.risk}?</strong>
            {data.investSuggestions.risk === "growth" && " Your savings rate of " + pct(data.rate) + " is excellent. You have capacity for higher-return, slightly higher-risk assets. Maximize tax-advantaged accounts first."}
            {data.investSuggestions.risk === "balanced" && " Your savings rate of " + pct(data.rate) + " is solid. Balance growth and stability — max Roth IRA first, then diversify."}
            {data.investSuggestions.risk === "conservative" && " With a " + pct(data.rate) + " savings rate, focus on building your emergency fund first, then enter the market gradually with stable assets."}
          </div>

          {data.investSuggestions.selected.map((plan, i) => (
            <InvestCard key={i} plan={plan} idx={i} />
          ))}

          {/* disclaimer */}
          <div style={{ fontSize: 9, color: muted, textAlign: "center", marginTop: 14, lineHeight: 1.6 }}>
            Projections use historical average returns and are not guaranteed. This is educational content, not financial advice. Consult a licensed financial advisor.
          </div>
        </>}

        {/* ═══════ OPTIMIZE ═══════ */}
        {view === "optimize" && <>
          <Card style={{ padding: "18px 22px", marginBottom: 12, background: ink, color: surface }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>Pulse Points</div>
                <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>Accept tips, implement them, earn points when verified.</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{points}</div>
                <div style={{ fontSize: 9, opacity: 0.4 }}>{badge}</div>
              </div>
            </div>
          </Card>

          <Card style={{ padding: "16px 22px", marginBottom: 12, textAlign: "center" }}>
            <div style={{ fontSize: 8, color: muted, fontWeight: 700, letterSpacing: 1 }}>RECOVERABLE PER MONTH</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: sage, marginTop: 4 }}>{usd(data.totalSaveable)}<span style={{ fontSize: 11, color: muted }}>/mo</span></div>
            <div style={{ fontSize: 10, color: dim, marginTop: 3 }}>{usd(data.totalSaveable * 12)}/year · {usd(data.totalSaveable * 12 * 5 * 1.35)} invested over 5 yrs</div>
          </Card>

          {data.tips.map(tip => {
            const on = accepted[tip.id];
            return (
              <Card key={tip.id} style={{ padding: "14px 18px", marginBottom: 8, borderColor: on ? sage : border }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{tip.title}</div>
                    <div style={{ fontSize: 10, color: dim, marginTop: 4, lineHeight: 1.5 }}>{tip.info}</div>
                    <div style={{ display: "flex", gap: 10, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, color: sage, fontWeight: 700 }}>Save {usd(tip.save)}/mo</span>
                      <span style={{ fontSize: 10, color: gold, fontWeight: 700 }}>{tip.pts} pts</span>
                      <Pill color={tip.easy ? sage : gold} bg={tip.easy ? sageSoft : goldSoft}>{tip.easy ? "Easy" : "Medium"}</Pill>
                    </div>
                  </div>
                  <button onClick={() => toggle(tip.id, tip.pts)} style={{
                    padding: "7px 16px", borderRadius: 8, border: `1px solid ${on ? sage : border}`, cursor: "pointer",
                    fontSize: 10, fontWeight: 700, fontFamily: "inherit", transition: "all 0.18s",
                    background: on ? sage : "transparent", color: on ? surface : dim, display: "flex", alignItems: "center", gap: 4,
                  }}>
                    {on && <Ico name="check" color={surface} size={11} />} {on ? "Accepted" : "Accept"}
                  </button>
                </div>
              </Card>
            );
          })}
        </>}

        {/* ═══════ MARKETS / STOCKS ═══════ */}
        {view === "stocks" && <>
          {/* market pulse */}
          <Card style={{ padding: "18px 22px", marginBottom: 14, background: ink, color: surface }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontSize: 9, opacity: 0.4, letterSpacing: 0.5, marginBottom: 4 }}>MARKET PULSE · {MARKET_SENTIMENT.date}</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{MARKET_SENTIMENT.sentiment} Sentiment</div>
                <div style={{ fontSize: 10, opacity: 0.5, marginTop: 3, lineHeight: 1.5, maxWidth: 300 }}>{MARKET_SENTIMENT.note}</div>
              </div>
              <div style={{ display: "flex", gap: 20 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 8, opacity: 0.4, marginBottom: 2 }}>S&P 500</div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{MARKET_SENTIMENT.sp500.level}</div>
                  <div style={{ fontSize: 9, color: MARKET_SENTIMENT.sp500.weekChg >= 0 ? "#9EE4C8" : "#F4A4A4" }}>
                    {MARKET_SENTIMENT.sp500.weekChg >= 0 ? "▲" : "▼"} {Math.abs(MARKET_SENTIMENT.sp500.weekChg)}% wk
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 8, opacity: 0.4, marginBottom: 2 }}>VIX</div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{MARKET_SENTIMENT.vix}</div>
                  <div style={{ fontSize: 9, opacity: 0.4 }}>volatility</div>
                </div>
              </div>
            </div>
          </Card>

          {/* sector labels */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {["All", "Index", "Tech", "Div", "Bonds", "REIT"].map(s => (
              <Pill key={s} color={dim} bg={surface2}>{s}</Pill>
            ))}
          </div>

          {/* stock list */}
          <Card style={{ padding: "18px 20px", marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: muted, letterSpacing: 0.5, marginBottom: 12 }}>WATCHLIST · APRIL 5, 2026</div>
            {STOCKS.map(s => <StockTicker key={s.ticker} stock={s} />)}
          </Card>

          {/* my suggested portfolio based on data */}
          <Card style={{ padding: "18px 22px" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: muted, letterSpacing: 0.5, marginBottom: 12 }}>YOUR PERSONALIZED PICKS</div>
            <div style={{ fontSize: 11, color: dim, lineHeight: 1.6, marginBottom: 12 }}>
              Based on your <strong>{data.investSuggestions.risk}</strong> risk profile and {usd(data.investable)}/mo investable surplus, these are the top stocks/ETFs suited for you:
            </div>
            {data.investSuggestions.selected.filter(p => p.ticker).map(p => {
              const stock = STOCKS.find(s => s.ticker === p.ticker);
              if (!stock) return null;
              return (
                <div key={p.ticker} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 14 }}>{p.icon}</span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700 }}>{p.ticker} — {stock.name}</div>
                      <div style={{ fontSize: 9, color: muted }}>{p.label} · {usd(p.monthly)}/mo suggested</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>${stock.price.toFixed(2)}</div>
                    <div style={{ fontSize: 9, color: stock.chgPct >= 0 ? sage : rose }}>{stock.chgPct >= 0 ? "▲" : "▼"}{Math.abs(stock.chgPct).toFixed(2)}%</div>
                  </div>
                </div>
              );
            })}
          </Card>
        </>}

        {/* ═══════ AGENT ═══════ */}
        {view === "agent" && (
          <Card style={{ overflow: "hidden", display: "flex", flexDirection: "column", height: "calc(100vh - 190px)", minHeight: 400 }}>
            <div style={{ padding: "12px 18px", borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ico name="chat" color={surface} size={11} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>FinPulse AI</div>
                <div style={{ fontSize: 9, color: sage, fontWeight: 600 }}>● Online</div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
              {msgs.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.from === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "78%", padding: "10px 14px", borderRadius: 12, fontSize: 11, lineHeight: 1.6, whiteSpace: "pre-wrap",
                    background: m.from === "user" ? ink : surface2,
                    color: m.from === "user" ? surface : ink,
                    borderBottomRightRadius: m.from === "user" ? 3 : 12,
                    borderBottomLeftRadius: m.from === "user" ? 12 : 3,
                  }}>
                    {m.text.split("**").map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
                  </div>
                </div>
              ))}
              <div ref={chatEnd} />
            </div>

            <div style={{ padding: "6px 18px 4px", display: "flex", gap: 5, flexWrap: "wrap" }}>
              {["How should I invest?", "Improve my score", "Break down spending", "What's a Roth IRA?"].map(q => (
                <button key={q} onClick={() => { setMsgs(p => [...p, { from: "user", text: q }]); setTimeout(() => setMsgs(p => [...p, { from: "ai", text: askAgent(q, data) }]), 300); }}
                  style={{ padding: "4px 10px", borderRadius: 14, border: `1px solid ${border}`, background: surface2, fontSize: 9, color: dim, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                  {q}
                </button>
              ))}
            </div>

            <div style={{ padding: "8px 18px", borderTop: `1px solid ${border}`, display: "flex", gap: 6, alignItems: "center" }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMsg()}
                placeholder="Ask about your finances, investments, stocks…"
                style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${border}`, fontSize: 11, fontFamily: "inherit", outline: "none", color: ink, background: surface2 }} />
              <button onClick={sendMsg} disabled={!input.trim()} style={{
                width: 32, height: 32, borderRadius: 8, border: "none", cursor: input.trim() ? "pointer" : "default",
                background: input.trim() ? ink : border, display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.18s",
              }}><Ico name="send" color={input.trim() ? surface : muted} size={12} /></button>
            </div>
          </Card>
        )}
        </>}
      </main>

      <footer style={{ textAlign: "center", padding: "14px 0", fontSize: 8, color: muted, letterSpacing: 0.5 }}>
        FinPulse · Scarlet Hacks 2026 · AI-Powered Financial Wellness
      </footer>
    </div>
  );
}
