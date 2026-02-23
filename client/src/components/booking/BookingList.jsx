import React, { useState, useEffect } from "react";
import LoadingSpinner from "../ui/LoadingSpinner";
import PaymentModal from "../payment/PaymentModal";
import toast from "react-hot-toast";
import bookingService from "../../api/bookingService";

const BookingList = ({ role }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const data = await bookingService.getBookings();
      setBookings(data.data.bookings || []);
    } catch (err) {
      setError("Failed to fetch bookings");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await bookingService.updateBooking(id, { status });
      toast.success(`Booking ${status} successfully`);
      fetchBookings(); // Refresh list
    } catch (err) {
      toast.error(`Failed to ${status} booking`);
    }
  };

  const handleCancel = async (id) => {
    if (window.confirm("Are you sure you want to cancel this booking?")) {
      try {
        await bookingService.cancelBooking(id);
        toast.success("Booking cancelled");
        fetchBookings();
      } catch (err) {
        toast.error("Failed to cancel booking");
      }
    }
  };

  const handlePayment = (booking) => {
    setSelectedBooking(booking);
    setShowPaymentModal(true);
  };

  if (loading)
    return (
      <div className="flex justify-center p-12">
        <LoadingSpinner />
      </div>
    );
  if (error) return <div className="text-red-500 text-center p-8">{error}</div>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-md">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              House
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {role === "tenant" ? "Owner" : "Tenant"}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Dates
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Price
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {bookings.map((booking) => (
            <tr key={booking._id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {booking.houseId?.title || "Unknown"}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">
                  {role === "tenant"
                    ? booking.ownerId?.name || "Owner"
                    : booking.tenantId?.name || "Tenant"}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500 border border-slate-100 px-2 py-1 rounded-lg">
                  {new Date(booking.startDate).toLocaleDateString()} -{" "}
                  {new Date(booking.endDate).toLocaleDateString()}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full uppercase tracking-tighter
                  ${
                    booking.status === "approved"
                      ? "bg-green-100 text-green-800"
                      : booking.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : booking.status === "cancelled"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {booking.status}
                </span>
                {booking.paymentStatus === "paid" && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black rounded-sm uppercase">
                    Paid
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-black font-mono">
                ETB {booking.totalAmount?.toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                {role === "owner" && booking.status === "pending" && (
                  <>
                    <button
                      onClick={() =>
                        handleUpdateStatus(booking._id, "approved")
                      }
                      className="text-green-600 hover:text-green-900 font-bold"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() =>
                        handleUpdateStatus(booking._id, "rejected")
                      }
                      className="text-red-600 hover:text-red-900 font-bold"
                    >
                      Reject
                    </button>
                  </>
                )}
                {role === "tenant" &&
                  booking.status === "approved" &&
                  booking.paymentStatus !== "paid" && (
                    <button
                      onClick={() => handlePayment(booking)}
                      className="px-4 py-1.5 bg-primary text-white text-xs font-black rounded-lg shadow-sm hover:shadow-md transition-all active:scale-95"
                    >
                      PAY NOW
                    </button>
                  )}
                {booking.status !== "cancelled" &&
                  booking.status !== "rejected" &&
                  booking.paymentStatus !== "paid" && (
                    <button
                      onClick={() => handleCancel(booking._id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
              </td>
            </tr>
          ))}
          {bookings.length === 0 && (
            <tr>
              <td
                colSpan="6"
                className="px-6 py-8 text-center text-gray-500 italic"
              >
                No bookings found. Try exploring some homes!
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {showPaymentModal && selectedBooking && (
        <PaymentModal
          booking={selectedBooking}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            fetchBookings();
          }}
        />
      )}
    </div>
  );
};

export default BookingList;
