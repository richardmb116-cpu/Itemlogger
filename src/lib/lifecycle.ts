import type { Category, Item } from './types';

/**
 * How second-hand value moves over an item's life, per sub-category.
 * Figures come from "reports/Resale value and upgrade timing.md" (private-sale value as a share of
 * the price paid, good condition). Each profile says how good its evidence is; checked prices
 * recalibrate any of them per item.
 *
 * value(t), as a share of price:
 *   compound: v(t) = (1 − firstDrop)·(1 − perYear)^t, with firstDrop = 1 − v12 / (1 − perYear)
 *   linear:   v(t) = v12 − perYear·(t − 1)              (appliance guidance is in points per year)
 *   working   = max(floor, v(t))
 *   cliff     = optional end-of-life drop from onset·life to life, easing down to an absolute residual
 */

export type Evidence = 'measured' | 'rule' | 'inferred';

export type TimingTip =
  | 'iphone'
  | 'galaxy'
  | 'pixel'
  | 'electronics'
  | 'console'
  | 'camera'
  | 'appliance'
  | 'fridge'
  | 'bike'
  | 'ski'
  | 'golf'
  | 'fitness'
  | 'furniture'
  | 'luxury'
  | 'none';

export type LifecycleProfile = {
  id: string;
  label: string;
  /** Total value kept after 12 months, as a share of price. */
  v12: number;
  /** Decline after year one: share of remaining value per year, or points of price per year if linear. */
  perYear: number;
  linear: boolean;
  /** A working used one rarely sells for less than this share of price. */
  floor: number;
  /** Typical useful life in years. */
  lifeYears: number;
  /** End-of-life drop, or null where value doesn't fall away with age (lenses, designer pieces, tools). */
  cliff: { onset: number; residual: number } | null;
  /** Obsolescence: how fast it falls behind new models, as a share of price per year, per year owned. */
  g: number;
  /** Weibull failure shape; 0 means don't model failure (it doesn't change the answer). */
  beta: number;
  /** Price follows a market (gold, Rolex, Hermès), not age. */
  market: boolean;
  /** Effectively no resale market once used (mattresses, fast fashion). */
  noResale: boolean;
  /** Small and light enough to post, so it can sell on eBay/Swappa rather than local pickup only. */
  shippable: boolean;
  /** Buyers get the remaining manufacturer warranty (not true for Herman Miller/Steelcase). */
  warrantyTransferable: boolean;
  evidence: Evidence;
  tip: TimingTip;
  note: string;
};

type P = Omit<LifecycleProfile, 'id' | 'label' | 'note' | 'linear' | 'market' | 'noResale' | 'shippable' | 'warrantyTransferable'> &
  Partial<Pick<LifecycleProfile, 'linear' | 'market' | 'noResale' | 'shippable' | 'warrantyTransferable'>>;

function profile(id: string, label: string, note: string, p: P): LifecycleProfile {
  return {
    id,
    label,
    note,
    linear: false,
    market: false,
    noResale: false,
    shippable: true,
    warrantyTransferable: true,
    ...p,
  };
}

const ELECTRONIC_CLIFF = { onset: 0.8, residual: 0.03 };

/** Sub-category profiles, matched on the item's name and model (first match wins). */
const PROFILES: { pattern: RegExp; category?: Category; profile: LifecycleProfile }[] = [
  // Phones
  { pattern: /iphone/i, profile: profile('iphone', 'iPhone', 'iPhones keep the most value of any phone, then fall with each new model and when iOS support ends', { v12: 0.8, perYear: 0.18, floor: 0.07, lifeYears: 6, cliff: ELECTRONIC_CLIFF, g: 0.06, beta: 1.5, evidence: 'measured', tip: 'iphone' }) },
  { pattern: /galaxy (s|z|note)|oneplus/i, profile: profile('android-flagship', 'Android flagship', 'Flagship Android phones lose about a third in year one, faster than iPhones', { v12: 0.65, perYear: 0.22, floor: 0.04, lifeYears: 5, cliff: ELECTRONIC_CLIFF, g: 0.06, beta: 1.5, evidence: 'measured', tip: 'galaxy' }) },
  { pattern: /pixel/i, profile: profile('pixel', 'Pixel', 'Pixels lose value faster than iPhones and Galaxy S phones', { v12: 0.58, perYear: 0.22, floor: 0.04, lifeYears: 5, cliff: ELECTRONIC_CLIFF, g: 0.06, beta: 1.5, evidence: 'measured', tip: 'pixel' }) },
  { pattern: /galaxy a|moto ?g|redmi|budget phone/i, profile: profile('budget-phone', 'Budget phone', 'Budget phones lose about half their value in year one', { v12: 0.45, perYear: 0.3, floor: 0.02, lifeYears: 3, cliff: ELECTRONIC_CLIFF, g: 0.06, beta: 1.5, evidence: 'inferred', tip: 'electronics' }) },
  { pattern: /\bphone\b|smartphone/i, profile: profile('phone', 'Phone', 'Phones lose value fast as new models arrive', { v12: 0.6, perYear: 0.22, floor: 0.04, lifeYears: 4.5, cliff: ELECTRONIC_CLIFF, g: 0.06, beta: 1.5, evidence: 'inferred', tip: 'electronics' }) },
  // Wearables and audio (before laptops/watches so "Apple Watch" and "AirPods" match here)
  { pattern: /apple watch|smart ?watch|galaxy watch|fitbit|garmin|pixel watch/i, profile: profile('smartwatch', 'Smartwatch', 'Smartwatches lose value quickly and their batteries limit their life', { v12: 0.65, perYear: 0.22, floor: 0.05, lifeYears: 3.5, cliff: { onset: 0.75, residual: 0.03 }, g: 0.05, beta: 2, evidence: 'inferred', tip: 'electronics' }) },
  { pattern: /airpods(?! max)|earbuds|\bbuds\b|in-ear/i, profile: profile('earbuds', 'Earbuds', 'Earbuds hold value until their batteries wear out, around years 3 to 4', { v12: 0.65, perYear: 0.18, floor: 0.05, lifeYears: 3, cliff: { onset: 0.75, residual: 0.03 }, g: 0.03, beta: 2, evidence: 'measured', tip: 'electronics' }) },
  { pattern: /headphone|wh-?1000|\bxm\d|bose qc|quietcomfort|over-ear|airpods max/i, profile: profile('headphones', 'Headphones', 'Good noise-cancelling headphones still fetch about 40% years later', { v12: 0.68, perYear: 0.13, floor: 0.3, lifeYears: 6, cliff: { onset: 0.85, residual: 0.15 }, g: 0.02, beta: 2, evidence: 'measured', tip: 'electronics' }) },
  // Computers
  { pattern: /macbook|imac|mac mini|mac studio|mac pro/i, profile: profile('mac', 'Mac', 'Macs hold value well until macOS support ends', { v12: 0.8, perYear: 0.15, floor: 0.12, lifeYears: 6.5, cliff: { onset: 0.8, residual: 0.05 }, g: 0.04, beta: 2, evidence: 'rule', tip: 'electronics' }) },
  { pattern: /ipad/i, profile: profile('ipad', 'iPad', 'iPads hold value like Macs, falling with new models', { v12: 0.75, perYear: 0.17, floor: 0.1, lifeYears: 6, cliff: { onset: 0.8, residual: 0.04 }, g: 0.04, beta: 2, evidence: 'inferred', tip: 'electronics' }) },
  { pattern: /chromebook/i, profile: profile('chromebook', 'Chromebook', 'Chromebooks become almost worthless at their update-expiry date', { v12: 0.55, perYear: 0.3, floor: 0.02, lifeYears: 5, cliff: { onset: 0.8, residual: 0.01 }, g: 0.04, beta: 2, evidence: 'inferred', tip: 'electronics' }) },
  { pattern: /laptop|notebook|surface|thinkpad|xps|zenbook|spectre/i, profile: profile('laptop', 'Laptop', 'Windows laptops lose value faster than Macs', { v12: 0.65, perYear: 0.25, floor: 0.05, lifeYears: 5.5, cliff: ELECTRONIC_CLIFF, g: 0.04, beta: 2, evidence: 'rule', tip: 'electronics' }) },
  { pattern: /tablet|kindle/i, profile: profile('tablet', 'Tablet', 'Tablets lose value steadily with each new model', { v12: 0.6, perYear: 0.22, floor: 0.04, lifeYears: 5, cliff: ELECTRONIC_CLIFF, g: 0.04, beta: 2, evidence: 'inferred', tip: 'electronics' }) },
  // Screens, consoles, cameras
  { pattern: /playstation|\bps[45]\b|xbox|nintendo|switch|steam deck|console/i, profile: profile('console', 'Games console', 'Consoles hold value within their generation, then drop to about $100', { v12: 0.75, perYear: 0.08, floor: 0.3, lifeYears: 7, cliff: { onset: 0.85, residual: 0.1 }, g: 0.02, beta: 1.5, evidence: 'measured', tip: 'console' }) },
  { pattern: /\btv\b|television|oled|qled|monitor|display/i, profile: profile('screen', 'TV or monitor', 'Screens lose value steadily; bulky, so they sell locally', { v12: 0.6, perYear: 0.2, floor: 0.05, lifeYears: 9, cliff: { onset: 0.8, residual: 0.02 }, g: 0.02, beta: 2, shippable: false, evidence: 'inferred', tip: 'electronics' }) },
  { pattern: /\blens\b|\b\d{2,3}(-\d{2,3})?\s?mm\b|\bf\/\d/i, profile: profile('lens', 'Camera lens', 'Good lenses hold about two-thirds of their price for years', { v12: 0.87, perYear: 0.03, floor: 0.55, lifeYears: 12, cliff: null, g: 0, beta: 0, evidence: 'measured', tip: 'none' }) },
  { pattern: /camera|mirrorless|dslr|\beos\b|\balpha\b|lumix|x-t\d|gopro/i, profile: profile('camera-body', 'Camera body', 'Camera bodies lose value faster than lenses, and fall hard when a system is discontinued', { v12: 0.75, perYear: 0.12, floor: 0.3, lifeYears: 6, cliff: { onset: 0.85, residual: 0.2 }, g: 0.02, beta: 1.5, evidence: 'measured', tip: 'camera' }) },
  // Appliances (linear points per year)
  { pattern: /sub-?zero|\bwolf\b|miele/i, profile: profile('premium-appliance', 'Premium appliance', 'Premium appliance brands hold value better than mainstream ones', { v12: 0.65, perYear: 0.055, linear: true, floor: 0.15, lifeYears: 14, cliff: { onset: 0.75, residual: 0.05 }, g: 0.005, beta: 2.5, shippable: false, evidence: 'rule', tip: 'appliance' }) },
  { pattern: /dishwasher/i, profile: profile('dishwasher', 'Dishwasher', 'Built-in dishwashers resell for little', { v12: 0.4, perYear: 0.07, linear: true, floor: 0.03, lifeYears: 10, cliff: { onset: 0.75, residual: 0 }, g: 0.005, beta: 2.5, shippable: false, evidence: 'inferred', tip: 'appliance' }) },
  { pattern: /fridge|refrigerator|freezer/i, profile: profile('fridge', 'Fridge', 'Fridges lose about half on day one, then a few points a year; a third need a repair by year 5', { v12: 0.5, perYear: 0.085, linear: true, floor: 0.07, lifeYears: 12, cliff: { onset: 0.75, residual: 0.02 }, g: 0.005, beta: 2.5, shippable: false, evidence: 'rule', tip: 'fridge' }) },
  { pattern: /washer|washing machine|dryer|laundry/i, profile: profile('laundry', 'Washer or dryer', 'Washers and dryers lose about half on day one, then a few points a year', { v12: 0.5, perYear: 0.08, linear: true, floor: 0.07, lifeYears: 12, cliff: { onset: 0.75, residual: 0.02 }, g: 0.005, beta: 2.5, shippable: false, evidence: 'rule', tip: 'appliance' }) },
  { pattern: /\brange\b|oven|cooktop|stove/i, profile: profile('range', 'Oven or range', 'Ovens are long-lived but resell for little', { v12: 0.5, perYear: 0.07, linear: true, floor: 0.07, lifeYears: 14, cliff: { onset: 0.75, residual: 0.02 }, g: 0.005, beta: 2.5, shippable: false, evidence: 'rule', tip: 'appliance' }) },
  { pattern: /roomba|roborock|robot vac|robot vacuum|eufy robo/i, profile: profile('robot-vacuum', 'Robot vacuum', 'Robot vacuums lose value fast and depend on app support', { v12: 0.45, perYear: 0.135, linear: true, floor: 0.05, lifeYears: 5.5, cliff: { onset: 0.75, residual: 0.02 }, g: 0.03, beta: 2, evidence: 'inferred', tip: 'electronics' }) },
  { pattern: /dyson|cordless|stick vac/i, profile: profile('cordless-vacuum', 'Cordless vacuum', 'Cordless vacuums last about 4.5 years; the battery sets their value', { v12: 0.55, perYear: 0.11, linear: true, floor: 0.1, lifeYears: 4.5, cliff: { onset: 0.7, residual: 0.05 }, g: 0.02, beta: 2, evidence: 'inferred', tip: 'appliance' }) },
  { pattern: /vacuum|hoover/i, profile: profile('vacuum', 'Vacuum', 'Corded vacuums last about 10 years but resell for little', { v12: 0.45, perYear: 0.06, linear: true, floor: 0.05, lifeYears: 10, cliff: { onset: 0.75, residual: 0.02 }, g: 0.005, beta: 2, evidence: 'inferred', tip: 'appliance' }) },
  { pattern: /nespresso|keurig|\bpod\b|vertuo|dolce gusto/i, profile: profile('pod-coffee', 'Pod coffee machine', 'Pod machines last about 5 years and resell for little', { v12: 0.45, perYear: 0.1, linear: true, floor: 0.05, lifeYears: 5, cliff: { onset: 0.75, residual: 0.02 }, g: 0.01, beta: 2, evidence: 'inferred', tip: 'appliance' }) },
  { pattern: /espresso|barista|breville|de'?longhi|la marzocco|rancilio|gaggia|coffee/i, profile: profile('espresso', 'Espresso machine', 'Good espresso machines last about 7 years and keep a solid resale value', { v12: 0.6, perYear: 0.07, linear: true, floor: 0.15, lifeYears: 7, cliff: { onset: 0.8, residual: 0.08 }, g: 0.005, beta: 2, evidence: 'inferred', tip: 'appliance' }) },
  { pattern: /kitchenaid|stand mixer/i, profile: profile('stand-mixer', 'Stand mixer', 'KitchenAid mixers last decades and hold value', { v12: 0.55, perYear: 0.035, linear: true, floor: 0.28, lifeYears: 20, cliff: null, g: 0, beta: 0, evidence: 'rule', tip: 'appliance' }) },
  { pattern: /air fryer/i, profile: profile('air-fryer', 'Air fryer', 'Air fryers are cheap to replace and barely worth listing used', { v12: 0.35, perYear: 0.35, floor: 0, lifeYears: 4, cliff: null, g: 0.01, beta: 0, evidence: 'inferred', tip: 'none' }) },
  { pattern: /microwave|toaster|blender|kettle|food processor/i, profile: profile('small-kitchen', 'Small kitchen appliance', 'Small kitchen appliances are rarely worth listing used', { v12: 0.35, perYear: 0.35, floor: 0, lifeYears: 9, cliff: null, g: 0.005, beta: 0, evidence: 'inferred', tip: 'none' }) },
  // Furniture
  { pattern: /mattress/i, profile: profile('mattress', 'Mattress', 'Used mattresses have no real resale market', { v12: 0, perYear: 0, floor: 0, lifeYears: 9, cliff: null, g: 0, beta: 0, noResale: true, shippable: false, evidence: 'inferred', tip: 'none' }) },
  { pattern: /eames|vitra|cassina|design within reach|\bdwr\b|mid-?century|knoll/i, profile: profile('designer-furniture', 'Designer furniture', 'Designer and mid-century pieces keep most of their value for decades', { v12: 0.78, perYear: 0.015, floor: 0.65, lifeYears: 30, cliff: null, g: 0, beta: 0, shippable: false, evidence: 'measured', tip: 'furniture' }) },
  { pattern: /aeron|embody|herman miller|steelcase|\bleap\b|gesture|humanscale/i, profile: profile('premium-chair', 'Premium office chair', 'Premium office chairs keep a strong used market; the warranty doesn’t pass to buyers', { v12: 0.62, perYear: 0.05, floor: 0.25, lifeYears: 12, cliff: null, g: 0, beta: 0, shippable: false, warrantyTransferable: false, evidence: 'rule', tip: 'furniture' }) },
  { pattern: /ikea|billy|kallax|malm|hemnes|pax/i, profile: profile('ikea', 'Flat-pack furniture', 'Flat-pack furniture sells for well under half, with IKEA’s buyback as a floor', { v12: 0.4, perYear: 0.05, floor: 0.25, lifeYears: 10, cliff: null, g: 0, beta: 0, shippable: false, evidence: 'rule', tip: 'furniture' }) },
  { pattern: /sofa|couch|sectional|lounge/i, profile: profile('sofa', 'Sofa', 'Mass-market sofas resell for a fraction and wear out', { v12: 0.4, perYear: 0.1, floor: 0.05, lifeYears: 10, cliff: { onset: 0.8, residual: 0 }, g: 0, beta: 0, shippable: false, evidence: 'inferred', tip: 'furniture' }) },
  // Tools
  { pattern: /milwaukee|makita|dewalt|festool|hilti|metabo/i, profile: profile('premium-tools', 'Pro power tool', 'Pro tool brands hold value well; the battery platform matters most', { v12: 0.62, perYear: 0.065, floor: 0.3, lifeYears: 10, cliff: null, g: 0.005, beta: 1.5, evidence: 'rule', tip: 'none' }) },
  { pattern: /ryobi|black ?(\+|and|&) ?decker|bauer|ozito/i, profile: profile('value-tools', 'Value power tool', 'Value tool brands resell for less than pro brands', { v12: 0.5, perYear: 0.09, floor: 0.17, lifeYears: 8, cliff: null, g: 0.005, beta: 1.5, evidence: 'inferred', tip: 'none' }) },
  // Bikes and sport
  { pattern: /e-?bike|electric bike|ebike|e-mtb/i, profile: profile('ebike', 'E-bike', 'E-bikes fall hard as the battery ages (a new one costs $600–800)', { v12: 0.6, perYear: 0.15, floor: 0.15, lifeYears: 6, cliff: { onset: 0.6, residual: 0.15 }, g: 0.02, beta: 2, shippable: false, evidence: 'rule', tip: 'bike' }) },
  { pattern: /\bbike\b|bicycle|\btrek\b|specialized|giant|santa cruz|cannondale|canyon/i, profile: profile('bike', 'Bike', 'Bikes lose about 45% in year one, then about 7 points a year; brand barely matters', { v12: 0.55, perYear: 0.07, linear: true, floor: 0.18, lifeYears: 12, cliff: null, g: 0.005, beta: 0, shippable: false, evidence: 'measured', tip: 'bike' }) },
  { pattern: /golf|\b(driver|irons|putter|wedge)\b/i, category: 'sports', profile: profile('golf', 'Golf club', 'Golf clubs lose value each time a new model launches', { v12: 0.7, perYear: 0.18, floor: 0.12, lifeYears: 6, cliff: null, g: 0.02, beta: 0, evidence: 'measured', tip: 'golf' }) },
  { pattern: /peloton|treadmill|rower|exercise bike|bowflex|elliptical/i, profile: profile('fitness', 'Fitness equipment', 'Fitness equipment sells best in January', { v12: 0.58, perYear: 0.12, floor: 0.18, lifeYears: 10, cliff: null, g: 0.01, beta: 1.5, shippable: false, evidence: 'rule', tip: 'fitness' }) },
  { pattern: /\bskis?\b|snowboard/i, profile: profile('ski', 'Skis or snowboard', 'Snow gear sells best before the season starts', { v12: 0.55, perYear: 0.15, floor: 0.1, lifeYears: 7, cliff: null, g: 0.01, beta: 0, evidence: 'inferred', tip: 'ski' }) },
  // Jewellery, watches, luxury
  { pattern: /lab[- ]?(grown|created)|lab diamond/i, profile: profile('lab-diamond', 'Lab-grown diamond', 'Lab-grown diamonds have little or no resale value', { v12: 0.15, perYear: 0.15, floor: 0, lifeYears: 50, cliff: null, g: 0, beta: 0, evidence: 'rule', tip: 'none' }) },
  { pattern: /rolex|patek|audemars|\bap\b royal oak/i, profile: profile('rolex', 'Luxury watch (top tier)', 'Top-tier watches trade around retail; their price follows the watch market, not age', { v12: 1, perYear: 0, floor: 1, lifeYears: 50, cliff: null, g: 0, beta: 0, market: true, evidence: 'rule', tip: 'luxury' }) },
  { pattern: /omega|tudor|cartier|breitling|iwc|tag heuer|grand seiko|panerai/i, profile: profile('luxury-watch', 'Luxury watch', 'Most luxury watches sell well below retail, then hold steady', { v12: 0.68, perYear: 0, floor: 0.68, lifeYears: 50, cliff: null, g: 0, beta: 0, market: true, evidence: 'rule', tip: 'luxury' }) },
  { pattern: /herm[eè]s|birkin|\bkelly\b|goyard/i, profile: profile('top-bag', 'Hermès or Goyard', 'These bags trade near or above retail; price follows retail rises', { v12: 1, perYear: 0, floor: 1, lifeYears: 50, cliff: null, g: 0, beta: 0, market: true, evidence: 'measured', tip: 'luxury' }) },
  { pattern: /chanel|louis vuitton|\blv\b|dior|prada|gucci|bottega/i, profile: profile('designer-bag', 'Designer bag', 'Classic designer bags keep most of their value, helped by retail price rises', { v12: 0.82, perYear: 0, floor: 0.82, lifeYears: 50, cliff: null, g: 0, beta: 0, market: true, evidence: 'measured', tip: 'luxury' }) },
  { pattern: /gold|diamond|platinum|sterling/i, category: 'jewellery', profile: profile('fine-jewellery', 'Fine jewellery', 'Fine jewellery sells for its metal and stone value, not its retail price', { v12: 0.45, perYear: 0, floor: 0.45, lifeYears: 50, cliff: null, g: 0, beta: 0, market: true, evidence: 'rule', tip: 'luxury' }) },
];

/** Fallbacks when nothing more specific matches. */
const CATEGORY_PROFILES: Record<Category, LifecycleProfile> = {
  electronics: profile('electronics', 'Electronics', 'Electronics lose value fast as new models come out', { v12: 0.62, perYear: 0.22, floor: 0.05, lifeYears: 5, cliff: ELECTRONIC_CLIFF, g: 0.03, beta: 2, evidence: 'inferred', tip: 'electronics' }),
  appliances: profile('appliances', 'Appliance', 'Appliances lose about half on day one, then a few points a year', { v12: 0.5, perYear: 0.08, linear: true, floor: 0.06, lifeYears: 11, cliff: { onset: 0.75, residual: 0.02 }, g: 0.005, beta: 2.5, shippable: false, evidence: 'rule', tip: 'appliance' }),
  furniture: profile('furniture', 'Furniture', 'Furniture drops a lot at first, then holds steady', { v12: 0.45, perYear: 0.07, floor: 0.1, lifeYears: 15, cliff: null, g: 0, beta: 0, shippable: false, evidence: 'inferred', tip: 'furniture' }),
  tools: profile('tools', 'Tool', 'Good tools hold their value well', { v12: 0.55, perYear: 0.08, floor: 0.2, lifeYears: 10, cliff: null, g: 0.005, beta: 1.5, evidence: 'inferred', tip: 'none' }),
  kitchen: profile('kitchen', 'Kitchen gear', 'Kitchen gear drops on purchase, then slowly', { v12: 0.5, perYear: 0.08, linear: true, floor: 0.08, lifeYears: 8, cliff: { onset: 0.8, residual: 0.03 }, g: 0.005, beta: 2, evidence: 'inferred', tip: 'appliance' }),
  jewellery: profile('jewellery', 'Fashion jewellery', 'Fashion jewellery resells for little', { v12: 0.15, perYear: 0.2, floor: 0, lifeYears: 10, cliff: null, g: 0, beta: 0, evidence: 'inferred', tip: 'none' }),
  sports: profile('sports', 'Sports gear', 'Sports gear loses value steadily with use', { v12: 0.55, perYear: 0.12, floor: 0.12, lifeYears: 8, cliff: null, g: 0.01, beta: 0, evidence: 'inferred', tip: 'none' }),
  clothing: profile('clothing', 'Clothing', 'Everyday clothing has almost no resale value', { v12: 0.1, perYear: 0.3, floor: 0, lifeYears: 3, cliff: null, g: 0, beta: 0, noResale: true, evidence: 'inferred', tip: 'none' }),
  other: profile('other', 'Household item', 'A typical resale curve for household items', { v12: 0.55, perYear: 0.15, floor: 0.08, lifeYears: 7, cliff: { onset: 0.8, residual: 0.03 }, g: 0.01, beta: 1.5, evidence: 'inferred', tip: 'none' }),
};

/**
 * Brand adjustments on top of a profile (multiplies value above the floor, capped below price).
 * Only where the evidence supports a difference; reliability alone (e.g. Speed Queen) earns nothing.
 */
const BRAND_MULTIPLIERS: { pattern: RegExp; brand: string; mult: number; profiles: string[] }[] = [
  { pattern: /\b(bosch|shimano)\b/i, brand: 'Bosch or Shimano drive', mult: 1.25, profiles: ['ebike'] },
  { pattern: /\b(milwaukee|makita)\b/i, brand: 'Milwaukee or Makita', mult: 1.1, profiles: ['premium-tools'] },
  { pattern: /\bknoll\b|herman miller/i, brand: 'Herman Miller or Knoll', mult: 1.1, profiles: ['premium-chair'] },
];

type ProfileItem = Pick<Item, 'name' | 'model' | 'category'>;

export function profileFor(item: ProfileItem): LifecycleProfile {
  const text = `${item.name} ${item.model}`;
  const hit = PROFILES.find((p) => p.pattern.test(text) && (!p.category || p.category === item.category));
  return hit?.profile ?? CATEGORY_PROFILES[item.category];
}

export function brandMultiplier(item: ProfileItem, p: LifecycleProfile): { brand: string; mult: number } | null {
  const text = `${item.name} ${item.model}`;
  const hit = BRAND_MULTIPLIERS.find((b) => b.profiles.includes(p.id) && b.pattern.test(text));
  return hit ? { brand: hit.brand, mult: hit.mult } : null;
}

/** For display: the profile's useful life and what it's based on. */
export function usefulLife(item: ProfileItem): { years: number; basis: string } {
  const p = profileFor(item);
  return { years: p.lifeYears, basis: p.label };
}

/** A strong-resale brand or product line, for display, when the profile itself encodes one. */
export function resaleBrand(item: ProfileItem): string | null {
  const p = profileFor(item);
  const brand = brandMultiplier(item, p);
  if (brand) return brand.brand;
  const strong: Record<string, string> = {
    iphone: 'Apple',
    mac: 'Apple',
    ipad: 'Apple',
    'premium-chair': 'Premium chair',
    'designer-furniture': 'Designer',
    'premium-appliance': 'Premium appliance',
    'premium-tools': 'Pro tool brand',
    rolex: 'Top-tier watch',
    'top-bag': 'Hermès / Goyard',
  };
  return strong[p.id] ?? null;
}

/** Share of the price paid an item fetches at a given age, in good condition (before brand and condition). */
export function fractionAt(p: LifecycleProfile, years: number): number {
  if (p.noResale) return 0;
  const y = Math.max(0, years);
  let v: number;
  if (p.market) {
    // Market-priced goods: a one-off retail-to-resale step, then flat (prices follow the market, not age).
    v = p.v12;
  } else if (p.linear) {
    const dayOne = Math.min(1, p.v12 + p.perYear);
    v = dayOne - p.perYear * y;
  } else {
    const firstDrop = Math.max(0, 1 - p.v12 / (1 - p.perYear));
    v = (1 - firstDrop) * Math.pow(1 - p.perYear, y);
  }
  const working = Math.max(p.floor, v);
  if (!p.cliff) return working;
  const start = p.cliff.onset * p.lifeYears;
  const x = Math.min(1, Math.max(0, (y - start) / Math.max(0.01, p.lifeYears - start)));
  const s = x * x * (3 - 2 * x); // smooth step 0 → 1
  // Ease from the working value down to an absolute residual, so the floor is respected until the cliff.
  return working * (1 - s) + Math.min(p.cliff.residual, working) * s;
}
