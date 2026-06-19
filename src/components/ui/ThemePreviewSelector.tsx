"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemePreset {
  id: string;
  name: string;
  className: string;
  colors: string[]; // for the preview dot
}

const PRESETS: ThemePreset[] = [
  {
    id: "gemini",
    name: "Vibrant Pink/Blue",
    className: "", // default (root variables)
    colors: ["#ec4899", "#0ea5e9"],
  },
  {
    id: "violet-slate",
    name: "Sophisticated Violet",
    className: "theme-violet-slate",
    colors: ["#8b5cf6", "#cbd5e1"],
  },
  {
    id: "white-ice",
    name: "Minimalist White/Ice",
    className: "theme-white-ice",
    colors: ["#ffffff", "#38bdf8"],
  },
  {
    id: "blue-cyan",
    name: "Classic Blue/Cyan",
    className: "theme-blue-cyan",
    colors: ["#3b82f6", "#06b6d4"],
  },
  {
    id: "emerald",
    name: "Electric Emerald",
    className: "theme-emerald",
    colors: ["#10b981", "#34d399"],
  },
];

export function ThemePreviewSelector() {
  const [activeTheme, setActiveTheme] = useState<string>("gemini");
  const [isOpen, setIsOpen] = useState(false);

  // Load theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("voxora-accent-theme");
    if (saved) {
      const preset = PRESETS.find((p) => p.id === saved);
      if (preset) {
        setActiveTheme(preset.id);
        applyTheme(preset.className);
      }
    }
  }, []);

  const applyTheme = (themeClass: string) => {
    const root = document.documentElement;
    // Remove all preset classes
    PRESETS.forEach((preset) => {
      if (preset.className) {
        root.classList.remove(preset.className);
      }
    });
    // Add new preset class if exists
    if (themeClass) {
      root.classList.add(themeClass);
    }
  };

  const handleSelect = (preset: ThemePreset) => {
    setActiveTheme(preset.id);
    applyTheme(preset.className);
    localStorage.setItem("voxora-accent-theme", preset.id);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end select-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-3 flex flex-col gap-2 bg-[#121212]/80 backdrop-blur-xl border border-white/10 p-3.5 rounded-2xl shadow-2xl w-48 text-left"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" />
              Preview Accent Theme
            </div>
            
            <div className="flex flex-col gap-1.5">
              {PRESETS.map((preset) => {
                const isActive = activeTheme === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelect(preset)}
                    className={cn(
                      "flex items-center gap-2.5 w-full text-xs font-medium px-2.5 py-2 rounded-lg transition-all duration-200 text-left outline-none cursor-none",
                      isActive 
                        ? "bg-white/10 text-white font-semibold" 
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <div 
                      className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/10"
                      style={{
                        background: `linear-gradient(135deg, ${preset.colors[0]} 0%, ${preset.colors[1]} 100%)`
                      }}
                    />
                    <span className="truncate">{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-11 h-11 rounded-full bg-[#121212]/80 backdrop-blur-xl border border-white/10 shadow-lg text-white/80 hover:text-white transition-colors duration-200 outline-none cursor-none relative group overflow-hidden"
      >
        {/* Subtle hover glow ring inside the button */}
        <div className="absolute inset-0 bg-gradient-gemini opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none" />
        <Sparkles className="w-5 h-5 animate-pulse" />
      </button>
    </div>
  );
}
