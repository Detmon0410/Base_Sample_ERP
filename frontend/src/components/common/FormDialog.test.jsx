import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { FormDialog } from "./FormDialog";

function Host({ log }) {
  const [open, setOpen] = useState(true);
  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title="Record payment"
      submitLabel="Pay"
      onSubmit={(event) => {
        event.preventDefault();
        log.push("submit");
      }}
    >
      <input aria-label="Amount" />
    </FormDialog>
  );
}

describe("FormDialog", () => {
  it("submits its form with the main button and closes with Cancel", async () => {
    const user = userEvent.setup();
    const log = [];
    render(<Host log={log} />);
    expect(screen.getByRole("dialog", { name: "Record payment" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Pay" }));
    expect(log).toEqual(["submit"]);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
