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
      script: {
        mode: "adapt",
        variants: [
          "If you've ever wished payday came sooner, this might actually help. There's a banking app called Current with a bunch of useful features, and one of the main ones lets you access up to $750 of your paychecks early if you qualify. With Current, you get a full set of features like Paycheck Advance, fee-free overdraft, the Build Card, and more. I actually liked the app myself, which is why I partnered with them. And right now they're giving $75 to anyone who signs up using my link or scans the QR code on screen. After you complete the signup steps, you'll see the option to enter my promo code, which unlocks the $75 bonus when you switch your direct deposit. So make sure you go through the full signup process so you don't miss it.",
        ],
      },
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
      script: {
        mode: "adapt",
        variants: [
          "I want to tell you about a way to make some extra money all from your phone that is one hundred percent legit. A lot of people feel like this is too good to be true so let me break it down for you. Freecash works with app games to help them find new users like you. It's simple, if you already like playing app games you might as well sign up and try it, you can make a completely free account with just an email and password. It's not a way to get rich quick but you can make ten to twenty dollars playing games you already like, and maybe even more if you're really dedicated. It's completely free to try, so scan the QR code or click the first link in the description and check it out and make some extra cash.",
        ],
      },
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
      script: {
        mode: "adapt",
        variants: [
          "If you use a debit card and you're not getting rewards from it, you're leaving easy money on the table. Most people think only credit cards give cashback, but I found this app called Bridge Money that lets you earn rewards using your normal debit card. So instead of spending money and getting nothing back, you can actually start earning from purchases you were already going to make. I've been using it myself and between the debit card rewards plus the extra stuff inside the app like offers, games, and surveys, I've already made a few hundred dollars. The setup takes like two minutes. Just scan the QR code or use the link in the description, sign up completely free, and use code WELCOME5 to get a $5 bonus when you join.",
        ],
      },
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
      script: {
        mode: "verbatim",
        variants: [
          "If you purchased Under Armour products in 2025, you may want to check this out, because some customers could be eligible to receive compensation from a recent data breach claim tied to Under Armour accounts. Under Armour is facing allegations tied to a major data breach for users around November 2025 that may have exposed customer information, and some could qualify for claims worth up to $500. To check if you qualify, you can scan the QR code on screen or click the link in my description. From there, you'll take a short quiz with a few simple questions, and it'll quickly tell you if you qualify to submit a claim. The whole process only takes a couple minutes, so it's definitely worth checking before the claim window closes.",
        ],
      },
      platform: "youtube",
      targetSeconds: 45,
      aspectRatios: ["16:9"],
      variantCount: 2,
    }),
  },
];
