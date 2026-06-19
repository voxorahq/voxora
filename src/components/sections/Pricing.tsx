"use client";

import { Pricing as PricingUI } from "@/components/ui/pricing";

const PRICING_PLANS = [
  {
    name: "Starter",
    price: "$149",
    yearlyPrice: "$1,490",
    period: "mo",
    setupFee: "$199",
    yearlySavings: "Save ~$300/yr (17% off)",
    description: "Perfect for local businesses wanting to automate incoming calls.",
    features: [
      "AI receptionist",
      "24/7 Call Answering",
      "Up to 250 call minutes",
      "FAQ answering",
      "Appointment booking",
      "Call summaries",
    ],
    buttonText: "Get Started",
    href: "#contact",
    isPopular: false,
  },
  {
    name: "Professional",
    price: "$249",
    yearlyPrice: "$2,490",
    period: "mo",
    setupFee: "$299",
    yearlySavings: "Save ~$500/yr (17% off)",
    description: "For growing businesses that need integrations and custom workflows.",
    features: [
      "Everything above",
      "CRM integration",
      "SMS confirmations",
      "Up to 500 call minutes",
      "Custom workflows",
      "Priority Support",
    ],
    buttonText: "Book Demo",
    href: "#contact",
    isPopular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    yearlyPrice: "Custom",
    period: "mo",
    setupFee: "Custom",
    description: "Tailored solutions for multi-location and high-volume operations.",
    features: [
      "Unlimited call volume",
      "Dedicated success manager",
      "Custom voice & personality",
      "SLA guarantees",
      "Advanced analytics & API",
      "White-glove onboarding",
    ],
    buttonText: "Contact Sales",
    href: "#contact",
    isPopular: false,
  },
];

export function Pricing() {
  return (
    <PricingUI
      plans={PRICING_PLANS}
      title="Simple, Transparent Pricing"
      description="Choose the plan that fits your call volume. All plans include setup, training, and ongoing support."
    />
  );
}

