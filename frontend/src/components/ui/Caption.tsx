import React from "react";

interface CaptionProps {
  readonly children: React.ReactNode;
  readonly className?: string;
}

export const Caption: React.FC<CaptionProps> = ({ children, className = "" }) => {
  return <span className={`caption ${className}`}>{children}</span>;
};
