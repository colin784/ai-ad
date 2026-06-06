import { createBrief, type Brief } from "./brief";

/**
 * Seeded brand templates, built from the real Panel creator briefs. Each is a
 * structured Brief that drives the Produce flow's cut + compliance + graphics.
 */
export interface BrandPreset {
  name: string;
  brief: Brief;
}

export const BRAND_PRESETS: BrandPreset[] = [
  {
    name: "Current",
    brief: createBrief({
      brand: "Current",
      overview:
        "Current is a banking app designed to help you get more from your paycheck and manage money more flexibly.",
      primaryHook: "Access up to $750 of your paycheck early, once you qualify.",
      sellingPoints: [
        "Up to $750 Paycheck Advance once you qualify",
        "Build Card helps build credit (avg 80+ points in 6 months)",
        "Get paid up to 2 days faster with direct deposit",
        "Up to 4.00% bonus on savings pods",
        "24/7 live support",
      ],
      cta: "Sign up with my link or scan the QR code to get $75 — use my promo code.",
      description: { promoCode: "XXXXX", bonus: "$75", trackingLinkPlaceholder: "[FULL LINK]" },
      compliance: {
        do: ["Say 'banking app'", "Say 'once you qualify' when mentioning Paycheck Advance"],
        dont: ["Call it a bank", "Call Paycheck Advance a loan or credit", "Say 'free overdraft'", "Mention 'interest'"],
        forbiddenTerms: ["bank", "loan", "free overdraft", "interest"],
        requiredDisclaimers: ["Current is a financial technology company, not an FDIC-insured bank"],
      },
      script: { mode: "adapt", variants: [] },
      platform: "youtube",
      targetSeconds: 60,
      aspectRatios: ["16:9"],
      variantCount: 3,
    }),
  },
  {
    name: "FreeCash",
    brief: createBrief({
      brand: "Freecash",
      overview:
        "Freecash.com is a rewards platform where you earn real money by playing games and trying out apps and offers.",
      primaryHook: "Get paid to play games and try apps in your spare time.",
      sellingPoints: [
        "Earn real money playing games and completing offers",
        "Free to sign up — just an email and password",
        "Cash out via PayPal, crypto, or gift cards",
        "$5 bonus when you sign up with the link",
      ],
      cta: "Scan the QR code or hit the first link in the description, sign up free, and start earning.",
      description: { bonus: "$5 bonus" },
      placement: { qrMinSeconds: 30, qrAppearAtPercent: 50, qrPosition: "top-right" },
      compliance: {
        do: ["Cap earnings with 'up to' or 'maybe even more'", "Include an expectation-management line"],
        dont: ["Promise guaranteed income", "Say 'get rich quick'"],
        forbiddenTerms: [],
        requiredDisclaimers: [],
      },
      script: { mode: "adapt", variants: [] },
      platform: "youtube",
      targetSeconds: 60,
      aspectRatios: ["16:9"],
      variantCount: 3,
    }),
  },
  {
    name: "Bridge Money",
    brief: createBrief({
      brand: "Bridge Money",
      overview:
        "Bridge Money is a free mobile app that lets you earn rewards on your normal debit card — like credit-card perks, on debit.",
      primaryHook: "Turn your debit card into a rewards-earning card.",
      sellingPoints: [
        "Earn cashback automatically on everyday debit spending",
        "Complete offers, scan receipts, take surveys, and play games to earn more",
        "Referral bonuses for inviting others",
      ],
      cta: "Scan the QR code or use the link, sign up free, and use code WELCOME5 for a $5 bonus.",
      description: { promoCode: "WELCOME5", bonus: "$5 bonus" },
      compliance: {
        do: ["Frame rewards as earned on everyday spending"],
        dont: ["Promise guaranteed amounts"],
        forbiddenTerms: [],
        requiredDisclaimers: [],
      },
      script: { mode: "adapt", variants: [] },
      platform: "youtube",
      targetSeconds: 60,
      aspectRatios: ["16:9"],
      variantCount: 3,
    }),
  },
  {
    name: "Morgan & Morgan",
    brief: createBrief({
      brand: "Morgan & Morgan",
      overview:
        "Morgan & Morgan is the largest personal injury firm in the U.S. This campaign helps eligible people check if they qualify for a claim.",
      primaryHook: "You may be entitled to compensation — check if you qualify.",
      sellingPoints: [
        "Largest personal injury firm in the U.S.",
        "Short quiz to check eligibility",
        "Potential recovery if you qualify",
      ],
      cta: "You can scan the QR code on screen or click the link in my description to take a short quiz.",
      placement: { qrMinSeconds: 15, qrDelaySeconds: 7, qrPosition: "top-right", endCardRequired: true },
      compliance: {
        do: ["Say 'you may qualify' / 'check eligibility'", "Say 'you CAN scan' / 'you CAN click the link'"],
        dont: ["Guarantee case results", "Label the QR 'Scan Here'", "Be misleading or overly aggressive"],
        forbiddenTerms: ["guaranteed", "you will win", "scan here"],
        requiredDisclaimers: [],
      },
      script: { mode: "verbatim", variants: [] },
      platform: "youtube",
      targetSeconds: 45,
      aspectRatios: ["16:9"],
      variantCount: 2,
    }),
  },
];
