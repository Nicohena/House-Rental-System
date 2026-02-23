import React, { useState, useEffect } from "react";
import { Calendar, MapPin, DollarSign, Eye } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

const BookingHistorySettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("all"); // all, upcoming, completed, cancelled

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockBookings = [
        {
          id: "1",
          houseName: "Modern Downtown Apartment",
          location: "New York, NY",
          checkIn: "2026-03-15",
          checkOut: "2026-03-20",
          totalPrice: 750,
          status: "upcoming",
          image: "/placeholder-house.jpg",
        },
        {
          id: "2",
          houseName: "Cozy Studio with WiFi",
          location: "San Francisco, CA",
          checkIn: "2026-02-01",
          checkOut: "2026-02-05",
          totalPrice: 600,
          status: "completed",
          image: "/placeholder-house.jpg",
        },
        {
          id: "3",
          houseName: "Beach House Retreat",
          location: "Miami, FL",
          checkIn: "2026-01-10",
          checkOut: "2026-01-15",
          totalPrice: 900,
          status: "cancelled",
          image: "/placeholder-house.jpg",
        },
      ];
      setBookings(mockBookings);
    } catch (error) {
      toast.error("Failed to fetch booking history");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      upcoming: "bg-blue-100 text-blue-700",
      completed: "bg-green-100 text-green-700",
      cancelled: "bg-red-100 text-red-700",
    };

    return (
      <span
        className={`px-2 py-1 rounded text-xs font-semibold capitalize ${styles[status]}`}
      >
        {status}
      </span>
    );
  };

  const filteredBookings = bookings.filter((booking) =>
    filter === "all" ? true : booking.status === filter,
  );

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Booking History</h2>
        <p className="text-sm text-gray-600 mt-1">
          View your past and upcoming bookings.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {["all", "upcoming", "completed", "cancelled"].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              filter === status
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Loading bookings...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            No {filter !== "all" && filter} bookings found
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <div
              key={booking.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex flex-col md:flex-row gap-4">
                {/* Booking Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {booking.houseName}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                        <MapPin className="w-4 h-4" />
                        {booking.location}
                      </div>
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Check-in</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(booking.checkIn).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Check-out</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(booking.checkOut).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Total Price</p>
                      <p className="text-sm font-semibold text-gray-900">
                        ${booking.totalPrice}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex md:flex-col gap-2">
                  <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookingHistorySettings;
