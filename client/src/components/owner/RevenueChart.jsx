import React, { useState } from "react";

export const RevenueChart = ({ data, loading }) => {
  const [timeRange, setTimeRange] = useState("6m");

  // Find max value to normalize bar heights
  const maxValue = data?.length ? Math.max(...data.map((d) => d.value)) : 10000;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-lg font-bold text-slate-900">Revenue Analytics</h3>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="text-sm font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
        >
          <option value="6m">Last 6 Months</option>
          <option value="1y">Last Year</option>
        </select>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="flex-1 flex items-end justify-between gap-2 md:gap-4 relative px-2">
          {/* Grid lines background - visual only */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none -z-10 pb-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-full border-t border-slate-50 h-0" />
            ))}
          </div>

          {data.map((item, index) => {
            const heightPercentage = Math.max(
              (item.value / maxValue) * 100,
              4, // Minimum height for visibility
            );

            return (
              <div
                key={index}
                className="flex-1 flex flex-col items-center gap-2 group cursor-pointer"
              >
                {/* Tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 absolute -top-10 bg-slate-800 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                  ${item.value.toLocaleString()}
                </div>

                {/* Bar */}
                <div
                  className={`w-full max-w-[40px] md:max-w-[60px] rounded-t-xl transition-all duration-500 hover:opacity-80 relative ${
                    index === data.length - 1 ? "bg-primary" : "bg-blue-50"
                  }`}
                  style={{ height: `${heightPercentage}%` }}
                ></div>

                {/* Label */}
                <span className="text-xs font-bold text-slate-400">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
