"use client";

import type { ButtonHTMLAttributes } from "react";
import { Button, type ButtonProps } from "@astryxdesign/core/Button";

type NativeButtonProps = Pick<ButtonHTMLAttributes<HTMLButtonElement>, "disabled" | "autoFocus">;

export default function ActionButton({
  disabled,
  autoFocus,
  className,
  variant = "secondary",
  ...props
}: Omit<ButtonProps, "isDisabled"> & NativeButtonProps) {
  // Keep native form, focus and tab order behavior. Astryx also uses isDisabled for its styling.
  const nativeProps = { disabled, autoFocus };
  return (
    <Button
      {...props}
      {...nativeProps}
      variant={variant}
      data-variant={variant}
      isDisabled={disabled}
      className={`sctn-action ${className ?? ""}`}
    />
  );
}
