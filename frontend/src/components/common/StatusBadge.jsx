import { cn } from "@/lib/utils";

// One look for every status in a list: a soft pill with the word. Each class is written out in full so that Tailwind finds it.
// The word always says the status; the colour only makes it quick to see.
const TONES = {
  neutral: { box: "bg-[#eceef1] text-[#3d434a]" },
  progress: { box: "bg-[#d9eefa] text-[#00689c]" },
  good: { box: "bg-[#e1f2e8] text-success" },
  warn: { box: "bg-[#fbefd2] text-warning" },
  bad: { box: "bg-[#fbe4e1] text-destructive" },
};

/** `tone` is neutral, progress, good, warn or bad; `children` is the word of the status. */
export function StatusBadge({ tone = "neutral", children }) {
  const { box } = TONES[tone] ?? TONES.neutral;
  return (
    <span className={cn("inline-flex items-center rounded-full px-3 py-0.5 text-sm font-semibold whitespace-nowrap", box)}>
      {children}
    </span>
  );
}
