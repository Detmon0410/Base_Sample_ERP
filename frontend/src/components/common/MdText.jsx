import { Fragment } from "react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/**
 * A text of the .md files (ER Diagram.md, DB Relations.md): the parts between `backticks` are code, the parts between **stars** are
 * bold, and an arrow written " -> " is shown as an arrow "→". One span, so a stacked table cell (phone) keeps it as one text.
 */
export function Md({ text }) {
  const parts = String(text).split(/(`[^`]*`|\*\*[^*]+\*\*)/);
  return (
    <span>
      {parts.map((part, index) => {
        if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
          return (
            <code key={index} className="bg-muted px-1 font-mono text-[0.9em]">
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
        return <Fragment key={index}>{part.replaceAll(" -> ", " → ")}</Fragment>;
      })}
    </span>
  );
}

/** A plain table of rows of .md texts under the headers `heads`; the columns in `mono` are names (a monospaced font). */
export function TextTable({ heads, rows, mono = [] }) {
  return (
    <div className="border border-border bg-card">
      <Table data-stack>
        <TableHeader>
          <TableRow>
            {heads.map((head, index) => (
              <TableHead key={`${head}-${index}`} className={index === 0 ? "px-4" : undefined}>
                {head}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {row.map((cell, index) => (
                <TableCell key={index} data-label={heads[index]} className={[index === 0 ? "px-4" : "", mono.includes(index) ? "font-mono text-sm" : "", "whitespace-normal"].join(" ")}>
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
