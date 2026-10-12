import { CircleAlert, CircleCheck, CircleDashed, CircleX, LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

// One look for every status in a list: a soft colour, an icon and the word. Each class is written out in full so that Tailwind finds it.
// The word always says the status; the colour and the icon only make it quick to see.
const TONES = {
  neutral: { box: "bg-[#eceef1] text-[#3d434a]", Icon: CircleDashed },
  progress: { box: "bg-[#e3ecf8] text-[#1f4e8c]", Icon: LoaderCircle },
  good: { box: "bg-[#e1f2e8] text-success", Icon: CircleCheck },
  warn: { box: "bg-[#fbefd2] text-warning", Icon: CircleAlert },
  bad: { box: "bg-[#fbe4e1] text-destructive", Icon: CircleX },
};

/** `tone` is neutral, progress, good, warn or bad; `children` is the word of the status. */
export function StatusBadge({ tone = "neutral", children }) {
  const { box, Icon } = TONES[tone] ?? TONES.neutral;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-bold whitespace-nowrap", box)}>
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      {children}
    </span>
  );
}
