import React, { useEffect, useCallback } from "react";
import { X, MapPin } from "lucide-react";

const PropertyMapModal = ({ isOpen, onClose, location }) => {
  // Close on ESC key
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      // Prevent body scroll while modal is open
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  // Build map URL — prefer coordinates, fallback to address string
  const coords = location?.coordinates?.coordinates; // [lng, lat]
  let mapSrc = "";

  if (coords && coords.length === 2 && coords[0] !== 0 && coords[1] !== 0) {
    const [lng, lat] = coords;
    mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`;
  } else {
    // Fallback: encode full address
    const addressParts = [
      location?.address,
      location?.city,
      location?.state,
      location?.zip,
      location?.country,
    ].filter(Boolean);
    const query = encodeURIComponent(addressParts.join(", "));
    mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=38.7,8.9,38.85,9.1&layer=mapnik`;
    // For address-based, we use a nominatim search link fallback
    if (addressParts.length > 0) {
      mapSrc = `https://maps.google.com/maps?q=${query}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ animation: "fadeIn 0.2s ease-out" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden"
        style={{ animation: "scaleIn 0.25s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <MapPin size={20} className="text-primary" />
            <h3 className="font-bold text-slate-900 text-lg">
              Property Location
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Address bar */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
          <p className="text-sm text-slate-600 font-medium">
            {[
              location?.address,
              location?.city,
              location?.state,
              location?.zip,
              location?.country,
            ]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>

        {/* Map */}
        <div className="w-full h-[450px]">
          <iframe
            title="Property Location Map"
            src={mapSrc}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default PropertyMapModal;
