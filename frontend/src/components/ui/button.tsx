import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-button hover:shadow-glow",
        destructive: "rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "rounded-full border border-border bg-transparent hover:bg-secondary hover:text-secondary-foreground hover:border-primary/30",
        secondary: "rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "rounded-full hover:bg-secondary hover:text-secondary-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "rounded-full text-primary-foreground font-semibold hover:scale-[1.03] active:scale-[0.98] transition-all duration-500",
        glass: "rounded-full backdrop-blur-2xl text-foreground hover:border-primary/30 hover:shadow-glow",
        accent: "rounded-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-button hover:shadow-glow",
        glow: "rounded-full bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 hover:border-primary/50 hover:shadow-glow",
        // ASTERU variants — 10px radius
        plasma: "rounded-[10px] text-white font-bold uppercase tracking-wider btn-shimmer hover:translate-y-[-2px]",
        forge: "rounded-[10px] text-white font-bold uppercase tracking-wider btn-shimmer hover:translate-y-[-2px]",
        ion: "rounded-[10px] bg-transparent font-bold uppercase tracking-wider btn-shimmer hover:translate-y-[-2px]",
        "ghost-sf": "rounded-[10px] font-medium",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 px-3.5",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-lg",
        icon: "h-10 w-10",
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
  ({ className, variant, size, asChild = false, style, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    const variantStyles: React.CSSProperties =
      variant === "hero"
        ? {
            background: "linear-gradient(135deg, #1a6ff4, #6c3de8)",
            boxShadow: "0 0 30px rgba(26,111,244,0.5)",
            ...style,
          }
        : variant === "glass"
        ? {
            background: "hsl(var(--glass-bg))",
            border: "1px solid hsl(var(--glass-border))",
            ...style,
          }
        : variant === "plasma"
        ? {
            background: "linear-gradient(135deg, #0066ff 0%, #0044cc 50%, #0033aa 100%)",
            boxShadow: "0 0 0 1px rgba(0,102,255,.6), 0 4px 20px rgba(0,102,255,.5), 0 1px 0 rgba(255,255,255,.15) inset",
            ...style,
          }
        : variant === "forge"
        ? {
            background: "linear-gradient(135deg, #ff6600 0%, #dd4400 50%, #cc3300 100%)",
            boxShadow: "0 0 0 1px rgba(255,102,0,.6), 0 4px 20px rgba(255,102,0,.45), 0 1px 0 rgba(255,255,255,.12) inset",
            ...style,
          }
        : variant === "ion"
        ? {
            color: "#00c8ff",
            border: "1px solid rgba(0,200,255,.35)",
            boxShadow: "0 0 12px rgba(0,200,255,.1) inset",
            ...style,
          }
        : variant === "ghost-sf"
        ? {
            background: "rgba(255,255,255,.04)",
            color: "hsl(var(--foreground))",
            border: "1px solid rgba(255,255,255,.1)",
            ...style,
          }
        : style || {};

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        style={variantStyles}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };