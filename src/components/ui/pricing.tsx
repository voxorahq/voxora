"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface PricingPlan {
  name: string;
  price: string;
  yearlyPrice: string;
  period: string;
  features: string[];
  description: string;
  buttonText: string;
  href: string;
  isPopular: boolean;
  setupFee?: string;
  yearlySavings?: string;
}

interface PricingProps {
  plans: PricingPlan[];
  title?: string;
  description?: string;
}

export function Pricing({
  plans,
  title = "Simple, Transparent Pricing",
  description = "Choose the plan that works for you. All plans include access to our platform and dedicated support.",
}: PricingProps) {
  const [isMonthly, setIsMonthly] = useState(true);

  return (
    <section id="pricing" className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <span
            className="badge-accent inline-block mb-4 px-3 py-1 text-xs font-bold tracking-widest uppercase rounded-full"
          >
            <span className="text-gradient-gemini">Pricing</span>
          </span>
          <h2 className="text-4xl font-semibold text-[#fefefe] md:text-5xl">{title}</h2>
          <p className="mt-4 text-[rgba(254,254,254,0.5)] max-w-xl mx-auto">{description}</p>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <Label
            htmlFor="billing-toggle"
            className={cn(
              "text-sm transition-colors cursor-pointer",
              isMonthly ? "text-[#fefefe]" : "text-[rgba(254,254,254,0.4)]"
            )}
          >
            Monthly
          </Label>
          <Switch
            id="billing-toggle"
            checked={!isMonthly}
            onCheckedChange={(v) => setIsMonthly(!v)}
          />
          <Label
            htmlFor="billing-toggle"
            className={cn(
              "text-sm transition-colors cursor-pointer flex items-center gap-2",
              !isMonthly ? "text-[#fefefe]" : "text-[rgba(254,254,254,0.4)]"
            )}
          >
            Yearly
            <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(254,254,254,0.08)] text-[rgba(254,254,254,0.7)]">
              2 Months Free
            </span>
          </Label>
        </div>

        {/* Plan Cards */}
        <div className="grid gap-8 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={cn(
                "relative flex flex-col rounded-2xl p-8 transition-all duration-300",
                plan.isPopular
                  ? "bg-[#fefefe] text-[#0a0a0a]"
                  : "bg-[#191919] text-[#fefefe]"
              )}
              style={{
                border: plan.isPopular
                  ? "none"
                  : "1px solid rgba(254,254,254,0.08)",
              }}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-1 rounded-full bg-[#0a0a0a] text-[#fefefe] text-xs font-semibold">
                  <Star className="h-3 w-3 fill-current" />
                  Most Popular
                </div>
              )}

              <h3
                className={cn(
                  "text-xl font-semibold",
                  plan.isPopular ? "text-[#0a0a0a]" : "text-[#fefefe]"
                )}
              >
                {plan.name}
              </h3>
              <p
                className={cn(
                  "mt-2 text-sm",
                  plan.isPopular
                    ? "text-[rgba(10,10,10,0.6)]"
                    : "text-[rgba(254,254,254,0.5)]"
                )}
              >
                {plan.description}
              </p>

              {/* Price */}
              <div className="mt-6 flex flex-col gap-1.5">
                <div className="flex items-baseline gap-1">
                  <span
                    className={cn(
                      "text-4xl font-bold tracking-tight",
                      plan.isPopular ? "text-[#0a0a0a]" : "text-[#fefefe]"
                    )}
                  >
                    {isMonthly ? plan.price : plan.yearlyPrice}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      plan.isPopular
                        ? "text-[rgba(10,10,10,0.5)]"
                        : "text-[rgba(254,254,254,0.4)]"
                    )}
                  >
                    {plan.price === "Custom" ? "" : (isMonthly ? "/mo" : "/yr")}
                  </span>
                </div>
                
                {plan.setupFee && (
                  <div
                    className={cn(
                      "text-xs font-semibold uppercase tracking-wider",
                      plan.isPopular
                        ? "text-[rgba(10,10,10,0.5)]"
                        : "text-[rgba(254,254,254,0.4)]"
                    )}
                  >
                    + {plan.setupFee} Setup Fee
                  </div>
                )}

                {!isMonthly && plan.yearlySavings && (
                  <div className="mt-1">
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-xs font-bold",
                        plan.isPopular
                          ? "bg-emerald-600/15 text-emerald-800 border border-emerald-600/25"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      )}
                    >
                      {plan.yearlySavings}
                    </span>
                  </div>
                )}
              </div>

              {/* Features */}
              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        plan.isPopular
                          ? "text-[#0a0a0a]"
                          : "text-[rgba(254,254,254,0.7)]"
                      )}
                    />
                    <span
                      className={
                        plan.isPopular
                          ? "text-[rgba(10,10,10,0.8)]"
                          : "text-[rgba(254,254,254,0.7)]"
                      }
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href={plan.href}
                data-magnetic
                className={cn(
                  "mt-8 block w-full py-3 px-6 rounded-xl text-sm font-semibold text-center transition-all duration-200",
                  plan.isPopular
                    ? "bg-[#0a0a0a] text-[#fefefe] hover:bg-[#191919]"
                    : "border border-[rgba(254,254,254,0.15)] text-[#fefefe] hover:bg-[rgba(254,254,254,0.05)]"
                )}
              >
                {plan.buttonText}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
