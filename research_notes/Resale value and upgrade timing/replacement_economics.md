# Optimal Replacement Timing for Consumer Durables: Economics, Mathematics, and an Evaluation of the App's Rule

Scope: the theory of when to sell and replace a consumer durable, with formulas the app can implement, worked examples, and an audit of the current rule in `src/lib/upgrade.ts` and `src/lib/lifecycle.ts`.

Notation used throughout (years as the time unit):
- `P` = price of the item (and of an identical replacement, unless stated)
- `V(t)` = gross resale value at age t. App model: `V(t) = P * max(floor, (1-firstDrop)(1-perYear)^t) * (1 - cliff(t)*(1-0.15))`, cliff = smoothstep from 0.6L to L (L = useful life)
- `N(t) = (1-f)V(t) - k` = net sale proceeds after a percentage fee f and a fixed cost/effort k
- `c(t)` = running cost rate (repairs, maintenance, consumables) at age t
- `h(t)` = failure hazard rate; `S(t) = exp(-∫0^t h)` = survival probability. Weibull: `h(t) = (β/η)(t/η)^(β-1)`, `S(t) = exp(-(t/η)^β)`
- `u(t)` = obsolescence or "inferiority" cost rate: the use-value you forgo by owning an age-t item instead of a new model
- `i` = discount rate per year, `r = ln(1+i)`. `CRF(i,n) = i(1+i)^n / ((1+i)^n - 1)` (capital recovery factor)
- `C(T)` = total cost of one ownership cycle of length T; `A(T) = C(T)/T` = average cost per year; `m(T) = C'(T)` = marginal cost of keeping one more instant

Every app-specific number below comes from my own runs of the app's formula (Python scripts reproducing `fractionAt` and `sellPlan`). These are labelled "computed". They are derived, not cited.

---

## 1. Classic replacement / economic-life theory, and when "marginal cost = average cost" is the optimum

### Takeaway
The engineering-economics "economic service life" is the holding period that minimises the equivalent annual cost (EAC). Under stationary, repeated, like-for-like replacement, that minimum is where the marginal cost of keeping one more period equals the average (EAC) cost so far. The current app rule is exactly the discrete, undiscounted form of that condition. But the condition only gives the global minimum when marginal cost is *rising*. With pure depreciation and no running, failure or obsolescence costs, marginal cost *falls* with age and there is no interior optimum: keeping the item until it dies is cheapest.

### Cited Findings
- Economic service life is defined as "the holding period that minimizes your total annual equivalent cost for an asset", found by computing AEC for each holding period and choosing the minimum (lecture notes keyed to Park, *Contemporary Engineering Economics* §12.1–12.3). — [Chowdhury, ENGR 4760 Replacement Analysis notes (RPI)](https://arshadzahangirchowdhury.github.io/courses/engr4760-notes/06-replacement-analysis.html)
- Capital cost per year: `AEC_capital = (P - S_n)(A/P, i, n) + S_n * i`. Here `S_n*i` is the opportunity cost of the money tied up in salvage value. Total AEC = capital AEC + annual-equivalent operating cost. — [Chowdhury notes](https://arshadzahangirchowdhury.github.io/courses/engr4760-notes/06-replacement-analysis.html)
- Marginal cost of keeping the defender one more year: `MC = OC + (S_{n-1} - S_n)(A/P, i, 1)` = the year's operating cost plus the loss of salvage plus interest on salvage. Decision rule: if MC exceeds the challenger's AEC, replace now; otherwise keep another year and recompute. — [Chowdhury notes](https://arshadzahangirchowdhury.github.io/courses/engr4760-notes/06-replacement-analysis.html)
- Defender–challenger procedure: under identical replacement over an infinite horizon, compute the ESL and AEC of both, choose the lower AEC, replace at the ESL and repeat. If the challenger changes over time, keep the defender until its marginal cost exceeds the challenger's AEC. Sunk costs are excluded; only future costs count. — [Chowdhury notes](https://arshadzahangirchowdhury.github.io/courses/engr4760-notes/06-replacement-analysis.html)
- EAC typically falls, reaches a minimum, then rises. The minimum-cost life is normally shorter than useful life because operating and maintenance costs rise late in life. EAC = NPV × CRF. — [Wikipedia: Equivalent annual cost](https://en.wikipedia.org/wiki/Equivalent_annual_cost)
- A continuous-time version with continuous discounting gives equivalent capital cost `g(t) = (e^r - 1)/(e^{rt} - 1) * (A e^{rt} - R(t))` and equivalent maintenance cost `f(t) = (e^r - 1)/(e^{rt} - 1) * e^{rt} ∫0^t M(s)e^{-rs} ds`. Economic life minimises `h = f + g`. With linear maintenance `M = a t` and linear salvage decline `R = A - b t`, the paper shows that on the depreciating segment the sign of h′ depends only on whether a > br, a = br or a < br. A rising maintenance gradient is what creates an interior optimum. The paper cites Alchian (1958, RAND R-224), Grant, Ireson & Leavenworth (1990), Park (2002), Fabrycky & Blanchard (1991) and Thuesen et al. (1971) as the classical references. — [Physical assets replacement: an analytical approach (arXiv 1210.3678)](https://ar5iv.labs.arxiv.org/html/1210.3678)
- The dynamic-programming / optimal-stopping form: Rust (1987, *Econometrica* 55(5):999–1033) modelled a bus-fleet superintendent's monthly keep-or-replace decision on engine mileage as a Markov decision process. Rust estimated it structurally and rejected a myopic (zero discount) decision-maker in favour of a forward-looking one. — [EconPapers record](https://econpapers.repec.org/RePEc:ecm:emetrp:v:55:y:1987:i:5:p:999-1033); [Ferrall replication WP](https://www.econ.queensu.ca/sites/econ.queensu.ca/files/wpaper/qed_wp_1467.pdf)

### Inferences (math; derived, not cited)
**Continuous, undiscounted.** `A(T) = C(T)/T`, so `A'(T) = (m(T) - A(T))/T`. A stationary point needs `m(T*) = A(T*)`. It is a minimum when m crosses A from below. A sufficient condition for a *unique global* minimum is that `m(t)` is non-decreasing (C convex) and eventually exceeds A. Then A is quasi-convex and the first crossing is the global minimum. If m is decreasing (C concave), A is decreasing everywhere and the "optimum" is T → end of life.

**Discrete (the app's form).** With `ΔC(T) = C(T+1) - C(T)`, `A(T+1) ≥ A(T) ⇔ ΔC(T) ≥ C(T)/T = A(T)`. So "sell at the first T where next-12-month loss ≥ average so far" is *exactly* the first T at which keeping a further full 12 months stops lowering the average. That is a correct identity. But:
1. It compares a 12-month forward block. The true (monthly) minimum of A lies between T and T+1, so the rule systematically fires early. Computed for the app's phone curve: A(T) has a local minimum of $230/yr at 2.5 y, while the rule fires at 2.17 y. That is about 4 months early, costing about $11/yr ≈ $25 over the cycle.
2. It finds the first *local* turn-up, not the global minimum. Computed for a $1,000 phone, app curve, depreciation only: A = $299 (1.5 y), $257 (2 y), $230 (2.5 y), $241 (3 y), $252 (3.5 y), $239 (4 y), $193 (5 y), $162 (6 y), $123 (8 y), $99 (10 y). A has a local bump caused by the cliff and then falls forever. Average depreciation per year is lowest if you never sell.

**Conditions under which MC = AC minimises cost (state these explicitly in the app docs):**
(a) An infinite chain of identical replacements: the same price, the same depreciation and the same service. (b) Every year of ownership delivers the same service or utility. Otherwise "cost per year" is the wrong denominator; use cost per unit of service. (c) Deterministic costs, or expected costs under risk neutrality. (d) No discounting, or discounting handled via EAC (below). (e) Marginal cost eventually rising, for uniqueness. (f) Purchase cost is the only fixed cost per cycle; selling fees enter as part of `N(T)`.

**Discounted version (to implement).**
`EAC(T) = CRF(i,T) * [ P + Σ_{t=1..T} c_t (1+i)^{-t} - N(T)(1+i)^{-T} ]`.
Keep one more year iff `MC(T+1) = c_{T+1} + N(T)(1+i) - N(T+1) < EAC*_challenger`. Under identical stationary replacement, `EAC*_challenger = min_T EAC(T)`. Continuous analogue: replace when `c(T) + r N(T) - N'(T) = EAC(T)`.

**Defender–challenger correction to the app.** The correct benchmark is the *challenger's* minimum EAC (what a new replacement will cost per year over its own optimal life), not the defender's own historical average `(P - V(T))/T`. The two are equal at the optimum only under perfect stationarity. They differ when the item was bought at a discount, used, as a gift, or when the successor's price differs. The defender's own average embeds a sunk cost (its first drop), which classical analysis says to exclude.

### Gaps
- I did not retrieve full-text pages of Park, Newnan, Blank & Tarquin, Jardine & Tsang, or Terborgh (1949, *Dynamic Equipment Policy*). Formulas attributed to "classical" practice above are confirmed via lecture notes and the arXiv paper's citations, not the books themselves.
- Bellman's (1955) "Equipment replacement policy" DP formulation was not fetched. The DP statement below (Section 2) is standard but uncited.

---

## 2. Adding repair/failure hazard, death-before-sale, obsolescence, replacement price paths, discounting, transaction costs and inflation

### Takeaway
Each factor enters as an additive term in the marginal cost of keeping the item. A rising hazard and obsolescence are what make "replace before it dies" optimal. Transaction costs, discounting and rising replacement prices push the optimum later. Falling quality-adjusted replacement prices push it earlier. The single most important missing term in the app is obsolescence / declining relative utility. Without it, the app's own value curve says "keep until it dies". The cliff placed at 0.6L is what manufactures an interior answer.

### Cited Findings
- Weibull shape β < 1 indicates early ("infant") failures, β ≈ 1 random failures, and β > 1 wear-out. This is the standard way to represent the bathtub curve piecewise. — [Minitab: Why the Weibull distribution is always welcome](https://blog.minitab.com/en/understanding-statistics/why-the-weibull-distribution-is-always-welcome); [NIST/SEMATECH e-Handbook](https://itl.nist.gov/div898/handbook/apr/section1/apr162.htm); Jiang & Murthy (2011), "A study of Weibull shape parameter", *Reliab. Eng. Syst. Safety* 96(12) — [IDEAS](https://ideas.repec.org/a/eee/reensy/v96y2011i12p1619-1626.html)
- LBNL (Franco, Bennani, Ke, Cubero, Lekov, 2018) fits a 3-parameter Weibull survival function to US residential appliance stock and shipment data and argues that a lifetime distribution is more informative than an average lifetime. For residential gas boilers the fitted shape β ranged 1.45–3.19 across data subsets. All-data fit: scale α = 28.5, β = 2.39, delay θ = 1.0; mean ≈ 26 y. That puts β ≈ 2–2.5 (clear wear-out) as a defensible default for appliances. — [LBNL, "Estimating Residential Appliance Lifetime for Energy Efficient Policy Analysis"](https://escholarship.org/uc/item/7z222821)
- Smartphone failure rates (old data, from a warranty seller): in SquareTrade's 2010 study of 25,000+ iPhones, 25.6% of owners had a failure within two years, 18.1% from accidents and 7.5% from hardware malfunction. Accidents dominate and behave like a roughly constant hazard (β ≈ 1). — [SquareTrade iPhone failure rates 2010 (PDF)](https://www.squaretrade.com/htm/pdf/iPhone_failure_rates_6_22_2010.pdf); [Computerworld summary](https://www2.computerworld.com.au/article/350849/more_than_quarter_iphones_break_within_2_years/)
- In the PC-processor market, consumers are forward-looking and quality improvements are the main driver of replacement purchases. A myopic model underestimates replacement cycle length by roughly one year. — [Gordon (2009), Marketing Science 28(5):846–867](https://pubsonline.informs.org/doi/fpi/10.1287/mksc.1080.0448); [Kellogg summary](https://www.kellogg.northwestern.edu/academics-research/research/detail/2009/a-dynamic-model-of-consumer-replacement-cycles-in-the/)
- For hi-tech appliances, a common replacement reason was out-of-date software rather than hardware malfunction. — [EEA, Product lifespans: monitoring trends](https://www.eea.europa.eu/en/analysis/publications/product-lifespans-monitoring-trends)
- Transaction costs: eBay's electronics final-value fee is reported at about 12.9%–13.6% of the sale total plus about $0.30 per order (third-party guides disagree). eBay announced increases of up to 0.35 percentage points from Feb 14 2025. — [eBay Canada seller update Jan 2025](https://www.ebay.ca/sellercentre/resources/seller-updates/2025-january/final-value-fees); [eDesk eBay fees 2025](https://www.edesk.com/blog/ebay-fees-2025)
- Discounting: Rust's estimates rejected zero discounting for a real replacement decision-maker. — [Ferrall replication](https://www.econ.queensu.ca/sites/econ.queensu.ca/files/wpaper/qed_wp_1467.pdf)

### Inferences (formulas the app can implement; derived)
**General renewal-reward model** (age-replacement policy "sell at age T unless it dies first"; Barlow–Proschan type, uncited here):

```
A(T) = [ P + ∫0^T S(t)·( c(t) + u(t) + h(t)·c_f ) dt  −  S(T)·N(T) ]  /  ∫0^T S(t) dt
```
- `c_f` = the extra cost of an *unplanned* death: emergency purchase at a bad price, downtime, data loss, hassle.
- If the item dies before sale, you lose N(t) entirely. That loss is already captured because only survivors, with weight S(T), receive N(T).
- With discounting, weight every term inside the integrals and N(T) by `e^{-rt}`. The ratio is then the EAC of the policy.

**Equivalent marginal rule** (what to compare against the challenger's best EAC each month):
```
MC(t) = c(t) + u(t) + r·N(t) − N'(t) + h(t)·( N(t) + c_f )
         running  obsol.  interest  depreciation  expected loss if it dies now
```
"Expected loss from death before sale" = hazard × (remaining net resale + failure penalty). For a $500 item with h = 0.15/yr, that is about $75/yr. This term is material.

**Key qualitative result (computed, see Section 5).** If `c = u = c_f = 0`, adding a hazard does *not* create an interior optimum. Dying only ends the cycle the item would have ended anyway, and once V is near zero, death costs nothing. So "replace before failure" is optimal only when there is a failure penalty c_f > 0 with an increasing hazard (β > 1), rising running costs, or obsolescence. That is the standard age-replacement result.

**Obsolescence (Terborgh "inferiority gradient", MAPI tradition; derivation mine).** Let the use-value gap versus the current new model grow linearly, `u(t) = g·t` ($/yr). With zero salvage, `A(T) = P/T + gT/2`. So `T* = sqrt(2P/g)` and `A* = sqrt(2Pg)`. With salvage, replace P by P − N(T) and solve numerically. The gradient g can be parameterised as a share of price per year per year (e.g. phones 5–8%·P, laptops 3–5%·P, vacuums ≈1%·P). These values are my assumptions, not data. A rough proxy is the rate of quality-adjusted price decline for the category.

**Replacement price path / repeated cycles.** If each successive replacement costs `P·(1+π)^{nT}` (π = inflation if positive; a negative value represents quality-adjusted price declines for electronics), the infinite-horizon PV of the policy is
```
PV_total(T) = PV_cycle(T) / (1 − e^{−(r−π)T})
```
Minimise this, or equivalently use the real rate r − π in the EAC. When π > 0 (replacements get dearer) the optimum lengthens. When π < 0 (better or cheaper successors) it shortens.

**Transaction costs.** `N(T) = (1−f)V(T) − k`. A fee f acts like a bigger first drop. The fixed cost k adds `k/T` to A(T), which favours fewer, later sales. If `N(T) ≤ 0` or `N(T)` is small relative to the hassle, "use it up" dominates. (The app already has a `use-up` status at 12% of price.)

**Discounting materiality.** At 5%/yr the discount factors are 0.952, 0.907, 0.864 and 0.784 at 1, 2, 3 and 5 years (computed). Discounting adds an interest term `r·N(t)` to marginal cost, about 5% of current resale value per year (≈ $25/yr on a $500 resale). Computed: adding 5% discounting moved no optimum by more than a few months in the examples. It changes the *level* of EAC by about 5–15% but barely its *location*. For items under about $3k with 2–8 year horizons it is second-order. Including it is cheap, though.

**Bellman/DP form** (for a later version with stochastic condition): `W(a) = min{ keep: c(a) + u(a) + β_d·E[W(a+1) | survive] + β_d·h(a)·(c_f + W_new) ;  sell: −N(a) + P + W(0) }`. Solve by value iteration over monthly ages. With deterministic costs this collapses to the EAC rule.

### Gaps
- I found no recent, credible per-age hazard data for current smartphones, laptops or vacuums. SquareTrade figures date from 2008–2010 and come from a warranty seller.
- I found no source quantifying the obsolescence gradient g for consumer categories. This is the most influential parameter, and its values here are assumptions.
- Weibull fits specific to small appliances or electronics (as opposed to boilers) were not found in fetched sources.

---

## 3. Consumer-economics, TCO and lifetime literature

### Takeaway
The empirical literature supports two points. Consumers' actual replacement is driven mostly by quality improvements and obsolescence, not physical failure (Gordon; EEA). Personal-finance TCO analyses consistently find that keeping reliable durables longer is cheaper in pure money terms (Consumer Reports on cars; Choice on washers). The app should therefore frame "best time to sell" as a trade-off between money and staying current, not as a pure money-saving date.

### Cited Findings
- Consumer Reports (2007): keeping a Honda Civic EX for 15 years / 200k miles versus replacing every 5 years saved about $30,800 including investment returns (about $20,500 before them). The savings came from depreciation ($14,900 vs $35,500 over 15 years), insurance ($18,500 vs $22,500) and financing ($3,100 vs $8,500). — [CNN Money, "Drive your car to death, save $31,000"](https://money.cnn.com/2007/08/30/autos/cr_drive_200k/index.htm)
- Consumer Reports' repair heuristic: divide the repair bill by the months you plan to keep the car; if that is below a new-car payment, the repair is almost always worth it. This is a marginal-vs-challenger comparison. — [Cars.com, How to save money on a car: wait](https://www.cars.com/articles/how-to-save-money-on-a-car-wait-1420663307170)
- Choice (Australia, as reported): replacing front-loading washing machines is cheaper than fixing them only after about 12 years. "Reasonable" life expectancy for a budget smartphone is about 3 years, partly because battery replacement is a large share of price. — [Electronics B2B summary](https://www.electronicsb2b.com/?p=68434) (secondary; original Choice report not fetched)
- Repair-vs-replace modelling for seven washing-machine models: repair is more favourable than replacement, and a cost-minimising consumer should accept many repairs but become more cautious near expected end of life. — [TU Delft repository paper](https://repository.tudelft.nl/file/File_5cba3c64-7352-4313-aac4-b8c2c6e984c0) (via search snippet; full text not read)
- Actual lifetimes of replaced products vary enormously: washing machines 5–18 y, vacuum cleaners 5–30 y, TVs 4–25 y, smartphones 2–9 y. Most replaced washing machines had a defect. — [TU Delft study (search snippet)](https://repository.tudelft.nl/file/File_350a2a90-e1cf-42d6-9560-812a39a94e17)
- EEB/Coolproducts climate-based modelling lists an expected smartphone life of 3 years and washing machine life of 11.5 years. It argues that for global-warming potential, repair always beats replacement (an advocacy source). — [EEB Coolproducts briefing](https://eeb.org/wp-content/uploads/2019/09/Coolproducts-briefing.pdf)
- Planned obsolescence theory: Bulow (1986, *QJE* 101(4):729–749) defines it as producing goods with uneconomically short lives to force repeat purchases. Oligopolists can gain by colluding to reduce durability, while Swan showed a monopolist would not. — [IDEAS](https://ideas.repec.org/a/oup/qjecon/v101y1986i4p729-749..html)
- Gordon (2009): a monopolist would differentiate products less than observed, which would shorten average time between purchases. Quality improvements drive replacement. — [INFORMS](https://pubsonline.informs.org/doi/fpi/10.1287/mksc.1080.0448)

### Inferences
- "Cost per year of ownership" is the standard personal-finance TCO metric and matches A(T). "Cost per use" = A(T) / uses-per-year, and is useful for low-use items (tools, kitchen gadgets). Neither is a reason to sell early on its own.
- The empirical driver of replacement, quality and obsolescence, is exactly the term missing from the app's rule.

### Gaps
- Classic JCR/JMR durable-replacement papers (e.g. Bayus 1988; Grewal, Mehta & Kardes 2004) were not fetched. I cannot report their findings here.
- EU JRC / European Parliament optimal-lifetime studies were found (e.g. [Bruegel-hosted EP study IPOL_STU(2020)648767](https://www.bruegel.org/wp-content/uploads/2020/04/IPOL_STU2020648767_EN.pdf)) but not read in full.

---

## 4. Evaluation of the app's current rule

### Takeaway
The rule is a mathematically correct statement of "first year in which keeping 12 more months stops lowering average depreciation". However:
- It omits running, repair and failure costs, obsolescence, fees and discounting.
- Under its own value curve, depreciation alone favours keeping until death.
- The "best time" it outputs is created almost entirely by the assumed cliff start (0.6 × useful life).

By coincidence, that cliff lands near the optimum you get once a realistic obsolescence cost is added. So the dates are roughly right for electronics, but for a fragile reason.

### Cited Findings
- (Source code) `upgrade.ts` computes, monthly, `average = (price − value)/years` and `nextYear = value − value(+12 months)`. `best` = first month ≥ 12 with `nextYear ≥ average`. If there is no crossing, or the value at the crossing is below 12% of price, the status is "use-up" at L. The window is ±6 months. — `/home/user/Itemlogger/src/lib/upgrade.ts`
- (Source code) The cliff: `END_OF_LIFE = { startShare: 0.6, residual: 0.15 }`, applied as a smoothstep multiplier on the working value. — `/home/user/Itemlogger/src/lib/lifecycle.ts`

### Inferences (computed with the app's own curves)
1. **The answer is driven by the cliff parameter.** Computed rule output against `startShare`:
   - Phone (electronics, L = 4): 2.00 / 2.17 / 2.42 / 2.67 y for startShare 0.5 / 0.6 / 0.7 / 0.8.
   - Laptop (L = 5): no crossing / 3.00 / 3.33 / 3.58 y.
   - Dyson vacuum (L = 8): 3.92 / 4.58 / 5.17 / 5.83 y.

   For the phone, raising perYear to 0.30 removes the crossing entirely, which falls back to "use-up".
2. **Depreciation-only average cost has no true interior minimum.** For the phone, A(T) is $230 at 2.5 y and $99 at 10 y (computed). The rule picks the first local turn-up in A caused by the cliff. Selling at 2.17 y rather than running to death costs about +$146/yr in pure depreciation (computed).
3. **Systematic early bias of about 3–6 months.** Comparing a 12-month forward loss with the average picks a T where A(T+1) ≥ A(T). The minimum of A lies inside (T, T+1). Fix: take `argmin_T A(T)` on a monthly grid, or compare the *1-month* marginal (annualised) with the average.
4. **Sunk cost.** `(P − V(T))/T` includes the first drop already suffered. The forward-looking benchmark is the challenger's minimum EAC. This matters for items bought used, on deep sale, or with calibrated prices. The app's calibration multiplier k scales V but not P, which shifts the crossing.
5. **Missing terms**, in order of impact (computed sensitivity):
   - obsolescence u(t), which creates the real interior optimum
   - failure penalty × hazard, which favours replacement before death only if c_f > 0 and β > 1
   - transaction costs (13% + ~$30), which raise the cost of selling at the app's date by about $40–55/yr in the examples
   - discounting (small)
   - replacement price trend (shifts the optimum earlier for electronics, later for inflating categories)
6. **What it gets right.** Monthly evaluation; a minimum hold; a "use-up" fallback when resale is too small to matter; a window instead of a point; seasonality tips.

### Gaps
- The app's value curves (firstDrop, perYear, floor, cliff) are rules of thumb without cited calibration. The cliff, the parameter that most determines the answer, has no empirical basis in the sources I found. Resale-curve research in a sibling note should be checked.

---

## 5. Recommended heuristic, uncertainty presentation, sensitivity, and worked examples

### Takeaway
Replace the first-crossing rule with a direct monthly minimisation of an expected average-cost function that includes net-of-fee resale, hazard × (resale + failure penalty), running costs and an obsolescence gradient. Report a cost-tolerance band (the ages where A(T) ≤ 1.03–1.05 × A*) rather than a date ± 6 months. Near the optimum the cost curve is flat: being 6 months off costs a few dollars to a few tens of dollars per year. If obsolescence is ignored, the band is very wide or unbounded ("use it up").

### Cited Findings
- Optimal timing should be found by computing AEC across holding periods and picking the minimum (the standard textbook method). — [Chowdhury notes](https://arshadzahangirchowdhury.github.io/courses/engr4760-notes/06-replacement-analysis.html); [Wikipedia: EAC](https://en.wikipedia.org/wiki/Equivalent_annual_cost)
- A lifetime *distribution* is more informative than a point lifetime. — [LBNL 2018](https://escholarship.org/uc/item/7z222821)
- Observed lifetimes vary over wide ranges (e.g. smartphones 2–9 y). — [TU Delft](https://repository.tudelft.nl/file/File_350a2a90-e1cf-42d6-9560-812a39a94e17)

### Inferences: recommended implementation (derived)
```
// monthly grid, t in years, Δ = 1/12
N(t)   = max(0, (1 - fee)·V(t) - fixedSaleCost)            // fee ≈ 0.13 marketplace, 0 for trade-in quotes
S(t)   = exp(-(t/η)^β)                                      // η ≈ L·1.1, β ≈ 2 (electronics incl. accidents ~1.5), 2.5 appliances
h(t)   = (β/η)(t/η)^(β-1)
u(t)   = g·P·t                                              // obsolescence gap, g by category (assumption: phone .06, laptop .04, appliance .01, furniture/tools ~0)
c(t)   = expected repair spend rate (optional; default h(t)·repairShare·P)
num(T) = P + Σ_{t<T} S(t)·(c(t) + u(t) + h(t)·c_f)·Δ·e^{-rt} − S(T)·N(T)·e^{-rT}
den(T) = Σ_{t<T} S(t)·Δ·e^{-rt}
A(T)   = num(T)/den(T);   T* = argmin over T ≥ 1 year
band   = { T : A(T) ≤ (1+ε)·A(T*) },  ε = 0.03–0.05 (or an absolute $X/yr)
```
- If T* sits at the grid edge (A still falling at L·1.5) → "use it up / run to failure".
- If the item is already owned, use the defender–challenger form: from now (age a), keep while `MC(a) < A*_new`, where `A*_new` is the challenger's minimum A computed on the new model's price and curve.
- The `(x + 1/x)/2` flatness of the Terborgh case (below) argues for a band of about ±20–25% of T*.

**Sensitivity / flatness (math).** In the pure Terborgh case, `A(T)/A* = (x + 1/x)/2` with `x = T/T*`. Computed values: x = 0.9 → +0.6%; 0.8 → +2.5%; 0.75 → +4.2%; 0.5 → +25%; 1.25 → +2.5%; 1.5 → +8.3%; 2 → +25%. Errors of ±20–25% in timing cost only about 2–4% of annual ownership cost.

**Worked examples (computed; app curves; transaction cost = 13% fee + $30; Weibull failure; 5% discount; failure penalty c_f; obsolescence g as stated).**

Each scenario adds to the one before it. The +6-month and ±12-month columns are the extra $/yr versus the optimum.

$1,000 phone (electronics curve, L = 4; app rule → 2.17 y, V = $467):

| Scenario | T* | A* | ±6 mo | ±12 mo | Cost of app date |
|---|---|---|---|---|---|
| A. Depreciation only | no interior optimum; A falls to $100/yr at about 10 y (run to failure) | | | | +$146/yr vs run-to-failure |
| B. + fees | same as A | $101 | | | +$187/yr |
| C. + Weibull(β = 2, η = 5) failure, c_f = $150 | effectively run to failure (A ≈ $260) | | | | 3% band starts at 7.0 y; app date +$90/yr |
| D. + 5% discount | similar to C (A ≈ $289) | | | | app date +$94/yr |
| E. + obsolescence g = 6%·P/yr² | 2.5 y | $436/yr | −6 mo +$17, +6 mo +$12 | −12 mo +$56, +12 mo +$23 | 2.17 y: +$9/yr |
| F. Depreciation + obsolescence only | 2.5 y | $305/yr | +$12 / +$26 | +$40 / +$53 | 3% band 2.08–2.67 y; 5% band 2.0–2.83 y |

$3,000 laptop (electronics curve, L = 5; app rule → 3.0 y, V = $1,139):

| Scenario | T* | A* | ±6 mo | ±12 mo | Cost of app date |
|---|---|---|---|---|---|
| Depreciation only | run to failure (A → $239/yr at about 12 y) | | | | +$382/yr |
| + fees, failure (β = 2, η = 7, c_f = $300), discount | flat plateau from about 8.4 y | | | | app date +$267/yr |
| + obsolescence g = 4%·P | about 7.6 y, but very flat: 5% band 2.8–12 y | $1,026 | | | 3.0 y: +$38/yr |
| Depreciation + obsolescence only | 3.08 y | $798 | +$28–30 | +$71–81 | 3% band 2.67–3.5 y; app's 3.0 y essentially optimal (+$3/yr) |

$1,200 Dyson vacuum (appliance curve with brand adjustment, L = 8; app rule → 4.58 y, V = $646):

| Scenario | T* | A* | ±6 mo | ±12 mo | Cost of app date |
|---|---|---|---|---|---|
| Depreciation only | run to failure (A → $59/yr) | | | | +$62/yr |
| + fees | same | | | | +$85/yr |
| + failure (β = 2.5, η = 10, c_f = $100) + discount | plateau from about 10.8 y | | | | app date +$31/yr |
| + obsolescence g = 1%·P | 5.0 y | $236 | +$4 | +$10 | app date +$3/yr |
| Depreciation + obsolescence only | 4.9 y | $147 | | | 5% band 4.0–5.4 y |

Read-outs:
- With an obsolescence term, the app's dates land within about 0.3–0.4 y of the optimum and cost only $2–9/yr. Without one, they cost $60–380/yr against running to failure.
- Being 6 months off the true optimum costs about $1–30/yr, or $5–80 over a cycle. Being 12 months early is notably worse than 12 months late for phones, where A rises steeply on the early side.
- Transaction costs (13% + $30) raise the cost of selling early by $25–55/yr in these examples. They favour later and fewer sales but did not move the obsolescence-driven optimum materially.
- Discounting at 5% moved no optimum materially.

**Which assumptions matter most** (computed ranking): (1) whether obsolescence or utility decline is modelled at all, and its gradient g; (2) the cliff placement or the hazard shape near end of life; (3) the failure penalty c_f; (4) the fee level; (5) the discount rate (least).

### Gaps
- Obsolescence gradients g, failure penalties c_f and Weibull η/β values in the examples are illustrative assumptions, not sourced estimates. The app should present them as editable or category defaults and recalibrate from user-checked prices.
- I found no study that empirically measures how far consumers' actual selling times sit from a cost-minimising optimum.
