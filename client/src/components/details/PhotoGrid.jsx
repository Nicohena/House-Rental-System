import React from "react";
import { getImageUrl } from "../../utils/imageUtils";

const PhotoGrid = ({ images }) => {
  const fallback =
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=1200";

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-4 h-[500px] mb-12 rounded-[32px] overflow-hidden">
      <div className="md:col-span-2 md:row-span-2">
        <img
          src={getImageUrl(images?.[0]?.url || images?.[0] || fallback)}
          className="w-full h-full object-cover hover:opacity-90 transition-opacity cursor-pointer"
          alt="Main"
        />
      </div>
      {images?.slice(1, 5).map((img, idx) => (
        <div key={idx} className="hidden md:block">
          <img
            src={getImageUrl(img.url || img)}
            className="w-full h-full object-cover hover:opacity-90 transition-opacity cursor-pointer"
            alt={`Property photo ${idx + 2}`}
          />
        </div>
      ))}
    </div>
  );
};

export default PhotoGrid;
