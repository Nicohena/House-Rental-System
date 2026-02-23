import React from "react";
import { VerifiedBadge } from "./Badges";
import {
  Eye,
  Star,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Pencil,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getImageUrl } from "../../utils/imageUtils";

const OwnerListingCard = ({ house, onToggleAvailability, onDelete }) => {
  const navigate = useNavigate();

  const imagePath =
    house.images?.[0]?.url ||
    house.images?.[0]?.primaryImage ||
    house.primaryImage;

  const image = imagePath
    ? getImageUrl(imagePath)
    : "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&q=80&w=800";

  const isAvailable = house.available;
  const isVerified = house.verified?.status || house.verified;

  return (
    <div className="group bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition-shadow">
      <div
        className="relative aspect-[4/3] overflow-hidden cursor-pointer"
        onClick={() => navigate(`/details/${house._id}`)}
      >
        <img
          src={image}
          alt={house.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {isVerified && <VerifiedBadge />}
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
              isAvailable
                ? "bg-emerald-500 text-white"
                : "bg-slate-500 text-white"
            }`}
          >
            {isAvailable ? "Active" : "Paused"}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 truncate group-hover:text-primary transition-colors">
              {house.title}
            </h3>
            <p className="text-xs text-slate-500 truncate">
              {house.location?.city}, {house.location?.state}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-black text-slate-900">
              ETB {house.price?.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">/ month</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              {house.rooms?.bedrooms} beds • {house.rooms?.bathrooms} baths
            </span>
            {house.size && <span>{house.size.toLocaleString()} sqft</span>}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Eye size={14} />
              <span>{house.viewCount || 0} views</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Star size={12} className="text-warning fill-warning" />
              <span>{(house.averageRating || 0).toFixed(1)} rating</span>
            </span>
          </div>
          <span className="inline-flex items-center gap-1">
            <Calendar size={12} />
            <span>
              Listed{" "}
              {house.createdAt
                ? new Date(house.createdAt).toLocaleDateString()
                : ""}
            </span>
          </span>
        </div>

        <div className="pt-3 flex items-center justify-between gap-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => onToggleAvailability(house)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold ${
              isAvailable
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            {isAvailable ? (
              <>
                <ToggleLeft size={14} />
                <span>Pause listing</span>
              </>
            ) : (
              <>
                <ToggleRight size={14} />
                <span>Activate listing</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate(`/owner/listings/${house._id}/edit`)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-600 hover:bg-blue-50"
          >
            <Pencil size={14} />
            <span>Edit</span>
          </button>

          <button
            type="button"
            onClick={() => onDelete(house)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50"
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default OwnerListingCard;
