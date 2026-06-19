"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { FadeIn } from "@/components/ui/FadeIn";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { HOW_IT_WORKS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 40 : -40,
    opacity: 0,
  }),
};

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const [direction, setDirection] = useState(0); // 1 = forward, -1 = backward

  const handleStepChange = (newStep: number) => {
    setDirection(newStep > activeStep ? 1 : -1);
    setActiveStep(newStep);
  };

  const handleNext = () => {
    if (activeStep < HOW_IT_WORKS.length - 1) {
      handleStepChange(activeStep + 1);
    } else {
      handleStepChange(0); // Loop back to start
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      handleStepChange(activeStep - 1);
    }
  };

  return (
    <section className="border-y border-border bg-background py-24 md:py-32 w-full max-w-full overflow-x-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 w-full">
        <FadeIn>
          <SectionHeader
            badge="How It Works"
            title="From Ring to"
            highlight="Revenue"
            description="Four simple steps between a missed call and a booked appointment."
          />
        </FadeIn>

        {/* Desktop View (Standard Grid) */}
        <div className="relative mt-16 hidden md:grid gap-8 md:grid-cols-2 lg:grid-cols-4 w-full">
          <div className="absolute top-12 right-[12.5%] left-[12.5%] hidden h-px bg-border lg:block" />

          {HOW_IT_WORKS.map((step, i) => (
            <FadeIn key={step.step} delay={i * 0.1}>
              <div className="relative rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-ring hover:bg-accent shadow-sm h-full text-left">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background">
                  {step.step}
                </div>
                <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Mobile View (Interactive Progressive Stepper) */}
        <div className="md:hidden mt-16 w-full flex flex-col items-center">
          {/* Stepper progress indicator header */}
          <div className="relative flex items-center justify-between w-full max-w-[280px] mx-auto mb-10">
            {/* Background connection line */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-white/10 -z-10" />
            
            {/* Active animated progress line */}
            <motion.div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-gradient-gemini -z-10"
              initial={{ width: "0%" }}
              animate={{ width: `${(activeStep / (HOW_IT_WORKS.length - 1)) * 100}%` }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            />

            {HOW_IT_WORKS.map((step, idx) => {
              const isActive = idx <= activeStep;
              const isCurrent = idx === activeStep;
              return (
                <button
                  key={step.step}
                  onClick={() => handleStepChange(idx)}
                  className="flex items-center justify-center cursor-none select-none outline-none"
                >
                  <motion.div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all duration-300",
                      isCurrent
                        ? "bg-white text-black shadow-lg shadow-white/10 scale-110 border-2 border-white"
                        : isActive
                        ? "bg-gradient-gemini text-white border-none"
                        : "bg-[#191919] text-white/40 border border-white/10"
                    )}
                    whileTap={{ scale: 0.95 }}
                  >
                    {step.step}
                  </motion.div>
                </button>
              );
            })}
          </div>

          {/* Swappable Step Description Card */}
          <div className="w-full min-h-[170px] relative overflow-hidden mb-8">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={activeStep}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="w-full text-left"
              >
                <div className="relative rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-white/35 mb-2.5">
                    Step {HOW_IT_WORKS[activeStep].step} of {HOW_IT_WORKS.length}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {HOW_IT_WORKS[activeStep].title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                    {HOW_IT_WORKS[activeStep].description}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Stepper Navigation Buttons */}
          <div className="flex items-center justify-between w-full max-w-[280px] mx-auto gap-4">
            <button
              onClick={handleBack}
              disabled={activeStep === 0}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 cursor-none select-none outline-none",
                activeStep === 0
                  ? "opacity-25 border-white/5 text-white/20"
                  : "border-white/10 text-white/80 hover:text-white hover:bg-white/5 active:scale-95"
              )}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-[#fefefe] text-[#0a0a0a] hover:bg-[#eaeaea] transition-all duration-200 cursor-none select-none outline-none active:scale-95 shadow-lg shadow-white/5"
            >
              {activeStep === HOW_IT_WORKS.length - 1 ? (
                <>Start Over</>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

