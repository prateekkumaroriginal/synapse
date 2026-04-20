import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-blue-600 text-white shadow hover:bg-blue-700 focus-visible:ring-blue-600",
        primary:
          "bg-blue-600 text-white shadow hover:bg-blue-700 focus-visible:ring-blue-600",
        secondary:
          "bg-gray-200 text-gray-900 shadow-sm hover:bg-gray-300 focus-visible:ring-gray-400",
        destructive:
          "bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-600",
        outline:
          "border border-gray-300 bg-white shadow-sm hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-400",
        ghost:
          "hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-400",
        link:
          "text-blue-600 underline-offset-4 hover:underline focus-visible:ring-blue-600",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-md px-8 text-base",
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
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      disabled,
      children,
      type = "button",
      onClick,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    const isDisabled = disabled || loading;

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) {
        event.preventDefault();
        return;
      }
      onClick?.(event);
    };

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        type={asChild ? undefined : type}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        onClick={handleClick}
        {...props}
      >
        {loading && (
          <Loader2
            className="h-4 w-4 animate-spin"
            aria-hidden="true"
          />
        )}
        {children}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
