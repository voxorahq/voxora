import { LightPullThemeSwitcher } from "@/components/ui/light-pull-theme-switcher";

export default function Demo() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] transition-colors duration-300">
      <div className="flex flex-col items-center">
        <LightPullThemeSwitcher />
        <p className="text-sm text-[var(--muted-foreground)]">Pull down to change theme</p>
      </div>
    </div>
  );
}
