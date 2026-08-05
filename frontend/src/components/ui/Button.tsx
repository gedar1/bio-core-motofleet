import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: "primary" | "dark" | "secondary" | "cream";
  readonly children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  children,
  className = "",
  ...props
}) => {
  const variants: Record<string, string> = {
    primary: "btn-primary",
    dark: "btn-dark",
    secondary: "btn-secondary",
    cream: "btn-cream",
  };

  return (
    <button
      type="button"
      className={`${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
