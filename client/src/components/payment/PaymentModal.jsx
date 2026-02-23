import React, { useState } from "react";
import toast from "react-hot-toast";
import paymentService from "../../api/paymentService";
import LoadingSpinner from "../ui/LoadingSpinner";
import { Shield, CreditCard } from "lucide-react";
import logger from "../../utils/logger";

const PaymentModal = ({ booking, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  const handlePayWithChapa = async () => {
    try {
      setLoading(true);

      // Validate booking exists and is approved
      if (!booking?._id) {
        toast.error("Invalid booking. Please try again.");
        return;
      }

      // Backend only needs bookingId - it gets all other data from the booking record
      const payload = {
        bookingId: booking._id,
        paymentMethod: "chapa",
      };

      const result = await paymentService.initiatePayment(payload);

      if (result.data?.checkoutUrl) {
        toast.success("Redirecting to secure payment gateway...");
        logger.info("Payment initiated", { bookingId: booking._id });

        // Redirect to Chapa checkout page
        setTimeout(() => {
          window.location.href = result.data.checkoutUrl;
        }, 1000);
      } else {
        throw new Error("Failed to get checkout URL");
      }
    } catch (err) {
      logger.error("Payment initiation failed", err);
      const errorMessage =
        err.response?.data?.message ||
        "Payment initiation failed. Please try again.";

      // Handle specific error cases
      if (err.response?.status === 400) {
        if (errorMessage.includes("approved")) {
          toast.error(
            "Booking must be approved by the landlord before payment.",
          );
        } else if (errorMessage.includes("already been paid")) {
          toast.error("This booking has already been paid.");
        } else {
          toast.error(errorMessage);
        }
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 transform transition-all">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Confirm Payment</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close payment modal"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">House</span>
            <span className="font-semibold">
              {booking.houseId?.title || "Rental Property"}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Duration</span>
            <span className="font-semibold">
              {new Date(booking.startDate).toLocaleDateString()} -{" "}
              {new Date(booking.endDate).toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600 font-bold text-lg">
              Total Amount
            </span>
            <span className="font-bold text-lg text-blue-600">
              ETB {booking.totalAmount?.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Security Badge */}
        <div className="flex items-center gap-2 bg-green-50 p-3 rounded-lg mb-6">
          <Shield className="h-5 w-5 text-green-600" />
          <p className="text-sm text-green-800">
            Secure payment powered by Chapa
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handlePayWithChapa}
            disabled={loading}
            className="w-full bg-[#3c5998] hover:bg-[#2d4373] text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#3c5998] focus:ring-offset-2"
            aria-busy={loading}
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" variant="white" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5" />
                Pay with Chapa (Telebirr/CBE Birr)
              </>
            )}
          </button>

          <p className="text-xs text-center text-gray-500 mt-4">
            You will be redirected to Chapa's secure payment page to complete
            your transaction.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
