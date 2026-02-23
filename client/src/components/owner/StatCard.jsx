import React from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

export const StatCard = ({
  icon: Icon,
  label,
  value,
  trend,
  trendValue,
  color = "primary",
}) => {
  const isPositive = trend === "up";

  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    blue: "bg-blue-50 text-blue-500",
    orange: "bg-orange-50 text-orange-500",
    purple: "bg-purple-50 text-purple-500",
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col justify-between h-full shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-slate-500 text-sm font-medium mb-1">{label}</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">
            {value}
          </h3>
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          <Icon size={20} />
        </div>
      </div>

      {trendValue && (
        <div className="flex items-center gap-1.5 text-xs font-bold">
          <span
            className={`flex items-center ${
              isPositive ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {isPositive ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
            {trendValue}
          </span>
          <span className="text-slate-400">from last month</span>
        </div>
      )}
    </div>
  );
};
