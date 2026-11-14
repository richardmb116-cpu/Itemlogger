# Electronics: Second-hand Resale Value, Useful Life and Sell-to-Upgrade Timing

Research date: 2026-11-14. Market: US unless noted (USD). Australia-specific data was not found in this pass (see Gaps).
Source-bias note: most quantitative resale data comes from companies that buy or sell used devices (SellCell, BankMyCell, Swappa, ecoATM, Minna Camera, Gearfocus). They benefit from "sell now before it drops" messaging. Their methods are usually disclosed only loosely: mint condition, cash buyback offers vs MSRP.

Model reminder: value(t) = (1 - firstDrop) * (1 - perYear)^t, with a floor and an end-of-life (EOL) decline.

---

## Q1. First-year resale loss and annual loss in years 2-5, by sub-category and brand tier

### Takeaway
Smartphones have the best data. On buyback/trade-in prices measured against MSRP, iPhones lose about 25-35% within 5-9 months. Galaxy S loses about 47-58% over the same period, Pixel about 38-49%, and budget Android loses the most. On private-sale marketplaces (Swappa) all of these losses are much smaller: iPhone 17 kept about 87% after about 10 months. Lenses keep about 67-78% of retail, compared with about 58-60% for mirrorless bodies and about 35% for DSLR bodies. Headphones lose about 55-61% over 3-4 years. Data for laptops, watches and TVs is weak.

### Cited Findings

**(a) Smartphones: trade-in/buyback (cash offers, mint condition, vs original MSRP)**
- SellCell (Aug 2025; data as of July 2025; prices aggregated from "over 40 major U.S. buyback platforms"; mint condition; excludes carrier/manufacturer promo trade-ins) — [SellCell](https://sellcell.com/blog/samsung-ai-phones-close-resale-gap-iphone-2026/):
  - Depreciation 5 months after launch: iPhone 13 (2021) 24.7%, iPhone 16 (2024) 35.4%. Depreciation 9 months after launch: iPhone 12 (2020) 25.2%, iPhone 16 34.7%.
  - Galaxy S, 5 months after launch: S22 51.9%, S25 46.6%. Galaxy S, 9 months after launch: S22 58.2%, S23 53.4%, S24 50.7%, S25 about 47.7% (modelled, not observed).
  - Trend: iPhone 5-month depreciation is worsening by about 3.6 percentage points a year, and Samsung's is improving by about 1.8 points a year. SellCell projected the two would cross in mid-2026 (5-month measure) or about 2028 (9-month measure). The article itself is internally inconsistent: it says a 2021 figure was 51.0% but also lists the S22 at 58.2%.
  - Pixel 9 lost 2.6 points less than Pixel 8 at 10 months. No absolute Pixel figure is given.
  - Medium confidence. The direction is clear, but this is commercial data with no stated transaction counts.
- The SellCell projection did not hold for the 2026 cycle. BGR (July 2026) used Swappa average sale prices for 256GB models against starting price: base iPhone 17 retained about 87.5% and base Galaxy S26 about 68%. In under six months, S26 models lost more than 30% and three iPhone 17 models lost less than 15% — [BGR](https://bgr.com/2215334/do-samsung-depreciate-faster-iphone/)
  - Caveat: an unlocked-only comparison is much closer (S26 unlocked $800 vs $899.99 launch, about 88.9%; iPhone 17 $791 vs $799). The size of the gap depends on whether carrier-locked units are included — [BGR](https://bgr.com/2212669/smartphone-best-resale-value)
- BankMyCell (2019-2020): first-year loss averaged 23.45% for iPhone and 45.18% for Android flagships. Pixel was among the fastest-depreciating brands — [BankMyCell](https://bankmycell.com/blog/cell-phone-depreciation-report-2019-2020)
- BankMyCell (2020-2021), trade-in value: first-year loss was 16.70% for iPhone, 33.62% for Android and 38.46% for Pixel (average across models) — [BankMyCell](https://www.bankmycell.com/blog/cell-phone-depreciation-report-2020-2021/)
- At 9 months: Galaxy S20 was down 34.78% and iPhone 11 down 12.84% (2020) — [TNW](https://thenextweb.com/news/report-android-phones-lose-twice-as-much-value-as-iphones-in-first-year)
- BankMyCell (2021-2022): Galaxy S21 Ultra lost 16.35% vs iPhone 12 Pro Max 15.40% over a comparable window. The Pixel 6's trade-in value started 49.25% below retail at launch. Pixel trade-in prices begin low and then decline slowly (only -4.79% from Oct to Dec 2021) — [BankMyCell](https://www.bankmycell.com/blog/cell-phone-depreciation-report-2021-2022/); [PRWeb](https://www.prweb.com/releases/2022/2/prweb18501535.htm)
- Gap between trade-in and marketplace prices: Swappa's July 2026 average sale price for a 256GB iPhone 17 was $713 — [Swappa via search snippet](https://swappa.com/en/guide/apple-iphone-17). Apple raised the iPhone 17 starting price from $799 to $899 on 9 Sep 2026. Swappa says this partly explains a reported "92% retained" figure, because used prices measured against a higher new price look stronger — [Swappa guide](https://swappa.com/en/guide/apple-iphone-17) (reported via search summary; page not fetched directly).
- Contested record loss: GSMArena reports the iPhone Air "losing its resale value at a record pace" — [GSMArena](https://www.gsmarena.com/iphone_air_is_losing_its_resale_value_at_a_record_pace-news-70565.php) (headline only; not fetched).

**(b) Laptops and tablets**
- Mac vs Windows: no independent dataset was found. Commercial and blog claims conflict:
  - MacBook keeps up to 60% at 3 years vs under 30% for most Windows laptops (retailer comparison) — [Alibaba product insights](https://www.alibaba.com/product-insights/refurbished-macbook-vs-new-windows-laptop-where-does-your-money-go-further.html)
  - Mac about 25% at 3 years (attributed to MacPaw/Jamf data). Windows lifespan 5-7 years, with faster depreciation — [MacPaw](https://macpaw.com/reviews/macbook-vs-windows-laptop-comparison)
  - South Africa (ZAR): MacBook 50-60% at 3 years; mid-range Windows 25-39% — [Evetech](https://www.evetech.co.za/is-macbook-worth-it-south-africa-honest/e/4168)
  - Swappa table (hard to parse): average Windows laptop roughly 30% per year depreciation — [Swappa](https://swappa.com/blog/which-device-categories-hold-value/). The page returned 403 on direct fetch, so only the search snippet was seen.
  - Forum view: when Apple releases a major hardware update, the previous model's resale value falls sharply. Business-line Windows laptops are a safer bet for resale — [AnandTech forum](https://forums.anandtech.com/threads/resale-value-of-windows-laptops.2231213/post-33111466) (commentary).
- Low confidence for all laptop figures. No iPad, Chromebook or Windows-tablet figures were found in this pass.

**(c) Headphones, earbuds and smartwatches**
- Swappa (2025-26 used-market average sale prices vs launch MSRP): AirPods Pro 2 about $111 vs $249 (-55%). Sony WH-1000XM5 (2022) $155 vs $399.99 (-61%). WH-1000XM4 $144 vs $349.99 (-59%) — [Swappa AirPods/headphones guide](https://swappa.com/blog/used-airpods-headphones-guide/). These are marketplace (private-sale-like) prices for products 3-6 years after launch. Medium confidence.
- Apple Watch: no percentage was found. A MacRumors forum user called it "the worst Apple product for resale value" (anecdote) — [MacRumors forum](https://forums.macrumors.com/threads/if-you-were-in-the-market-for-a-pre-owned-aw-how-much-would-you-care-if-it-had-applecare.2312357). Swappa says condition and storage, not colour, drive Apple Watch price — [Swappa Series 12 guide](https://swappa.com/guide/apple-watch-series-12-42mm).

**(d) TVs and monitors**
- No resale-depreciation dataset was found (see Gaps).

**(e) Game consoles**
- Swappa (Sep 2026): used consoles sold for about 20-57% below new, depending on platform. Used Xbox Series X about $541 vs $799.99 new (-32% vs current MSRP). Used PS5 Slim about $503 vs $649.99 (-23%) — [Swappa used console guide](https://swappa.com/blog/used-game-consoles-complete-guide)
- Conflicting figure: a reseller tool reports used Xbox Series X at $200-280 on eBay in 2026 — [Underpriced](https://www.underpriced.app/tools/game-console-value-tracker). This conflicts sharply with Swappa. Low confidence.
- Kotaku: "the first console generation where prices go up instead of coming down". Base Switch new price raised to $340, with used units selling for under half that. 1TB PS4 Slim "hovers just above $100" (article undated) — [Kotaku](https://kotaku.com/switch-2-ps5-used-prices-xbox-series-x-s-preowned-2000614748)
- Microsoft says console memory/storage costs rose more than 2.5x and will double again by fall 2027 (cited by Swappa) — [Swappa](https://swappa.com/blog/used-game-consoles-complete-guide)

**(f) Cameras and lenses**
- Minna Camera study (Japan, JPY; 30 bodies and 30 lenses; Nov 2025-May 2026; resale rate = average used sale price / original retail), as reported by PhotographyTalk (May 2026) — [PhotographyTalk](https://www.photographytalk.com/do-camera-lenses-hold-their-value-better-than-camera-bodies-a-data-backed-buyers-guide/):
  - Resale rates by category:

    | Category | Resale rate |
    |---|---|
    | All lenses | 66.9% |
    | Constant-f/2.8 zooms | 77.7% |
    | All bodies | 59.2% (57.7% excluding the outlier) |
    | Mirrorless bodies | 60.3% |
    | DSLR bodies | 35.2% |

  - Top lenses: Sony FE 70-200 f/2.8 GM II 88.3%, Canon RF 24-70 f/2.8L 87.6%, Canon RF 100-500L 85.4%, Nikon Z 70-200 f/2.8 S 82.6%, Sony FE 24-70 GM II 80.7%.
  - Top bodies: Nikon Z5II 75.2%, Canon R10 74.2%, Fujifilm X-T5 71.4%, Sony a6700 71.2%, Nikon Z8 67.2%. The Ricoh GR IV is at 102.6% because of a supply shortage (outlier).
  - Article commentary: the body depreciation cycle is about 4-5 years. The Nikon D750 trades near one-third of its launch price.
  - Medium confidence: one marketplace, six months, and the ranking is skewed to top performers.
- Nikon Z8 used prices are about 15% below retail on average in 2026 (US) — [Gearfocus](https://gearfocus.com/blog/what-is-used-nikon-z8-worth-2026) (commercial marketplace)
- Used DSLR lenses are rising in value, with speculation of a DSLR retro revival — [Digital Camera World](https://www.digitalcameraworld.com/cameras/dslr-cameras/those-used-dslr-lenses-in-your-closet-are-going-up-in-value-will-dslrs-be-the-next-retro-camera-revival) (headline only; not fetched)
- No standard depreciation schedule exists for lenses. Value is anchored to the current new price and to whether a replacement version exists — [Unique Photo Q&A](https://www.uniquephoto.com/community/qa/do-canon-l-series-lenses-follow-a-typical-depreciation-pattern-when-bought-used) (commentary)
- Anecdote: a Canon 300mm f/2.8 IS Mk1 sold for about 95% of its original price after 7 years — [TalkPhotography forum](https://www.talkphotography.co.uk/threads/resale-value-of-lenses.597815/) (single anecdote)

### Inferences
These are suggested starting parameters (private-sale basis unless noted). For trade-in/buyback, apply an extra 10-25 percentage points of firstDrop. That adjustment is inferred from the gap between the SellCell buyback figures and the Swappa marketplace figures.

| Sub-category | firstDrop (yr 1) | perYear (yrs 2-5) | Floor (% of MSRP) | Confidence |
|---|---|---|---|---|
| iPhone (current flagship) | 0.15-0.25 (trade-in 0.25-0.35) | 0.15-0.20 | 5-10% until OS cut-off, then about 2-5% | Medium |
| Galaxy S flagship | 0.30-0.40 (trade-in 0.45-0.55) | 0.20-0.25 | 3-5% | Medium |
| Pixel | 0.35-0.45 (trade-in about 0.40-0.50) | 0.20-0.25 | 3-5% | Low-medium |
| Budget Android | 0.45-0.60 | 0.25-0.35 | about 0-$30 absolute | Low (no direct data) |
| MacBook | 0.15-0.25 | 0.12-0.18 | 10-15% until macOS cut-off | Low |
| Windows laptop (consumer) | 0.30-0.40 | 0.20-0.30 | 5% | Low |
| Chromebook | 0.40-0.50 | 0.25-0.35 | 0 at Auto Update Expiration (AUE) | Low (no data) |
| iPad | Like MacBook, slightly better | — | — | Low (no data) |
| AirPods / earbuds | 0.30-0.40 | 0.15-0.20 | Collapses at battery wear about years 3-4 | Low-medium |
| Over-ear ANC headphones | 0.30-0.35 | 0.12-0.15 | 25-35% | Medium (fits XM4/XM5 at about -60% after 3-6 years) |
| Apple Watch | 0.30-0.40 | 0.20-0.25 | — | Low |
| Current-gen console (2024-26 inflation era) | 0.20-0.30 vs current MSRP | 0.05-0.10 | 30-50% | Medium-low |
| Last-gen console (e.g. PS4) | — | — | about $100 | Medium-low |
| Lenses, pro zoom/prime | 0.10-0.15 | 0.02-0.05 | 50-60% | Medium |
| Mirrorless bodies | 0.20-0.30 | 0.10-0.15 | About 4-5 year cycle | Medium |
| DSLR bodies | — | — | About 25-35% (residual, platform discontinued) | Medium |

- iPhone's advantage over Galaxy S on buyback prices has narrowed in recent years: SellCell found about 12-16 points at 9 months in 2024-25, vs 20-plus points in 2020-21. BGR's 2026 Swappa marketplace snapshot widened it again. The app should treat brand premiums as time-varying and refreshable, not hard-coded.
- Applying a fixed perYear to the gap measured against MSRP will overstate retention in years with MSRP increases (iPhone 17, consoles). The model should be anchored to the purchase price the user actually paid.

### Gaps
- No clean multi-year (years 2-5) curves were fetched for any category. Year 2-5 rates above are inferred from snapshots of single models at different ages.
- No budget-Android depreciation dataset (Galaxy A, Moto G) was found.
- No iPad, Chromebook, monitor or TV resale data was found. Swappa's "which device categories hold value" and "used electronics resale data" pages returned 403.
- No Apple Watch percentage was found. No Australian resale data (e.g. Mobileciti, Boomerang Buyback, Cash Converters AU) was gathered.
- No trade-in table time-series was compiled (Apple/Samsung official trade-in values over time).

---

## Q2. Value floors and collapse points (OS support end, battery degradation, new standards)

### Takeaway
Collapse is driven mainly by (1) the end of major OS support, (2) battery health falling below 80%, a resale cliff, and (3) platform discontinuation (the DSLR body collapse). Working older units keep a small absolute floor, e.g. last-generation PS4 at about $100.

### Cited Findings
- iOS 26 (2025) drops iPhone XR/XS/XS Max (2018). iPhone 11 (2019) is the oldest supported model and also gets iOS 27, about 7 years of major-OS support — [Macworld](https://www.macworld.com/article/675021/how-long-does-apple-support-iphones.html); [BGR](https://bgr.com/2097777/oldest-iphone-still-supported-ios-26)
- Dropped iPhones reportedly get security-only updates for about 2 more years (single source) — [Macworld](https://www.macworld.com/article/675021/how-long-does-apple-support-iphones.html)
- iPhone 15 and later: designed to keep 80% capacity at 1,000 full cycles. iPhone 14 and earlier: 500 cycles — [MacRumors, Feb 2024](https://www.macrumors.com/2024/02/20/apple-raises-iphone-15-advertised-battery-lifespan/)
- Apple Watch: designed to keep up to 80% at 1,000 cycles — [Apple battery service page](https://www.apple.com/hk/en/batteries/service-and-recycling/)
- Battery health strongly affects resale value. ecoATM (a buyer, so commercially biased) says 79% vs 81% battery health "can mean hundreds of dollars". Example: a new battery could add about $150 to an iPhone 11 Pro at 77% health, vs an $89 Apple battery fee at the time — [ecoATM](https://blog.ecoatm.com/does-your-iphone-battery-health-percentage-hurt-its-value/)
- DSLR bodies keep about 35% vs about 60% for mirrorless (2025-26), consistent with a collapse once a platform is discontinued — [PhotographyTalk/Minna](https://www.photographytalk.com/do-camera-lenses-hold-their-value-better-than-camera-bodies-a-data-backed-buyers-guide/)
- Last-gen console floor: 1TB PS4 Slim about $100+ (Kotaku, undated) — [Kotaku](https://kotaku.com/switch-2-ps5-used-prices-xbox-series-x-s-preowned-2000614748)

### Inferences
- iPhone: about 7 years of major iOS support from launch, plus about 2 years of security updates. Model the EOL decline as starting around year 5-6 (about 70-80% of an assumed 7-year useful life), with value near the floor at the year-7 OS cut-off.
- Battery-driven devices (AirPods, watches, phones before iPhone 15): heavy daily users reach about 500 cycles in about 1.5-2 years, and 1,000 cycles in about 3 years. The 80% health cliff therefore arrives around year 2-3 for older iPhones and AirPods, and around year 3-4 for iPhone 15 and later. Suggest an extra one-time drop of about 10-20% when estimated battery health falls below 80%, unless the user records a battery replacement.
- Chromebooks have a hard AUE date. Value should go to about zero at AUE. This rests on general knowledge; no source was fetched this session.

### Gaps
- Google's and Samsung's 7-year OS/security update promises (Pixel 8 onward, Oct 2023; Galaxy S24 onward, Jan 2024) are widely reported, but no primary source was retrieved in this session. Verify on the Google Pixel help page and Samsung's security updates page before using.
- No primary source was retrieved for macOS support windows, Windows 10 end of support (Oct 2025), Chromebook AUE (10 years for 2019+ models), or AirPods battery specs.
- No data was found on resale effects of new standards (Wi-Fi 7, HDMI 2.1, USB-C transition).

---

## Q3. Useful life and replacement cycles

### Takeaway
Smartphone replacement cycles are about 3-4 years and lengthening: Counterpoint says it is approaching 4 years globally, and US iPhones average about 3.8 years. Pro users replace faster (2.75 years) than non-Pro users (3.15 years). TV panels are rated far beyond actual replacement behaviour. No hard data on laptop lifespan was retrieved.

### Cited Findings
- Counterpoint: global replacement cycles are extending toward 4 years, with the trend continuing through 2026-27 (memory-cost crisis) — [Counterpoint](https://counterpointresearch.com/en/reports/memory-crisis-pushes-global-smartphone%20replacement-cycles-toward-4-years). Its 2025 installed-base report cites cycles "extending to nearly four years" — [TelecomLead](https://telecomlead.com/smart-phone/global-smartphone-installed-base-grows-2-in-2025-as-apple-and-samsung-extend-lead-124551)
- Counterpoint (May 2025): iPhone Pro users keep phones 2.75 years on average, non-Pro users 3.15 years (not US-only) — [Counterpoint](https://www.counterpointresearch.com/insight/iphone-pro-users-replacing-phones-faster-than-nonpro-users)
- US: Counterpoint/Kantar analysts said US replacement typically runs around 3 years, with one Counterpoint figure of 33 months (article date unclear, likely older) — [Mobile World Live](https://www.mobileworldlive.com/devices/news-devices/analysis-jury-out-on-t-mobile-us-contract-challenge/)
- US iPhone average age at replacement was 3.84 years in 2025 vs 3.27 years in 2020 (Assurant trade-in data, via secondary blog) — [Powerdrill](https://powerdrill.ai/blog/people-are-keeping-their-iphones-longer-than-ever). This is a secondary source, so medium-low confidence.
- A conflicting claim of a 2.4-year global cycle in 2025 is unverified and should be discounted — [Gadget Hacks](https://smartphones.gadgethacks.com/news/smartphone-upgrade-cycles-hit-3-4-years-what-changed/)
- TV manufacturer ratings — [SlashGear](https://www.slashgear.com/2056740/oled-tv-average-lifespan/); [T3](https://www.t3.com/tech/tvs/its-official-oled-tvs-last-longer-than-lcds):
  - Samsung OLED: 50,000-100,000 hours (about 10-20 years).
  - LG: up to 100,000 hours.
  - TCL: 8-10 years.
  - Sony: OLED lifespan similar to LCD.
- LED backlight at or near maximum brightness: 40,000-60,000 hours (about 4.5-6.8 years of continuous use) — [SlashGear](https://www.slashgear.com/1814065/tv-how-long-last-extend-lifespan-tips)
- Consumer Reports (2019): 20% of Hisense and Vizio TVs will have a problem in the first 5 years (via secondary source) — [SlashGear](https://www.slashgear.com/1814065/tv-how-long-last-extend-lifespan-tips)
- Windows laptops typically last 5-7 years (commentary) — [MacPaw](https://macpaw.com/reviews/macbook-vs-windows-laptop-comparison)
- Camera body depreciation cycle is about 4-5 years (commentary) — [PhotographyTalk](https://www.photographytalk.com/do-camera-lenses-hold-their-value-better-than-camera-bodies-a-data-backed-buyers-guide/)

### Inferences
These are suggested useful-life defaults: smartphone 4 years (iPhone 5, Android flagship with 7-year promise 5, budget Android 3); laptop 5-6 years (MacBook 6-7); tablet 5-6; earbuds 3; over-ear headphones 5; smartwatch 3-4; TV 8-10; monitor 7-10; console 7, roughly the length of a generation; camera body 5-7; lens 10+.
Suggest starting the EOL decline at about 75% of useful life.

### Gaps
- No primary EU JRC, EEA, Fraunhofer or iFixit lifespan studies were retrieved.
- No Consumer Reports primary source for TV or laptop lifespans was found.
- No primary IDC or Statista laptop replacement-cycle figure was retrieved; the Statista page appeared in search but was paywalled and not fetched.

---

## Q4. Effects of a successor launch on used prices

### Takeaway
There is little hard event-study data. The best evidence is that iPhone buyback prices take a large loss within the first 5 months, and an Apple hardware refresh is widely reported to hit the previous model.

### Cited Findings
- SellCell measures iPhone loss at 5 months (Feb, after the Sept launch) as already 25-35%, and at 9 months (June) as about the same, 25-35%. Most of the first-year loss therefore happens in the first 5 months, and the curve flattens before the next September event — [SellCell](https://sellcell.com/blog/samsung-ai-phones-close-resale-gap-iphone-2026/)
- Pixel trade-in prices start about 49% below retail at launch, then drift slowly (-4.8% over Oct-Dec 2021) — [PRWeb/BankMyCell](https://www.prweb.com/releases/2022/2/prweb18501535.htm)
- "Anytime Apple releases a major hardware update, the previous model resale plummets" (forum commentary on Macs) — [AnandTech forum](https://forums.anandtech.com/threads/resale-value-of-windows-laptops.2231213/post-33111466)
- The current console generation is anomalous: list prices rose (Switch to $340, Xbox Series X to $799.99), which props up used prices — [Kotaku](https://kotaku.com/switch-2-ps5-used-prices-xbox-series-x-s-preowned-2000614748); [Swappa](https://swappa.com/blog/used-game-consoles-complete-guide)

### Inferences
- For modelling, apply a step drop of about 5-10% to the previous model at the successor's launch: iPhone in September, Galaxy S in late Jan/Feb, Pixel in August-October (Pixel launches moved to August from 2024; general knowledge, unverified here). Sell-to-upgrade timing advice: sell 2-6 weeks before the successor's announcement.

### Gaps
- No quantified before/after successor-launch study was found for any category. No PriceCharting console generation-transition curves were retrieved.

---

## Q5. Seasonal effects

### Takeaway
No hard data was found in this pass.

### Cited Findings
- None retrieved.

### Inferences
- Commonly claimed seasonal factors, all unverified: used supply peaks in late September (after the iPhone launch) and in January (after Christmas upgrades); laptop demand peaks at back-to-school (July-August).

### Gaps
- No Swappa, eBay or Back Market seasonal price index was retrieved.

---

## Q6. Repair vs replace

### Takeaway
Apple out-of-warranty fees for iPhone 16 are a $99 battery (base model; $119 for Pro/Pro Max) and a $279 front screen. Third-party repairs cost about 20-40% less. A screen repair costs more than the resale value of most phones over about 3-4 years old, while a battery repair is usually worth doing before selling.

### Cited Findings
- iPhone 16 out-of-warranty Apple battery: $99. iPhone 16 Pro/Pro Max: $119 (a $20 increase over the iPhone 15 generation's $99) — [Neowin](https://www.neowin.net/news/out-of-warranty-battery-replacements-for-iphone-16-pro-models-will-cost-you-more-in-the-us/); [HotHardware](https://hothardware.com/news/apple-iphone-16-pro-battery-replacement-fee)
- iPhone 16 screen at Apple: $279 front only; $399 for screen plus back glass; $29 with AppleCare+ — [iClarified](https://www.iclarified.com/94884/heres-how-much-it-will-cost-to-repair-your-iphone-16)
- Third-party iPhone 16 screen repair averages $200-270 — [iFixScreens](https://ifixscreens.com/how-much-does-it-cost-to-repair-iphone-16/). Third-party shops are typically 20-40% below Apple's price — [ecoATM](https://blog.ecoatm.com/iphone-repair-prices/)
- Authorized out-of-warranty screen repairs across models range from about $154 to $404 (2025) — [MacMyths](https://macmyths.com/how-much-does-it-usually-cost-to-fix-an-iphone-in-2025/) (low-quality aggregator)
- A battery replacement can add about $150 of resale value to an iPhone at 77% health — [ecoATM](https://blog.ecoatm.com/does-your-iphone-battery-health-percentage-hurt-its-value/)

### Inferences
- Rule: repair if repair cost is under about 50% of the post-repair resale value. A $99-119 battery is usually worth it on any iPhone worth more than about $200. A $279+ screen repair is usually not worth it on a phone 4 or more years old, which per the curves above is typically worth under $250.

### Gaps
- No Samsung/Pixel repair price lists, MacBook/console/TV repair costs, or Australian AUD prices were retrieved.

---

## Q7. Lenses vs bodies (quantified)

### Takeaway
Lenses hold about 9 points more value than bodies on average (66.9% vs 57.7% of retail). Pro f/2.8 zooms hold about 78-88%. Mirrorless bodies hold about 60%, and DSLR bodies have collapsed to about 35%.

### Cited Findings
- See (f) under Q1: Minna Camera data via [PhotographyTalk](https://www.photographytalk.com/do-camera-lenses-hold-their-value-better-than-camera-bodies-a-data-backed-buyers-guide/). The gap equates to about $180 on a $2,000 purchase.
- Premium lenses are claimed at about 70-85% of retail after several years (low-quality aggregator) — [ItemValueChecker](https://itemvaluechecker.com/cameras)
- MPB publishes a Used Camera Gear Price Index by brand and type (US/EU/UK); the underlying numbers were not retrieved — [MPB](https://www.mpb.com/en-ie/content/latest-from-mpb/mirrorless-adoption-average-purchase-values)
- KEH has published a brand-retention comparison (Olympus vs Panasonic, Micro Four Thirds); not fetched — [KEH](https://www.keh.com/expert-advice/?p=47285)

### Inferences
- Lens model: firstDrop about 0.12, perYear about 0.03, floor about 50%. EOL is triggered by mount discontinuation (e.g. EF/F-mount), not by age, and adapter-friendly mounts soften the hit.
- Body model: firstDrop about 0.25, perYear about 0.12. Apply an extra 20-30% drop when the mount or system is discontinued (DSLR precedent).
- Leica and Fujifilm X100-series show supply-shortage premiums (inferred from the Ricoh GR IV outlier pattern). Consider allowing value above 100% for "allocation" items.

### Gaps
- No brand-level (Canon/Nikon/Sony/Fujifilm/Leica) multi-year retention curves were found. No KEH or MPB primary data was obtained.
