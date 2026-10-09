import { useTranslation } from "react-i18next";
import { Toaster as Sonner } from "sonner";

// Messages without icons (docs/specs/s2-mini-erp-look.md).
const Toaster = ({
  ...props
}) => {
  const { t } = useTranslation();
  return (
    <Sonner
      containerAriaLabel={t("common:toasts")} // the region of the messages is read out in the language of the screen
      theme="light"
      className="toaster group"
      icons={{ success: null, info: null, warning: null, error: null, loading: null }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "0px"
        }
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  );
}

export { Toaster }
