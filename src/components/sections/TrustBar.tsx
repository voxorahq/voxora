"use client";

import { FadeIn } from "@/components/ui/FadeIn";
import { TRUST_ITEMS } from "@/lib/constants";

export function TrustBar() {
  return (
    <section className="border-y border-border bg-card py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {TRUST_ITEMS.map((item, i) => (
            <FadeIn key={item.title} delay={i * 0.08}>
              <div className="group text-center lg:text-left">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted border border-border transition-all duration-300 group-hover:bg-accent group-hover:border-ring lg:mx-0">
                  <item.icon className="h-6 w-6 text-foreground" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

