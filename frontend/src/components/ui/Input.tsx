import React from "react";

import { getInputValidationMessage } from "../../i18n/errors";
import type { InputValueNormalizer } from "../../validation/inputRules";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  readonly label?: string;
  readonly error?: string | null;
  readonly normalize?: InputValueNormalizer;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = "",
  id,
  normalize,
  onBlur,
  onChange,
  onInput,
  onInvalid,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}) => {
  const [nativeError, setNativeError] = React.useState<string | null>(null);
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
  const visibleError = error || nativeError;
  const errorId = inputId ? `${inputId}-error` : undefined;
  const describedBy =
    [ariaDescribedBy, errorId].filter(Boolean).join(" ") || undefined;

  const validateInput = (input: HTMLInputElement): void => {
    const message = getInputValidationMessage(input, label);
    input.setCustomValidity(message ?? "");
    setNativeError(message);
  };

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const normalizedValue = normalize?.(event.currentTarget.value);

    if (normalizedValue !== undefined) {
      event.currentTarget.value = normalizedValue;
    }

    onChange?.(event);
  };

  const handleBlur: React.FocusEventHandler<HTMLInputElement> = (event) => {
    validateInput(event.currentTarget);
    onBlur?.(event);
  };

  const handleInvalid = (event: React.InvalidEvent<HTMLInputElement>) => {
    validateInput(event.currentTarget);
    onInvalid?.(event);
  };

  const handleInput: React.FormEventHandler<HTMLInputElement> = (event) => {
    event.currentTarget.setCustomValidity("");
    setNativeError(null);
    onInput?.(event);
  };

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
      <input
        id={inputId}
        className={`input-field ${className}`}
        aria-describedby={describedBy}
        aria-invalid={visibleError ? true : ariaInvalid}
        onBlur={handleBlur}
        onChange={handleChange}
        onInput={handleInput}
        onInvalid={handleInvalid}
        {...props}
      />
      {visibleError && (
        <p
          id={errorId}
          role="alert"
          className="mt-xs font-body text-caption text-error"
        >
          {visibleError}
        </p>
      )}
    </div>
  );
};
