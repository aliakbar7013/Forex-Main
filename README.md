# ApexSignal • Real-Time Forex & Indices Trading Signals Dashboard

A real-time institutional quantitative signals dashboard built with **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS**, **Web Audio API sound synthesizers**, and **Server-Sent Events (SSE)**. The application listens for incoming webhook alerts from TradingView, validates strategy criteria, calculates defensive position sizing, and displays live trading signals in real time without refreshing the page.

---

## 🚀 Key Features

### 1. Zero-Latency Real-Time Streaming & Audio Chimes
- **Server-Sent Events (SSE)** via `GET /api/signals/stream` pushes incoming signals, status updates, and risk calculations instantly to connected frontends.
- **Web Audio API Synthesizer**: Custom synthesized multi-tone ascending crystal chimes for **BUY** orders, descending harmonic chimes for **SELL** orders, fanfare on winning trades, and warning buzzers for flagged signals.

### 2. Strategy Logic & Automated Rules Validation

The backend (`src/lib/strategyValidator.ts`) automatically validates each incoming webhook alert against its specific criteria:

1. **CBDR Strategy**:
   - **Timeframe**: Strictly 15-minute (`15m`).
   - **Session**: London Session (`03:00 AM – 12:00 PM EST` / `12:30 PM – 09:30 PM IST`).
   - **Valid Trading Days**: Monday, Tuesday, Wednesday only (signals arriving Thursday/Friday or weekends are automatically flagged and blocked).
   - **Condition**: Liquidity sweep of Previous Day High/Low, entering strictly on the **1st Fair Value Gap (FVG)** / Imbalance of the London session.

2. **Stop Hunt Model**:
   - **Timeframe**: Strictly 5-minute (`5m`).
   - **Focus**: Post-Asian Kill Zone completion.
   - **Condition**: Price sweeps Asian Kill Zone High or Low, prints a Change of Character (CHOCH), and enters from a fresh Balanced Price Range (BPR).
   - **Direction Filter**: Must respect the monthly **IPDA Central Bank bias toggle** (Bullish or Bearish). Contradictory directions trigger rule violation warnings.

3. **New York Strategy**:
   - **Instruments**: Exclusively `SPX500`, `NAS100`, `US30` (BlackBull data). Non-index assets are rejected.
   - **Timing Window**: `09:30 AM – 12:00 PM NY Time` (`07:00 PM – 10:00 PM IST`).
   - **Timeframe**: 15m range high/low marked at `09:29 AM NY`; 1m timeframe for CHOCH and loose entry at FVG.

---

### 3. Built-In Defensive Risk & Dynamic Lot Size Engine

- **Defensive Risk Stepping**:
  - **Base / After Win**: `1.0%` risk (`NORMAL` mode).
  - **After 1st Loss**: Automatically steps down to `0.5%` risk (`REDUCED` mode).
  - **After 2nd+ Loss**: Drops down to `0.25%` risk (`DEFENSIVE` mode) until the account balance fully recovers above the **High-Water Mark (HWM)**.
- **Dynamic Lot Size Calculations**:
  - **USD Pairs & Crosses**: $\text{Quantity} / 100,000$ lots
  - **Gold (XAUUSD)**: $\text{Quantity} / 100$ lots
  - **Indices (SPX, NAS, US30)**: $\text{Quantity} / 1,000,000$ lots
- **Multi-Target Scale-Outs**:
  - `TP1` (50% scale-out, triggers Stop Loss move to Break-Even).
  - `TP2` (30% scale-out).
  - `TP3` (20% Runner).

---

### 4. Webhook Receiver Specification

- **Endpoint**: `POST /api/signals/webhook`
- **Payload Example**:
  ```json
  {
    "strategy": "CBDR",
    "symbol": "EURUSD",
    "timeframe": "15m",
    "action": "BUY",
    "entry": 1.08500,
    "sl": 1.08200,
    "tp1": 1.09100,
    "tp2": 1.09700,
    "risk_percent": 1.0,
    "secret": "YOUR_WEBHOOK_SECRET"
  }
  ```

---

## 🛠️ Tech Stack & File Structure

```
forex-signals-dashboard/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ipda/route.ts             # GET & POST IPDA Central Bank Biases
│   │   │   ├── logs/route.ts             # GET Trade Ledger & Webhook Audit Logs
│   │   │   ├── risk/route.ts             # GET & POST Defensive Risk Settings
│   │   │   ├── seed/route.ts             # POST Re-seed realistic demo data
│   │   │   ├── signals/route.ts          # GET & POST Trading signals
│   │   │   ├── signals/[id]/route.ts     # PATCH (Win/Loss/BE) & DELETE signals
│   │   │   ├── signals/stream/route.ts   # GET Server-Sent Events (SSE) stream
│   │   │   └── signals/webhook/route.ts  # POST TradingView webhook listener
│   │   ├── globals.css                   # Custom glowing dark theme styling
│   │   ├── layout.tsx                    # Root layout & dark mode configuration
│   │   └── page.tsx                      # Main Real-Time Dashboard UI
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── FilterAndControlsBar.tsx  # Strategy & Status filters, live search
│   │   │   ├── Header.tsx                # Balance, Risk Badge, Dual Clock, Audio
│   │   │   ├── SessionRibbon.tsx         # Live London, NY, Asian, Sydney session bar
│   │   │   ├── SignalCard.tsx            # Price ladder, lot sizing, rule checklist
│   │   │   ├── SignalsTable.tsx          # High-density trader grid table
│   │   │   └── StrategyControlCards.tsx  # IPDA Bias matrix & Defensive risk ladder
│   │   ├── modals/
│   │   │   ├── AccountSettingsModal.tsx  # Balance, HWM & Risk parameter editor
│   │   │   ├── ActivityLogsDrawer.tsx    # Trade execution history & audit logs
│   │   │   ├── CreateSignalModal.tsx     # Manual signal publisher
│   │   │   ├── PayloadViewerModal.tsx    # Raw JSON payload & rule diagnostics
│   │   │   ├── WebhookDocsModal.tsx      # Pine Script v5 snippets & cURL docs
│   │   │   └── WebhookSimulatorModal.tsx # Interactive test alert transmitter
│   │   └── ui/
│   │       ├── Badge.tsx                 # Neon status badges
│   │       └── Modal.tsx                 # Base modal dialog
│   ├── lib/
│   │   ├── db.ts                         # SQLite persistence with WAL mode
│   │   ├── eventBroadcaster.ts           # Zero-latency SSE event broadcaster
│   │   ├── riskEngine.ts                 # Position sizing & defensive risk math
│   │   ├── sessionTracker.ts             # EST / IST / UTC multi-timezone engine
│   │   ├── soundEngine.ts                # Web Audio API crystal chime engine
│   │   └── strategyValidator.ts          # Strategy rule enforcement logic
│   └── types/
│       └── index.ts                      # TypeScript definitions
└── data/
    └── trading_dashboard.db              # SQLite Database
```

---

## 🏃‍♂️ Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run the development server**:
   ```bash
   npm run dev
   ```

3. **Open the Dashboard**:
   Navigate to [http://localhost:3000](http://localhost:3000).

4. **Test with Webhook Simulator**:
   Click the **"Simulate Webhook"** button in the top navigation bar to trigger 6 pre-configured valid and invalid strategy scenarios!
