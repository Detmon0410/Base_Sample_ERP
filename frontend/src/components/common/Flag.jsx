import { useId } from "react";

/**
 * The flag of a language: the United Kingdom for English and Japan for Japanese, drawn as small SVG (the flag emoji of Windows are only
 * two letters). It is decoration: the button around it has the name of the language.
 */
export function Flag({ code, className }) {
  const id = useId().replace(/:/g, "");
  if (code === "ja") {
    return (
      <svg viewBox="0 0 30 20" aria-hidden="true" className={className}>
        <rect width="30" height="20" fill="#fff" />
        <circle cx="15" cy="10" r="6" fill="#bc002d" />
        <rect x="0.5" y="0.5" width="29" height="19" fill="none" stroke="#c9ccd1" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 60 40" aria-hidden="true" className={className} preserveAspectRatio="none">
      <clipPath id={`${id}s`}>
        <path d="M0,0 v40 h60 v-40 z" />
      </clipPath>
      <clipPath id={`${id}t`}>
        <path d="M30,20 h30 v20 z v20 h-30 z h-30 v-20 z v-20 h30 z" />
      </clipPath>
      <g clipPath={`url(#${id}s)`}>
        <path d="M0,0 v40 h60 v-40 z" fill="#012169" />
        <path d="M0,0 L60,40 M60,0 L0,40" stroke="#fff" strokeWidth="8" />
        <path d="M0,0 L60,40 M60,0 L0,40" clipPath={`url(#${id}t)`} stroke="#c8102e" strokeWidth="5" />
        <path d="M30,0 v40 M0,20 h60" stroke="#fff" strokeWidth="13" />
        <path d="M30,0 v40 M0,20 h60" stroke="#c8102e" strokeWidth="8" />
      </g>
    </svg>
  );
}
