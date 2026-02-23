import React from "react";
import { SmartMatchBadge, VerifiedBadge, FairPriceBadge } from "./Badges";
import { Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getImageUrl } from "../../utils/imageUtils";

export const HouseCard = ({ house, isSaved = false, onToggleSave }) => {
  const navigate = useNavigate();

  return (
    <div
      className="group cursor-pointer"
      onClick={() => navigate(`/details/${house.id || house._id}`)}
    >
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-3">
        <img
          src={
            getImageUrl(house.image) ||
            "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&q=80&w=800"
          }
          alt={house.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {house.verified && <VerifiedBadge />}
          {house.match && <SmartMatchBadge percentage={house.match} />}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleSave) {
              onToggleSave(house.id || house._id);
            }
          }}
          aria-pressed={isSaved}
          className={`absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-colors ${
            isSaved ? "text-red-500" : "text-slate-700"
          }`}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
            fill={isSaved ? "currentColor" : "none"}
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.78-8.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between items-start">
          <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors truncate">
            {house.title}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            <Star size={14} className="fill-warning text-warning" />
            <span className="text-sm font-semibold">{house.rating}</span>
          </div>
        </div>
        <p className="text-sm text-slate-500">{house.location}</p>
        <p className="text-sm text-slate-400 font-medium">
          {house.beds} beds • {house.sqft} sqft
        </p>

        <div className="flex justify-between items-center pt-2">
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-slate-900">
              ETB {house.price.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 font-medium">/month</span>
          </div>
          {house.isFair && <FairPriceBadge />}
        </div>
      </div>
    </div>
  );
};
