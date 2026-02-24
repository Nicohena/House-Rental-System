import React from "react";
import { MessageSquare } from "lucide-react";
import { getImageUrl } from "../../utils/imageUtils";

const HostSection = ({ owner, onStartChat }) => {
  const fallbackAvatar =
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100";

  return (
    <div className="p-8 bg-slate-50 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full overflow-hidden">
          <img
            src={getImageUrl(owner?.avatar || fallbackAvatar)}
            alt="Host"
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h4 className="font-bold text-slate-900">Hosted by {owner?.name}</h4>
          <p className="text-xs text-slate-500 font-medium">
            User Rating: {owner?.rating?.average || "New"}
          </p>
        </div>
      </div>
      <button
        onClick={onStartChat}
        className="px-8 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm flex items-center gap-2 hover:shadow-md transition-all"
      >
        <MessageSquare size={18} />
        <span>Chat with {owner?.name}</span>
      </button>
    </div>
  );
};

export default HostSection;
