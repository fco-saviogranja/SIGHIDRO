import * as React from "react";
import { cn } from "../../lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-10 w-full border-0 border-b border-[#E0E0E0] bg-transparent px-0 py-2 text-sm font-medium text-[#1A1A1A] placeholder:text-[#A2A7AD] focus-visible:border-[#193A59] focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
