import React from "react";
import { PawPrint, Cigarette, Users } from "lucide-react";

const RuleCard = ({ icon: Icon, allowed, label, value }) => (
  <div className="flex flex-col items-center gap-3 p-5 bg-slate-50 rounded-2xl text-center">
    <div
      className={`w-12 h-12 rounded-full flex items-center justify-center ${
        allowed === true
          ? "bg-green-100"
          : allowed === false
            ? "bg-red-50"
            : "bg-blue-100"
      }`}
    >
      <Icon
        size={22}
        className={
          allowed === true
            ? "text-green-600"
            : allowed === false
              ? "text-red-400"
              : "text-blue-600"
        }
      />
    </div>
    <div>
      <p className="font-bold text-slate-900 text-sm">{label}</p>
      <p
        className={`text-xs font-semibold ${
          allowed === true
            ? "text-green-600"
            : allowed === false
              ? "text-red-500"
              : "text-blue-600"
        }`}
      >
        {value}
      </p>
    </div>
  </div>
);

const HouseRules = ({ rules }) => {
  if (!rules) return null;

  return (
    <div className="pt-12 border-t border-slate-100">
      <h3 className="text-xl font-black text-slate-900 mb-8">House Rules</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <RuleCard
          icon={PawPrint}
          allowed={rules.petsAllowed}
          label="Pets"
          value={rules.petsAllowed ? "Allowed" : "Not Allowed"}
        />
        <RuleCard
          icon={Cigarette}
          allowed={rules.smokingAllowed}
          label="Smoking"
          value={rules.smokingAllowed ? "Allowed" : "Not Allowed"}
        />
        <RuleCard
          icon={Users}
          allowed={null}
          label="Max Occupants"
          value={
            rules.maxOccupants
              ? `${rules.maxOccupants} people`
              : "Not specified"
          }
        />
      </div>
    </div>
  );
};

export default HouseRules;
