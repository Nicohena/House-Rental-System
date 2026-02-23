import React from "react";
import clsx from "clsx";

/**
 * Skeleton Component
 * Provides skeleton loading screens for better perceived performance
 */

export const Skeleton = ({
  className = "",
  variant = "rectangle",
  animate = true,
}) => {
  const variantClasses = {
    rectangle: "rounded-md",
    circle: "rounded-full",
    text: "rounded h-4",
  };

  return (
    <div
      className={clsx(
        "bg-gray-200",
        animate && "animate-pulse",
        variantClasses[variant],
        className,
      )}
      aria-busy="true"
      aria-live="polite"
    />
  );
};

/**
 * Card Skeleton
 * Skeleton for card-based layouts (e.g., house cards, user cards)
 */
export const CardSkeleton = () => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border">
      <Skeleton className="w-full h-48 mb-4" />
      <Skeleton className="h-6 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2 mb-4" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24" variant="rectangle" />
        <Skeleton className="h-10 w-24" variant="rectangle" />
      </div>
    </div>
  );
};

/**
 * Table Row Skeleton
 * Skeleton for table rows
 */
export const TableRowSkeleton = ({ columns = 4 }) => {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
};

/**
 * List Item Skeleton
 * Skeleton for list items
 */
export const ListItemSkeleton = () => {
  return (
    <li className="px-4 py-4 border-b border-gray-200">
      <div className="flex items-center space-x-4">
        <Skeleton variant="circle" className="h-12 w-12" />
        <div className="flex-1">
          <Skeleton className="h-5 w-1/3 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </li>
  );
};

export default Skeleton;
