import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon, WandSparklesIcon } from "lucide-react";
import { forwardRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generatePassword } from "@/utils/password";

/**
 * Password input with Show / Hide, Generate (fills the field and shows it once) and Copy.
 * `value` / `onChange` are the form value; `inputProps` go to the input (id, aria-*).
 */
export const PasswordField = forwardRef(function PasswordField({ value, onChange, onGenerate, ...inputProps }, ref) {
  const { t } = useTranslation("users");
  const [visible, setVisible] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = () => {
    const next = generatePassword();
    onChange(next);
    onGenerate?.(next);
    setVisible(true);
    setGenerated(true);
    setCopied(false);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      /* no clipboard: the password is on the screen to copy by hand */
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          value={value}
          onChange={(event) => {
            setGenerated(false);
            onChange(event.target.value);
          }}
          className="min-w-0 flex-1"
          {...inputProps}
        />
        <Button type="button" variant="outline" size="icon" className="size-10 shrink-0" aria-label={visible ? t("form.password.hide") : t("form.password.show")} onClick={() => setVisible((v) => !v)}>
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </Button>
        <Button type="button" variant="outline" className="h-10 shrink-0" onClick={generate}>
          <WandSparklesIcon aria-hidden="true" /> {t("form.password.generate")}
        </Button>
        {value ? (
          <Button type="button" variant="outline" className="h-10 shrink-0" onClick={copy}>
            {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />} {copied ? t("form.password.copied") : t("form.password.copy")}
          </Button>
        ) : null}
      </div>
      {generated ? <p className="m-0 text-sm text-muted-foreground" role="status">{t("form.password.generatedNote")}</p> : null}
    </div>
  );
});
