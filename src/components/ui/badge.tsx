import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-sm",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-primary/15 to-primary/10 text-primary border-2 border-primary/30 hover:border-primary/50 hover:shadow-md",
        secondary: "bg-gradient-to-r from-secondary to-secondary/80 text-secondary-foreground border-2 border-secondary/40 hover:shadow-md",
        destructive: "bg-gradient-to-r from-destructive/15 to-destructive/10 text-destructive border-2 border-destructive/30 hover:border-destructive/50 hover:shadow-md",
        outline: "border-2 border-input hover:bg-accent hover:border-primary/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(({ className, variant, ...props }, ref) => {
  return <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />;
});

Badge.displayName = "Badge";

export { Badge, badgeVariants };
