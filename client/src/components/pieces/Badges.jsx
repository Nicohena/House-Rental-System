import React from "react";
import { CheckCircle } from "lucide-react";

export const VerifiedBadge = () => (
  <div className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm">
    <div className="bg-primary p-0.5 rounded-full">
      <CheckCircle size={10} className="text-white fill-current" />
    </div>
    <span className="text-[10px] font-bold text-primary tracking-wider">
      VERIFIED
    </span>
  </div>
);

export const SmartMatchBadge = ({ percentage }) => (
  <div className="inline-flex items-center gap-1.5 bg-warning px-2.5 py-1 rounded-md shadow-sm">
    <span className="text-[10px] font-extrabold text-[#92400E]">
      {percentage}% SMART MATCH
    </span>
  </div>
);

export const FairPriceBadge = () => (
  <div className="inline-flex items-center bg-success/10 px-2 py-1 rounded-md">
    <span className="text-[10px] font-bold text-success">Fair Price</span>
  </div>
);
