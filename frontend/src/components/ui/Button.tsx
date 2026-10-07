import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?:
    | "primary"
    | "dark"
    | "secondary"
    | "cream"
    | "primarySmall"
    | "success";
  readonly children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", children, className = "", ...props }, ref) => {
    const variants: Record<string, string> = {
      primary: "btn-primary",
      dark: "btn-dark",
      secondary: "btn-secondary",
      cream: "btn-cream",
      primarySmall: "btn-primary-small",
      success: "btn-success",
    };

    return (
      <button
        ref={ref}
        type="button"
        className={`${variants[variant]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
