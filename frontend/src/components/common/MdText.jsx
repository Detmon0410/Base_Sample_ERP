import { Fragment } from "react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { censor, HIDDEN } from "@/utils/censor";

/** A text with each hidden part (utils/censor.js) drawn as a dark bar; the bar keeps the dots as its text for a reader. */
function Hidden({ text }) {
  return text.split(HIDDEN).map((part, index) => (
    <Fragment key={index}>
      {index > 0 ? (
        <span data-hidden className="mx-0.5 inline-block select-none rounded-sm bg-foreground/85 px-1 align-middle text-[0.7em] leading-[1.4] tracking-widest text-transparent">
          {HIDDEN}
        </span>
      ) : null}
      {part}
    </Fragment>
  ));
}

/**
 * A text of the .md files (ER Diagram.md, DB Relations.md, ...): the parts between `backticks` are code, the parts between **stars**
 * are bold, and an arrow written " -> " is shown as an arrow "→". What is never shown (utils/censor.js) is a dark bar. One span, so a
 * stacked table cell (phone) keeps it as one text.
 */
export function Md({ text }) {
  const parts = censor(text).split(/(`[^`]*`|\*\*[^*]+\*\*)/);
  return (
    <span>
      {parts.map((part, index) => {
        if (part === `\`${HIDDEN}\``) return <Hidden key={index} text={HIDDEN} />;
        if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
          return (
            <code key={index} className="bg-muted px-1 font-mono text-[0.9em]">
              <Hidden text={part.slice(1, -1)} />
            </code>
          );
        }
        if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}><Hidden text={part.slice(2, -2)} /></strong>;
        return <Hidden key={index} text={part.replaceAll(" -> ", " → ")} />;
      })}
    </span>
  );
}

const ALIGN = { center: "text-center", right: "text-right" };

/**
 * A plain table of rows of .md texts under the headers `heads`; the columns in `mono` are names (a monospaced font). `align` is the
 * alignment of each column ("left", "center", "right"), as the .md table sets it.
 */
export function TextTable({ heads, rows, mono = [], align = [] }) {
  return (
    <div className="border border-border bg-card">
      <Table data-stack>
        <TableHeader>
          <TableRow>
            {heads.map((head, index) => (
              <TableHead key={`${head}-${index}`} className={[index === 0 ? "px-4" : "", ALIGN[align[index]] ?? ""].join(" ")}>
                <Md text={head} />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {row.map((cell, index) => (
                <TableCell key={index} data-label={censor(heads[index]).replace(/`/g, "")} className={[index === 0 ? "px-4" : "", mono.includes(index) ? "font-mono text-sm" : "", ALIGN[align[index]] ?? "", "whitespace-normal"].join(" ")}>
                  <Md text={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
