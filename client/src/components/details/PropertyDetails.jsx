import React from "react";
import {
  Home,
  BedDouble,
  DollarSign,
  Clock,
  Calendar,
  MapPin,
} from "lucide-react";

const DetailCard = ({ icon: Icon, iconBg, iconColor, label, value }) => (
  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
    <div
      className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center`}
    >
      <Icon size={20} className={iconColor} />
    </div>
    <div>
      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
        {label}
      </p>
      <p className="font-bold text-slate-900 capitalize">{value}</p>
    </div>
  </div>
);

const PropertyDetails = ({ house }) => {
  const totalRooms =
    house.rooms?.totalRooms ||
    (house.rooms?.bedrooms || 0) + (house.rooms?.bathrooms || 0) ||
    "—";

  return (
    <div className="pt-12 border-t border-slate-100">
      <h3 className="text-xl font-black text-slate-900 mb-8">
        Property Details
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DetailCard
          icon={Home}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          label="Property Type"
          value={house.propertyType}
        />
        <DetailCard
          icon={BedDouble}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          label="Total Rooms"
          value={totalRooms}
        />
        {house.deposit > 0 && (
          <DetailCard
            icon={DollarSign}
            iconBg="bg-amber-100"
            iconColor="text-amber-600"
            label="Security Deposit"
            value={`ETB ${house.deposit?.toLocaleString()}`}
          />
        )}
        {house.minLeaseDuration > 0 && (
          <DetailCard
            icon={Clock}
            iconBg="bg-purple-100"
            iconColor="text-purple-600"
            label="Min Lease Duration"
            value={`${house.minLeaseDuration} month${house.minLeaseDuration !== 1 ? "s" : ""}`}
          />
        )}
        {house.availableFrom && (
          <DetailCard
            icon={Calendar}
            iconBg="bg-teal-100"
            iconColor="text-teal-600"
            label="Available From"
            value={new Date(house.availableFrom).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          />
        )}
        {house.size > 0 && (
          <DetailCard
            icon={MapPin}
            iconBg="bg-indigo-100"
            iconColor="text-indigo-600"
            label="Property Size"
            value={`${house.size?.toLocaleString()} sqft`}
          />
        )}
      </div>
    </div>
  );
};

export default PropertyDetails;
