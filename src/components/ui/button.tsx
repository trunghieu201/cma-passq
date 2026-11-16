import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:shrink-0 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-brand-600 text-white hover:bg-brand-500 active:bg-brand-700 shadow-sm",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:ring-destructive/20",
        outline:
          "border border-ink-200 bg-background hover:bg-muted hover:text-ink-900 text-ink-900 shadow-sm",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-muted hover:text-ink-900 text-ink-700",
        link:
          "text-brand-600 underline-offset-4 hover:underline",
        accent:
          "bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100",
      },
      size: {
        default: "h-9 px-4 text-sm gap-1.5",
        xs: "h-6 px-2 text-xs gap-1 rounded-md [&_svg]:size-3",
        sm: "h-7 px-3 text-xs gap-1 rounded-md [&_svg]:size-3.5",
        lg: "h-10 px-6 text-base gap-2 rounded-xl [&_svg]:size-5",
        icon: "h-9 w-9 p-0 rounded-xl [&_svg]:size-4",
        "icon-sm": "h-7 w-7 p-0 rounded-md [&_svg]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
