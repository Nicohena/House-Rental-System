import React, { useState } from "react";
import toast from "react-hot-toast";
import paymentService from "../../api/paymentService";
import LoadingSpinner from "../ui/LoadingSpinner";
import {
  Shield,
  CreditCard,
  X,
  Info,
  MapPin,
  Calendar,
  ArrowRight,
} from "lucide-react";
import logger from "../../utils/logger";
import { motion, AnimatePresence } from "framer-motion";

const PaymentModal = ({ booking, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Constants
  const rentAmount = booking.totalAmount || 0;
  const serviceFee = Math.round(rentAmount * 0.05);
  const totalAmount = rentAmount + serviceFee;

  const handlePayWithChapa = async () => {
    try {
      setLoading(true);

      if (!booking?._id) {
        toast.error("Invalid booking. Please try again.");
        return;
      }

      const payload = {
        bookingId: booking._id,
        paymentMethod: "chapa",
      };

      const result = await paymentService.initiatePayment(payload);

      if (result.data?.checkoutUrl) {
        setRedirecting(true);
        toast.success("Redirecting to secure payment gateway...");
        logger.info("Payment initiated", { bookingId: booking._id });

        // Redirect to Chapa checkout page
        setTimeout(() => {
          window.location.href = result.data.checkoutUrl;
        }, 1500);
      } else {
        throw new Error("Failed to get checkout URL");
      }
    } catch (err) {
      logger.error("Payment initiation failed", err);
      const errorMessage =
        err.response?.data?.message ||
        "Payment initiation failed. Please try again.";

      toast.error(errorMessage);
    } finally {
      if (!redirecting) setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100"
      >
        {/* Header with Image Background */}
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700 relative flex items-end p-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-white rounded-2xl overflow-hidden shadow-lg border-2 border-white/20 shrink-0">
              {booking.houseId?.images?.[0] ? (
                <img
                  src={booking.houseId.images[0]}
                  alt="Property"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-slate-100 flex items-center justify-center">
                  <MapPin size={24} className="text-slate-400" />
                </div>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white leading-tight">
                {booking.houseId?.title || "Property Payment"}
              </h2>
              <p className="text-blue-100 text-xs flex items-center gap-1 mt-1">
                <MapPin size={12} />{" "}
                {booking.houseId?.location?.address || "Addis Ababa, Ethiopia"}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Detailed Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Check In
              </p>
              <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Calendar size={14} className="text-blue-600" />
                {new Date(booking.startDate).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Check Out
              </p>
              <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Calendar size={14} className="text-blue-600" />
                {new Date(booking.endDate).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="space-y-3 mb-6">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">
              Price Breakdown
            </h3>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Rent Amount</span>
              <span className="font-semibold text-slate-800">
                ETB {rentAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <div className="flex items-center gap-1.5 group cursor-help">
                <span className="text-slate-500">Service Fee (5%)</span>
                <Info
                  size={12}
                  className="text-slate-400 group-hover:text-blue-500 transition-colors"
                />
              </div>
              <span className="font-semibold text-slate-800">
                ETB {serviceFee.toLocaleString()}
              </span>
            </div>
            <div className="pt-3 border-t-2 border-dashed border-slate-100 flex justify-between items-center">
              <span className="font-bold text-slate-900">
                Total payable amount
              </span>
              <span className="text-xl font-extrabold text-blue-600">
                ETB {totalAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Security & Action */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
              <div className="bg-blue-600 p-2 rounded-xl text-white">
                <Shield size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Encrypted Payment
                </p>
                <p className="text-[11px] text-slate-500">
                  Transactions are secured and verified via Chapa.
                </p>
              </div>
            </div>

            <button
              onClick={handlePayWithChapa}
              disabled={loading || redirecting}
              className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {loading || redirecting ? (
                <>
                  <LoadingSpinner size="sm" variant="white" />
                  <span>
                    {redirecting
                      ? "Forwarding to Gateway..."
                      : "Preparing secure hash..."}
                  </span>
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5" />
                  <span>Proceed to Payment</span>
                  <ArrowRight
                    size={18}
                    className="translate-x-0 group-hover:translate-x-1 transition-transform"
                  />
                </>
              )}
            </button>

            <p className="text-[10px] text-center text-slate-400 px-6">
              By proceeding, you agree to our terms of service. You will be
              redirected to complete the payment for{" "}
              <span className="text-slate-600 font-semibold">
                {booking.houseId?.title}
              </span>
              .
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentModal;
