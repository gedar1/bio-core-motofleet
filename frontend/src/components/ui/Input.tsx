import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  readonly label?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  className = "",
  id,
  ...props
}) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block mb-xs font-body text-body-sm-medium text-ink"
        >
          {label}
        </label>
      )}
      <input id={inputId} className={`input-field ${className}`} {...props} />
    </div>
  );
};
