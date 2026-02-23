import React from "react";
import clsx from "clsx";

/**
 * Loading Spinner Component
 * Reusable spinner with different sizes and variants
 */

const LoadingSpinner = ({
  size = "md",
  variant = "primary",
  className = "",
  label = "Loading...",
}) => {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-3",
    lg: "h-12 w-12 border-4",
    xl: "h-16 w-16 border-4",
  };

  const variantClasses = {
    primary: "border-blue-600 border-t-transparent",
    white: "border-white border-t-transparent",
    secondary: "border-gray-600 border-t-transparent",
  };

  return (
    <div
      className={clsx("flex items-center justify-center", className)}
      role="status"
      aria-live="polite"
    >
      <div
        className={clsx(
          "animate-spin rounded-full",
          sizeClasses[size],
          variantClasses[variant],
        )}
        aria-label={label}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
};

export default LoadingSpinner;
