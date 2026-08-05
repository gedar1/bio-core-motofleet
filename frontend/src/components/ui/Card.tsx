import React from "react";

interface CardProps {
  readonly children: React.ReactNode;
  readonly variant?: "base" | "cream" | "feature";
  readonly className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = "base",
  className = "",
}) => {
  const variants: Record<string, string> = {
    base: "card",
    cream: "card-cream",
    feature: "card-feature",
  };

  return <div className={`${variants[variant]} ${className}`}>{children}</div>;
};
