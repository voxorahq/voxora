"use client";

import { FadeIn } from "@/components/ui/FadeIn";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { HOW_IT_WORKS } from "@/lib/constants";

export function HowItWorks() {
  return (
    <section className="border-y border-border bg-background py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeIn>
          <SectionHeader
            badge="How It Works"
            title="From Ring to"
            highlight="Revenue"
            description="Four simple steps between a missed call and a booked appointment."
          />
        </FadeIn>

        <div className="relative mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="absolute top-12 right-[12.5%] left-[12.5%] hidden h-px bg-border lg:block" />

          {HOW_IT_WORKS.map((step, i) => (
            <FadeIn key={step.step} delay={i * 0.1}>
              <div className="relative rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-ring hover:bg-accent shadow-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background">
                  {step.step}
                </div>
                <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

