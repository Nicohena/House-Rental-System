import React from "react";
import { User, Check, X } from "lucide-react";

export const BookingRequestCard = ({
  request,
  onAccept,
  onDecline,
  processing,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all bg-white gap-4">
      <div className="flex items-start gap-4 flex-1">
        {/* Tenant Avatar */}
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {request.tenantId?.avatar ? (
            <img
              src={getImageUrl(request.tenantId.avatar)}
              alt={request.tenantId.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="text-slate-400" size={24} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h4 className="font-bold text-slate-900 truncate">
              {request.tenantId?.name || "Unknown Tenant"}
            </h4>
            <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md ml-2 whitespace-nowrap">
              {new Date(request.createdAt).toLocaleDateString()}
            </span>
          </div>

          <p className="text-sm text-slate-500 font-medium truncate mt-0.5">
            {request.house?.title || "Property Name"}
          </p>

          <div className="flex items-center gap-2 mt-2 text-xs font-semibold text-slate-400">
            <span>{new Date(request.startDate).toLocaleDateString()}</span>
            <span>→</span>
            <span>{new Date(request.endDate).toLocaleDateString()}</span>
            <span className="w-1 h-1 rounded-full bg-slate-300 mx-1"></span>
            <span className="text-primary font-bold">
              ETB {request.totalAmount?.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <button
          onClick={() => onAccept(request._id)}
          disabled={processing === request._id}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {processing === request._id ? (
            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <>
              <Check size={16} />
              <span>Approve</span>
            </>
          )}
        </button>
        <button
          onClick={() => onDecline(request._id)}
          disabled={processing === request._id}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition-all"
        >
          <X size={16} />
          <span>Decline</span>
        </button>
      </div>
    </div>
  );
};
