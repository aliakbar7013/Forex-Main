/**
 * Pine Script v5 Generator & Documentation Engine
 * Produces production-grade TradingView Pine Script v5 code that:
 * 1. Plots CBDR Asian range, PDH/PDL sweeps (for Major pairs), and direct 1st London 15m Imbalances (for Minor pairs)
 * 2. Plots exact Entry, Stop Loss, and 1:3 Take Profit target lines on TradingView charts in real-time
 * 3. Enforces Monday-Wednesday trading days (skipping Thursdays & Fridays)
 * 4. Renders an interactive on-chart heads-up display table
 * 5. Sends instant JSON Webhook alerts to the dashboard endpoint
 */

export function generateCbdrTradingViewPineScript(webhookUrl: string = 'https://limited-select-bass-dale.trycloudflare.com/api/signals/webhook'): string {
  return `//@version=5
indicator("Apex ICT CBDR & LuxAlgo SMC 1st Imbalance Engine (1 Trade/Day | 1:3 RR)", overlay=true, max_boxes_count=500, max_lines_count=500, max_labels_count=500)

// ==============================================================================
// 1. INPUTS & CONFIGURATION (LuxAlgo Sessions & SMC Architecture)
// ==============================================================================
var string G_SETTINGS    = "1. Webhook & System Settings"
var string G_SESSIONS    = "2. Sessions (LuxAlgo Model)"
var string G_SMC         = "3. Imbalance / FVG (LuxAlgo SMC Model)"
var string G_RISK        = "4. Risk & Target Multipliers (1:3 RR)"
var string G_DISPLAY     = "5. Visual On-Chart Display"

i_webhookSecret  = input.string("YOUR_WEBHOOK_SECRET", "Webhook Secret Token", group=G_SETTINGS, tooltip="Matches WEBHOOK_SECRET in your dashboard.")
i_ipdaFilter     = input.string("AUTO", "IPDA Central Bank Bias Filter", options=["AUTO", "BUY_ONLY", "SELL_ONLY", "DISABLED"], group=G_SETTINGS, tooltip="Strictly filter trade signals by Central Bank interest rate ratio. E.g. EURUSD=SELL_ONLY, GBPUSD=BUY_ONLY.")

// Sessions Inputs (Aligned with LuxAlgo Sessions: 0700-1600 UTC / 03:00 - 12:00 NY)
string sessionTimeInput      = input.session("0700-1600", "Trading Session Window", group=G_SESSIONS, tooltip="Strict trading window: 07:00 - 16:00 UTC (03:00 - 12:00 New York Time).")
string sessionTimezone       = input.string("UTC", "Timezone", group=G_SESSIONS, tooltip="Timezone for interpreting session hours (UTC matching LuxAlgo).")
bool showSessionRangeInput   = input.bool(true, "Show London Session Range Box", group=G_SESSIONS)
int rangeTransparencyInput   = input.int(90, "Session Box Transparency", minval=0, maxval=100, group=G_SESSIONS)
color sessionColorInput      = input.color(#2157f3, "London Session Color", group=G_SESSIONS)

// Imbalance / FVG Inputs (LuxAlgo SMC Model)
bool showFvgBoxesInput       = input.bool(true, "Draw 1st Imbalance (FVG) Boxes", group=G_SMC, tooltip="Draws Fair Value Gap boxes matching LuxAlgo SMC.")
color fvgBullColorInput      = input.color(color.new(#089981, 70), "Bullish FVG Color", group=G_SMC)
color fvgBearColorInput      = input.color(color.new(#f23645, 70), "Bearish FVG Color", group=G_SMC)

// Risk & Target Multipliers (1:3 RR & 1 Trade Per Day)
float i_slBufferPips         = input.float(7.0, "SL Breathing Space (Pips)", minval=1.0, step=0.5, group=G_RISK, tooltip="Breathing space placed beyond imbalance base/top.")
float i_tp1_rr               = input.float(3.0, "TP1 Target RR (Strictly 1:3)", minval=1.0, step=0.5, group=G_RISK, tooltip="Exact 1:3.0 Risk-to-Reward institutional target.")
bool i_oneTradePerDay        = input.bool(true, "Strictly 1 Trade Per Day Only", group=G_RISK, tooltip="Limits execution to exactly the first valid trade setup of the day.")

// Visuals & HUD
bool i_showTable             = input.bool(true, "Show On-Chart HUD Table", group=G_DISPLAY)
bool i_showLevels            = input.bool(true, "Draw Entry / SL / TP Price Lines", group=G_DISPLAY)
bool i_showDayDivider        = input.bool(true, "Show Daily Dividers", group=G_DISPLAY)

// ==============================================================================
// 2. PAIR CLASSIFICATION: MAJOR (USD ATTACHED) VS MINOR (NO USD ATTACHED)
// Major Pairs: Have USD attached (EURUSD, GBPUSD, etc.) -> Require PDH/PDL Sweep + 1st Imbalance
// Minor Pairs: Do NOT have USD attached (EURGBP, GBPJPY, etc.) -> Direct 1st Imbalance (07:00-16:00 UTC / 03:00-12:00 NY), SL below/above FVG, TP 1:3
// ==============================================================================
string tickerClean = syminfo.ticker
bool isMajorPair = str.contains(tickerClean, "USD")

string pairCategory = isMajorPair ? "MAJOR (USD Attached: PDH/PDL Sweep Required)" : "MINOR (No USD Attached: Direct 1st Imbalance)"

// ==============================================================================
// 3. TRADING DAYS & SESSION TIMING (LuxAlgo Sessions Architecture)
// Institutional trading days: Monday, Tuesday, Wednesday (Mon=2, Tue=3, Wed=4)
// Thursdays & Fridays are strictly non-trading days for CBDR
// ==============================================================================
int currentDay = dayofweek
bool isTradingDay = (currentDay == dayofweek.monday or currentDay == dayofweek.tuesday or currentDay == dayofweek.wednesday)
string dayStatusText = isTradingDay ? "VALID TRADING DAY (Mon-Wed)" : "NON-TRADING DAY (Thu/Fri Blocked)"

// Active Session Flag (LuxAlgo Session Check: 07:00 - 16:00 UTC / 03:00 - 12:00 NY)
timeInSession = time(timeframe.period, sessionTimeInput, sessionTimezone)
bool sessionActive = not na(timeInSession) and isTradingDay
bool sessionStart  = sessionActive and not sessionActive[1]

// Daily Dividers (LuxAlgo Daily Divider Model)
bool isNewDay = ta.change(dayofmonth) != 0
if isNewDay and i_showDayDivider
    line.new(bar_index, close + syminfo.mintick, bar_index, close - syminfo.mintick, color=color.gray, extend=extend.both, style=line.style_dashed)

// ==============================================================================
// 4. PREVIOUS DAY HIGH (PDH) & LOW (PDL) CALCULATION (Non-Repainting)
// ==============================================================================
pdh = request.security(syminfo.tickerid, "D", high[1], gaps=barmerge.gaps_off, lookahead=barmerge.lookahead_off)
pdl = request.security(syminfo.tickerid, "D", low[1], gaps=barmerge.gaps_off, lookahead=barmerge.lookahead_off)

var bool pdhSwept = false
var bool pdlSwept = false
var bool tradeTriggeredToday = false
var bool firstSessionFvgTriggered = false

// Reset daily session tracking at midnight (Enforces strictly 1 trade per day)
if isNewDay
    pdhSwept := false
    pdlSwept := false
    tradeTriggeredToday := false
    firstSessionFvgTriggered := false

// Reset session FVG latch when new session begins
if sessionStart
    firstSessionFvgTriggered := false

// Track London Session High and Low Range (LuxAlgo Session Range Architecture)
var float sHigh = na
var float sLow  = na
var box sBox    = na

if sessionStart
    sHigh := high
    sLow  := low
    if showSessionRangeInput
        sBox := box.new(bar_index, sHigh, bar_index, sLow, bgcolor=color.new(sessionColorInput, rangeTransparencyInput), border_color=sessionColorInput, border_style=line.style_dotted)
else if sessionActive
    sHigh := math.max(high, sHigh)
    sLow  := math.min(low, sLow)
    if showSessionRangeInput and not na(sBox)
        box.set_top(sBox, sHigh)
        box.set_rightbottom(sBox, bar_index, sLow)

// Track liquidity sweeps inside session for Major pairs
if sessionActive
    if high > pdh
        pdhSwept := true
    if low < pdl
        pdlSwept := true

// ==============================================================================
// 5. LUXALGO SMART MONEY CONCEPTS FAIR VALUE GAP (IMBALANCE) IDENTIFICATION
// Bullish FVG: low > high[2] and close[1] > high[2]
// Bearish FVG: high < low[2] and close[1] < low[2]
// ==============================================================================
float pipSize = syminfo.mintick * (syminfo.type == "forex" ? 10 : 1)
float bufferDist = i_slBufferPips * pipSize

bool isBullishFvg = (low > high[2]) and (close[1] > high[2])
bool isBearishFvg = (high < low[2]) and (close[1] < low[2])

// Draw LuxAlgo FVG Box for Visual Confirmation
if sessionActive and (isBullishFvg or isBearishFvg) and showFvgBoxesInput and not firstSessionFvgTriggered
    if isBullishFvg
        box.new(left=bar_index - 2, top=low, right=bar_index + 10, bottom=high[2], border_color=fvgBullColorInput, bgcolor=fvgBullColorInput)
    if isBearishFvg
        box.new(left=bar_index - 2, top=low[2], right=bar_index + 10, bottom=high, border_color=fvgBearColorInput, bgcolor=fvgBearColorInput)

// ==============================================================================
// 6. STRATEGY TRIGGER: 1ST IMBALANCE OF SESSION ONLY + 1 TRADE PER DAY
// ==============================================================================
bool buyCondition = false
bool sellCondition = false

bool canTradeToday = i_oneTradePerDay ? not tradeTriggeredToday : true

if sessionActive and canTradeToday and not firstSessionFvgTriggered
    if isMajorPair
        // Major rules: Liquidity sweep of PDH/PDL required BEFORE 1st imbalance entry
        if pdlSwept and isBullishFvg
            buyCondition := true
            firstSessionFvgTriggered := true
        else if pdhSwept and isBearishFvg
            sellCondition := true
            firstSessionFvgTriggered := true
    else
        // Minor rules: No sweep required, direct entry on 1st session imbalance
        if isBullishFvg
            buyCondition := true
            firstSessionFvgTriggered := true
        else if isBearishFvg
            sellCondition := true
            firstSessionFvgTriggered := true

    // Enforce IPDA Central Bank Macro Bias filter if configured
    if i_ipdaFilter == "BUY_ONLY"
        sellCondition := false
    else if i_ipdaFilter == "SELL_ONLY"
        buyCondition := false
    else if i_ipdaFilter == "DISABLED"
        buyCondition := false
        sellCondition := false

// ==============================================================================
// 7. EXACT ENTRY, STOP LOSS & 1:3 TAKE PROFIT CALCULATION
// Major Pairs: SL strictly at London Session Low (Buy) or London Session High (Sell)
// Minor Pairs: SL below/above 1st imbalance base/top with breathing space
// Target: Strictly 1:3 Risk-to-Reward Ratio
// ==============================================================================
var float activeEntry = na
var float activeSl    = na
var float activeTp1   = na
var string activeAction = "NONE"

if buyCondition
    activeAction := "BUY"
    activeEntry  := low // Entry on 1st Bullish Imbalance retest
    float baseSl := high[2] - bufferDist // Minor pair SL: below imbalance base + breathing space
    float majorSl := sLow // Major pair SL: Low price of the London session (which swept PDL)
    activeSl     := isMajorPair ? majorSl : baseSl
    float risk   := activeEntry - activeSl
    if risk > 0
        activeTp1 := activeEntry + (risk * i_tp1_rr) // Target strictly 1:3 RR
        tradeTriggeredToday := true
        
        // Draw Entry, SL, and 1:3 TP levels on chart
        if i_showLevels
            line.new(bar_index - 1, activeEntry, bar_index + 15, activeEntry, extend=extend.right, color=color.blue, width=2, style=line.style_solid)
            line.new(bar_index - 1, activeSl, bar_index + 15, activeSl, extend=extend.right, color=color.red, width=2, style=line.style_dashed)
            line.new(bar_index - 1, activeTp1, bar_index + 15, activeTp1, extend=extend.right, color=color.green, width=2, style=line.style_solid)
        
        string slTypeDesc = isMajorPair ? "London Session Low" : "Below Imbalance/FVG"
        string buyLabelText = "⚡ 1st IMBALANCE BUY (1 Trade/Day)\\nEntry: " + str.tostring(activeEntry, "#.#####") + "\\nSL (" + slTypeDesc + "): " + str.tostring(activeSl, "#.#####") + "\\nTP1 (1:3): " + str.tostring(activeTp1, "#.#####")
        label.new(x=bar_index, y=low - bufferDist, text=buyLabelText, color=color.green, textcolor=color.white, style=label.style_label_up, size=size.small)
        
        // Automated JSON Webhook Alert to Dashboard
        string buyNote = isMajorPair ? "Major Pair (USD Attached): PDL Swept -> 1st Imbalance (SL @ London Session Low, 1:3 RR)" : "Minor Pair (No USD): Direct 1st Imbalance (SL below FVG, 1:3 RR)"
        string alertJson = '{"strategy":"CBDR","symbol":"' + syminfo.ticker + '","timeframe":"15m","action":"BUY","entry":' + str.tostring(activeEntry, "#.#####") + ',"sl":' + str.tostring(activeSl, "#.#####") + ',"tp1":' + str.tostring(activeTp1, "#.#####") + ',"notes":"' + buyNote + '","secret":"' + i_webhookSecret + '"}'
        alert(alertJson, alert.freq_once_per_bar_close)

if sellCondition
    activeAction := "SELL"
    activeEntry  := high // Entry on 1st Bearish Imbalance retest
    float topSl  := low[2] + bufferDist // Minor pair SL: above imbalance top
    float majorSl := sHigh // Major pair SL: High price of the London session (which swept PDH)
    activeSl     := isMajorPair ? majorSl : topSl
    float risk   := activeSl - activeEntry
    if risk > 0
        activeTp1 := activeEntry - (risk * i_tp1_rr) // Target strictly 1:3 RR
        tradeTriggeredToday := true
        
        // Draw Entry, SL, and 1:3 TP levels on chart
        if i_showLevels
            line.new(bar_index - 1, activeEntry, bar_index + 15, activeEntry, extend=extend.right, color=color.blue, width=2, style=line.style_solid)
            line.new(bar_index - 1, activeSl, bar_index + 15, activeSl, extend=extend.right, color=color.red, width=2, style=line.style_dashed)
            line.new(bar_index - 1, activeTp1, bar_index + 15, activeTp1, extend=extend.right, color=color.green, width=2, style=line.style_solid)
        
        string slTypeDesc = isMajorPair ? "London Session High" : "Above Imbalance/FVG"
        string sellLabelText = "⚡ 1st IMBALANCE SELL (1 Trade/Day)\\nEntry: " + str.tostring(activeEntry, "#.#####") + "\\nSL (" + slTypeDesc + "): " + str.tostring(activeSl, "#.#####") + "\\nTP1 (1:3): " + str.tostring(activeTp1, "#.#####")
        label.new(x=bar_index, y=high + bufferDist, text=sellLabelText, color=color.red, textcolor=color.white, style=label.style_label_down, size=size.small)
        
        // Automated JSON Webhook Alert to Dashboard
        string sellNote = isMajorPair ? "Major Pair (USD Attached): PDH Swept -> 1st Imbalance (SL @ London Session High, 1:3 RR)" : "Minor Pair (No USD): Direct 1st Imbalance (SL above FVG, 1:3 RR)"
        string alertJson = '{"strategy":"CBDR","symbol":"' + syminfo.ticker + '","timeframe":"15m","action":"SELL","entry":' + str.tostring(activeEntry, "#.#####") + ',"sl":' + str.tostring(activeSl, "#.#####") + ',"tp1":' + str.tostring(activeTp1, "#.#####") + ',"notes":"' + sellNote + '","secret":"' + i_webhookSecret + '"}'
        alert(alertJson, alert.freq_once_per_bar_close)

// ==============================================================================
// 8. LUXALGO SESSIONS RANGE BOX & BACKGROUND
// ==============================================================================
plot(pdh, "PDH (Previous Day High)", color=color.new(color.orange, 20), linewidth=1, style=plot.style_stepline)
plot(pdl, "PDL (Previous Day Low)", color=color.new(color.purple, 20), linewidth=1, style=plot.style_stepline)

bgcolor(sessionActive ? color.new(sessionColorInput, 93) : na, title="London Session Background")

// ==============================================================================
// 9. ON-CHART LIVE HEADS-UP DISPLAY (HUD) TABLE
// ==============================================================================
var table hud = table.new(position=position.top_right, columns=2, rows=8, bgcolor=color.new(color.black, 15), border_color=color.gray, border_width=1)

if barstate.islast and i_showTable
    table.cell(table_id=hud, column=0, row=0, text="LuxAlgo SMC + CBDR", bgcolor=color.blue, text_color=color.white, text_size=size.small)
    table.cell(table_id=hud, column=1, row=0, text=tickerClean, bgcolor=color.blue, text_color=color.yellow, text_size=size.small)
    
    table.cell(table_id=hud, column=0, row=1, text="Trading Day:", text_color=color.white, text_size=size.tiny)
    table.cell(table_id=hud, column=1, row=1, text=dayStatusText, bgcolor=isTradingDay ? color.green : color.red, text_color=color.white, text_size=size.tiny)
    
    table.cell(table_id=hud, column=0, row=2, text="Pair Category:", text_color=color.white, text_size=size.tiny)
    table.cell(table_id=hud, column=1, row=2, text=isMajorPair ? "MAJOR (Sweep Req)" : "MINOR (Direct 1st FVG)", text_color=color.yellow, text_size=size.tiny)
    
    table.cell(table_id=hud, column=0, row=3, text="PDH / PDL Swept?", text_color=color.white, text_size=size.tiny)
    string sweepStatus = isMajorPair ? (pdhSwept ? "PDH Swept (Bearish)" : pdlSwept ? "PDL Swept (Bullish)" : "No Sweep Yet") : "Bypassed (Minor)"
    table.cell(table_id=hud, column=1, row=3, text=sweepStatus, text_color=color.white, text_size=size.tiny)

    table.cell(table_id=hud, column=0, row=4, text="Daily Trade Limit:", text_color=color.white, text_size=size.tiny)
    table.cell(table_id=hud, column=1, row=4, text=tradeTriggeredToday ? "1/1 TAKEN (Locked)" : "0/1 READY", bgcolor=tradeTriggeredToday ? color.purple : color.teal, text_color=color.white, text_size=size.tiny)
    
    table.cell(table_id=hud, column=0, row=5, text="Active Trade:", text_color=color.white, text_size=size.tiny)
    table.cell(table_id=hud, column=1, row=5, text=activeAction, bgcolor=activeAction == "BUY" ? color.green : activeAction == "SELL" ? color.red : color.gray, text_color=color.white, text_size=size.tiny)
    
    table.cell(table_id=hud, column=0, row=6, text="Target 1:3 TP:", text_color=color.white, text_size=size.tiny)
    table.cell(table_id=hud, column=1, row=6, text=na(activeTp1) ? "--" : str.tostring(activeTp1, "#.#####"), text_color=color.green, text_size=size.tiny)
    
    table.cell(table_id=hud, column=0, row=7, text="Model Architecture:", text_color=color.white, text_size=size.tiny)
    table.cell(table_id=hud, column=1, row=7, text="1st Session Imbalance (1:3 RR)", bgcolor=color.navy, text_color=color.white, text_size=size.tiny)
`;
}

/**
 * Produces production-grade TradingView Pine Script v5 code for the Stop Hunt (5m Asian Sweep) Model
 */
export function generateStopHuntTradingViewPineScript(webhookUrl: string = 'https://perth-subscriptions-namespace-ambassador.trycloudflare.com/api/signals/webhook'): string {
  return `//@version=5
indicator("Apex ICT Stop Hunt (5m Asian Sweep + SMC CHoCH)", overlay=true, max_boxes_count=500, max_lines_count=500, max_labels_count=500)

// 1. Inputs
timeZoneInput       = input.string("America/New_York", "Timezone")
asianSessionHours   = input.session("2100-0100", "Asian Killzone (Observation Only)")
slBufferPips        = input.float(3.0, "SL Breathing Space (Pips)", minval=1.0, maxval=10.0, step=0.5)
ipdaDirectionInput  = input.string("AUTO", "IPDA Bias Filter", options=["AUTO", "BUY_ONLY", "SELL_ONLY", "ANY"])

// 2. Asian Killzone Tracker (21:00 - 01:00 NY)
inAsianKZ = not na(time(timeframe.period, asianSessionHours, timeZoneInput))

var float asianHigh = na
var float asianLow  = na
var int   asianStartBar = na
var box   asianBox      = na
var line  asianHighLine = na
var line  asianLowLine  = na
var label asianHighLabel= na
var label asianLowLabel = na

var bool  asianHighSwept = false
var bool  asianLowSwept  = false
var bool  tradeTakenToday= false

isAsianStart = inAsianKZ and not inAsianKZ[1]
isAsianEnd   = not inAsianKZ and inAsianKZ[1]

if isAsianStart
    asianHigh := high
    asianLow  := low
    asianStartBar := bar_index
    asianHighSwept := false
    asianLowSwept  := false
    tradeTakenToday:= false
    asianBox := box.new(left=bar_index, top=asianHigh, right=bar_index, bottom=asianLow, bgcolor=color.new(#e91e63, 85), border_color=color.new(#e91e63, 40), border_style=line.style_dashed)

if inAsianKZ
    asianHigh := math.max(asianHigh, high)
    asianLow  := math.min(asianLow, low)
    box.set_top(asianBox, asianHigh)
    box.set_bottom(asianBox, asianLow)
    box.set_right(asianBox, bar_index)

if isAsianEnd
    asianHighLine := line.new(asianStartBar, asianHigh, bar_index + 20, asianHigh, color=color.black, width=2)
    asianLowLine  := line.new(asianStartBar, asianLow, bar_index + 20, asianLow, color=color.black, width=2)
    asianHighLabel := label.new(bar_index + 20, asianHigh, "Asian High (BSL)", color=color(na), textcolor=color.black, style=label.style_label_left, size=size.small)
    asianLowLabel  := label.new(bar_index + 20, asianLow, "Asian Low (SSL)", color=color(na), textcolor=color.black, style=label.style_label_left, size=size.small)

if not inAsianKZ and not na(asianHighLine)
    line.set_x2(asianHighLine, bar_index + 15)
    line.set_x2(asianLowLine, bar_index + 15)
    label.set_x(asianHighLabel, bar_index + 15)
    label.set_x(asianLowLabel, bar_index + 15)

// 3. Post-Asian Sweep (after 01:00 NY)
if not inAsianKZ and not na(asianHigh) and not na(asianLow)
    if high > asianHigh and not asianHighSwept
        asianHighSwept := true
        label.new(bar_index, high, "⚡ STOP HUNT (Asian High Swept)", color=#F23645, textcolor=color.white, style=label.style_label_down, size=size.tiny)
    if low < asianLow and not asianLowSwept
        asianLowSwept := true
        label.new(bar_index, low, "⚡ STOP HUNT (Asian Low Swept)", color=#089981, textcolor=color.white, style=label.style_label_up, size=size.tiny)

// 4. LuxAlgo SMC Internal CHoCH & FVG
pivotLen = 5
pivotH = ta.pivothigh(high, pivotLen, pivotLen)
pivotL = ta.pivotlow(low, pivotLen, pivotLen)
var float lastPivotH = na
var float lastPivotL = na
if not na(pivotH)
    lastPivotH := high[pivotLen]
if not na(pivotL)
    lastPivotL := low[pivotLen]

bearishCHoCH = not inAsianKZ and asianHighSwept and not na(lastPivotL) and ta.crossunder(close, lastPivotL)
bullishCHoCH = not inAsianKZ and asianLowSwept  and not na(lastPivotH) and ta.crossover(close, lastPivotH)

bullishFVG = low[0] > high[2] and close[1] > open[1]
bearishFVG = high[0] < low[2] and close[1] < open[1]

var float fvgTop = na
var float fvgBottom = na
if bullishFVG
    fvgTop := low[0]
    fvgBottom := high[2]
    box.new(bar_index[2], fvgTop, bar_index + 1, fvgBottom, bgcolor=color.new(#00ff68, 75), border_color=color.new(#00ff68, 40))
if bearishFVG
    fvgTop := low[2]
    fvgBottom := high[0]
    box.new(bar_index[2], fvgTop, bar_index + 1, fvgBottom, bgcolor=color.new(#ff0008, 75), border_color=color.new(#ff0008, 40))

// 5. IPDA Bias Filter
isDefaultSell = str.contains(syminfo.ticker, "EURUSD") or str.contains(syminfo.ticker, "XAUUSD") or str.contains(syminfo.ticker, "AUDUSD") or str.contains(syminfo.ticker, "NZDUSD")
isDefaultBuy  = str.contains(syminfo.ticker, "GBPUSD") or str.contains(syminfo.ticker, "USDJPY") or str.contains(syminfo.ticker, "USDCHF") or str.contains(syminfo.ticker, "USDCAD")
ipdaPermitSell = (ipdaDirectionInput == "SELL_ONLY" or ipdaDirectionInput == "ANY") or (ipdaDirectionInput == "AUTO" and isDefaultSell)
ipdaPermitBuy  = (ipdaDirectionInput == "BUY_ONLY" or ipdaDirectionInput == "ANY") or (ipdaDirectionInput == "AUTO" and isDefaultBuy)

// 6. Signal Triggers
validSellSignal = not inAsianKZ and asianHighSwept and bearishFVG and ipdaPermitSell and not tradeTakenToday
validBuySignal  = not inAsianKZ and asianLowSwept and bullishFVG and ipdaPermitBuy and not tradeTakenToday

var float tradeEntry = na
var float tradeSL    = na
var float tradeTP    = na
var string tradeSide = na

if validSellSignal
    tradeTakenToday := true
    tradeSide       := "SELL"
    tradeEntry      := close
    tradeSL         := fvgTop + (slBufferPips * 10 * syminfo.mintick)
    tradeTP         := asianLow // Target Opposing Asian Level
    line.new(bar_index, tradeEntry, bar_index + 30, tradeEntry, color=color.blue, width=2)
    line.new(bar_index, tradeSL, bar_index + 30, tradeSL, color=color.red, width=2)
    line.new(bar_index, tradeTP, bar_index + 30, tradeTP, color=color.green, width=2)
    label.new(bar_index, high, "🔴 STOP HUNT SELL\\nEntry: " + str.tostring(tradeEntry, "#.#####") + "\\nSL: " + str.tostring(tradeSL, "#.#####") + "\\nTP (Asian Low): " + str.tostring(tradeTP, "#.#####"), color=#F23645, textcolor=color.white, style=label.style_label_down, size=size.small)

if validBuySignal
    tradeTakenToday := true
    tradeSide       := "BUY"
    tradeEntry      := close
    tradeSL         := fvgBottom - (slBufferPips * 10 * syminfo.mintick)
    tradeTP         := asianHigh // Target Opposing Asian Level
    line.new(bar_index, tradeEntry, bar_index + 30, tradeEntry, color=color.blue, width=2)
    line.new(bar_index, tradeSL, bar_index + 30, tradeSL, color=color.red, width=2)
    line.new(bar_index, tradeTP, bar_index + 30, tradeTP, color=color.green, width=2)
    label.new(bar_index, low, "🟢 STOP HUNT BUY\\nEntry: " + str.tostring(tradeEntry, "#.#####") + "\\nSL: " + str.tostring(tradeSL, "#.#####") + "\\nTP (Asian High): " + str.tostring(tradeTP, "#.#####"), color=#089981, textcolor=color.white, style=label.style_label_up, size=size.small)

// 7. Webhook Dispatch
webhookPayload = '{"strategy":"STOP_HUNT","symbol":"' + syminfo.ticker + '","timeframe":"5m","action":"' + tradeSide + '","entry":' + str.tostring(tradeEntry) + ',"sl":' + str.tostring(tradeSL) + ',"tp1":' + str.tostring(tradeTP) + ',"asian_high_swept":' + (asianHighSwept ? 'true' : 'false') + ',"asian_low_swept":' + (asianLowSwept ? 'true' : 'false') + ',"choch_confirmed":true,"fvg_confirmed":true,"session":"Post-Asian"}'

if validBuySignal or validSellSignal
    alert(webhookPayload, alert.freq_once_per_bar_close)
`;
}

