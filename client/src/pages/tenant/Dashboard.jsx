import React from "react";
import BookingList from "../../components/booking/BookingList";
import Navbar from "../../components/layout/Navbar";

const TenantDashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">My Bookings</h1>
          <BookingList role="tenant" />
        </div>
      </div>
    </div>
  );
};

export default TenantDashboard;
