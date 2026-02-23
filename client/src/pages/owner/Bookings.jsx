import React from "react";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import BookingList from "../../components/booking/BookingList";

const OwnerBookings = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Bookings
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Manage your booking requests and history.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <BookingList role="owner" />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OwnerBookings;
