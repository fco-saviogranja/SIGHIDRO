import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#141922] text-white",
        secondary: "border-[#E0E0E0] text-[#4D5560]",
        success: "border-transparent bg-[#EAF2EF] text-[#2F6858]",
        warning: "border-transparent bg-[#F4F0E5] text-[#7A6325]",
        danger: "border-transparent bg-[#F4E8E8] text-[#8F3D3D]",
      },
    },
    defaultVariants: {
      variant: "secondary",
    },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
