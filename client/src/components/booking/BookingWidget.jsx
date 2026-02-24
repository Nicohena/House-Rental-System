import React, { useState, useEffect, useMemo } from "react";
import {
  Star,
  Loader2,
  Calendar,
  Users,
  Info,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { calculateTotalPrice, validateMinLease } from "../../utils/priceUtils";
import bookingService from "../../api/bookingService";
import { useAuth } from "../../context/AuthContext";

const BookingWidget = ({ house, user: propUser, onBookingSuccess }) => {
  const { user: contextUser, loading: authLoading } = useAuth();
  const user = propUser || contextUser;

  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState("");
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [fetchingDates, setFetchingDates] = useState(true);
  const [occupants, setOccupants] = useState({ adults: 1, children: 0 });

  const isOwner = (user?._id || user?.id) === house.ownerId?._id;

  // 1. Fetch unavailable dates
  useEffect(() => {
    const fetchDates = async () => {
      try {
        const response = await bookingService.getUnavailableDates(house._id);
        const dates = response.data?.unavailableDates || [];
        setUnavailableDates(
          dates.map((range) => ({
            start: new Date(range.start).toISOString().split("T")[0],
            end: new Date(range.end).toISOString().split("T")[0],
          })),
        );
      } catch (err) {
        console.error("Failed to fetch unavailable dates", err);
      } finally {
        setFetchingDates(false);
      }
    };
    fetchDates();
  }, [house._id]);

  // 2. Auto-adjust end date based on min lease when start date changes
  useEffect(() => {
    if (startDate && house.minLeaseDuration) {
      const start = new Date(startDate);
      const newEnd = new Date(start);
      newEnd.setMonth(newEnd.getMonth() + house.minLeaseDuration);
      setEndDate(newEnd.toISOString().split("T")[0]);
    } else if (startDate && !endDate) {
      const start = new Date(startDate);
      const newEnd = new Date(start);
      newEnd.setMonth(newEnd.getMonth() + 1);
      setEndDate(newEnd.toISOString().split("T")[0]);
    }
  }, [startDate, house.minLeaseDuration]);

  // 3. Dynamic price calculation
  const { subtotal, total, diffDays } = useMemo(
    () => calculateTotalPrice(house.price, startDate, endDate, 350),
    [house.price, startDate, endDate],
  );

  // 4. Check if current selection overlaps with unavailable dates
  const hasOverlapError = useMemo(() => {
    if (!startDate || !endDate) return false;
    const start = new Date(startDate);
    const end = new Date(endDate);

    return unavailableDates.some((range) => {
      const bookedStart = new Date(range.start);
      const bookedEnd = new Date(range.end);
      return start < bookedEnd && end > bookedStart;
    });
  }, [startDate, endDate, unavailableDates]);

  const handleBooking = async () => {
    if (!user) {
      toast.error("Please login to request a booking");
      return;
    }

    if (isOwner) {
      toast.error("You cannot book your own property");
      return;
    }

    if (!startDate || !endDate) {
      toast.error("Please select both dates");
      return;
    }

    if (hasOverlapError) {
      toast.error("The selected dates overlap with an existing booking");
      return;
    }

    if (!validateMinLease(startDate, endDate, house.minLeaseDuration)) {
      toast.error(
        `Minimum lease is ${house.minLeaseDuration} month${house.minLeaseDuration !== 1 ? "s" : ""}`,
      );
      return;
    }

    setBookingLoading(true);
    try {
      await bookingService.createBooking({
        houseId: house._id,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        occupants,
      });
      toast.success("Booking request sent! Wait for owner approval.");
      if (onBookingSuccess) onBookingSuccess();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to create booking";
      toast.error(msg);
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl top-28 h-fit w-full">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-slate-900">
            ETB {house.price?.toLocaleString()}
          </span>
          <span className="text-sm text-slate-500 font-medium">/ month</span>
        </div>
        <div className="flex items-center gap-1">
          <Star size={14} className="fill-warning text-warning" />
          <span className="text-sm font-bold">
            {house.averageRating?.toFixed(1) || "New"}
          </span>
          <span className="text-xs text-slate-400">
            ({house.ratings?.length || 0})
          </span>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-1 border border-slate-200 rounded-2xl overflow-hidden">
          <div className="p-3 border-b border-slate-200 hover:bg-slate-50 relative group">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Check-in
            </p>
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-slate-400" />
              <input
                type="date"
                value={startDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-sm font-bold text-slate-900 bg-transparent outline-none cursor-pointer"
              />
            </div>
          </div>
          <div className="p-3 hover:bg-slate-50 relative group">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Check-out
            </p>
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-slate-400" />
              <input
                type="date"
                value={endDate}
                min={startDate || new Date().toISOString().split("T")[0]}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-sm font-bold text-slate-900 bg-transparent outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        <AnimatePresence>
          {hasOverlapError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 text-red-600 p-3 bg-red-50 rounded-xl border border-red-100"
            >
              <AlertCircle size={14} className="shrink-0" />
              <span className="text-[10px] font-bold">
                Selected dates overlap with an existing booking
              </span>
            </motion.div>
          )}

          {house.minLeaseDuration > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-primary p-2 bg-primary/5 rounded-xl border border-primary/10"
            >
              <Info size={14} />
              <span className="text-[10px] font-bold">
                Minimum lease: {house.minLeaseDuration} months
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        onClick={handleBooking}
        disabled={
          bookingLoading ||
          isOwner ||
          fetchingDates ||
          hasOverlapError ||
          authLoading
        }
        className="w-full py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 mb-2 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
      >
        <AnimatePresence mode="wait">
          {bookingLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center justify-center gap-2"
            >
              <Loader2 className="animate-spin" size={18} />
              <span>Processing...</span>
            </motion.div>
          ) : (
            <motion.span
              key="text"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {isOwner ? "You own this property" : "Request Booking"}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <p className="text-xs text-center text-slate-400 italic mb-6">
        You won't be charged yet
      </p>

      <AnimatePresence>
        {diffDays > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 pt-4 border-t border-slate-100 overflow-hidden"
          >
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 underline">
                Subtotal ({diffDays} nights)
              </span>
              <span className="text-slate-900 font-medium font-mono">
                ETB {subtotal.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 underline">Service Fee</span>
              <span className="text-slate-900 font-medium font-mono">
                ETB 350
              </span>
            </div>
            <div className="flex justify-between pt-4 border-t border-slate-100">
              <span className="text-lg font-black text-slate-900">Total</span>
              <span className="text-lg font-black text-slate-900 font-mono">
                ETB {total.toLocaleString()}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BookingWidget;
