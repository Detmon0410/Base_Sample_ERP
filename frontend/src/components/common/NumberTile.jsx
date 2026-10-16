import { Link } from "react-router";

// The colour of a tile says what the number is: grey = waiting, blue = going on, green = done or paid, orange = money still to come in.
// Each class is written out in full so that Tailwind finds it; the text is white on all of them (5:1 or better, 4:1 for the blue).
const TILE_TONES = {
  waiting: "bg-[#5b6772] hover:bg-[#49535c]",
  progress: "bg-primary hover:bg-[#006fa8]",
  done: "bg-success hover:bg-[#155a31]",
  owed: "bg-[#b45309] hover:bg-[#92400e]",
};

/** One number with its name, a coloured tile that links to the page which explains the number. `tone` is waiting, progress, done or owed. */
export function NumberTile({ to, label, value, icon: Icon, tone = "progress" }) {
  return (
    <Link to={to} className={`flex flex-col gap-1 rounded-md p-5 text-primary-foreground ${TILE_TONES[tone]}`}>
      <span className="flex items-center gap-2 text-sm">
        {Icon ? <Icon aria-hidden="true" className="size-5 shrink-0" /> : null}
        {label}
      </span>
      <span className="text-3xl font-bold">{value}</span>
    </Link>
  );
}
