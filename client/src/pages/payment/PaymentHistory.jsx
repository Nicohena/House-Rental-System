import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import paymentService from "../../api/paymentService";
import Navbar from "../../components/layout/Navbar";
import { TableRowSkeleton } from "../../components/ui/Skeleton";
import { Receipt, RotateCcw, Loader2 } from "lucide-react";
import logger from "../../utils/logger";
import { useAuth } from "../../context/AuthContext";

const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refundingId, setRefundingId] = useState(null);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const data = await paymentService.getPaymentHistory();
      setPayments(data);
    } catch (err) {
      logger.error("Failed to fetch payments", err);
      toast.error("Failed to load payment history. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async (paymentId) => {
    if (
      !window.confirm(
        "Are you sure you want to process a refund for this payment?",
      )
    )
      return;
    setRefundingId(paymentId);
    try {
      await paymentService.processRefund(paymentId);
      toast.success("Refund processed successfully!");
      fetchPayments();
    } catch (err) {
      logger.error("Failed to refund", err);
      toast.error(err.response?.data?.message || "Failed to process refund.");
    } finally {
      setRefundingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const baseClasses =
      "px-2 inline-flex text-xs leading-5 font-semibold rounded-full";
    if (status === "success" || status === "completed") {
      return `${baseClasses} bg-green-100 text-green-800`;
    } else if (status === "pending") {
      return `${baseClasses} bg-yellow-100 text-yellow-800`;
    } else {
      return `${baseClasses} bg-red-100 text-red-800`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Receipt className="h-8 w-8 text-blue-600" />
            Payment History
          </h1>
          <p className="mt-2 text-gray-600">
            View all your payment transactions
          </p>
        </div>

        {loading ? (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    House
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRowSkeleton key={i} columns={5} />
                ))}
              </tbody>
            </table>
          </div>
        ) : payments.length > 0 ? (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Transaction ID
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    House
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Amount
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Date
                  </th>
                  {isAdmin && (
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr
                    key={payment._id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                      {payment.reference || payment._id.substring(0, 12)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.booking?.house?.title || "House Rental"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      {payment.currency} {payment.amount?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge(payment.status)}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        {payment.status === "succeeded" ||
                        payment.status === "completed" ? (
                          <button
                            onClick={() => handleRefund(payment._id)}
                            disabled={refundingId === payment._id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            {refundingId === payment._id ? (
                              <Loader2 className="animate-spin" size={12} />
                            ) : (
                              <RotateCcw size={12} />
                            )}
                            Refund
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white p-12 text-center rounded-xl border border-dashed border-gray-300">
            <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
              <Receipt className="h-full w-full" />
            </div>
            <p className="text-gray-500 text-lg">No payment records found.</p>
            <p className="text-gray-400 text-sm mt-2">
              Your payment transactions will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentHistory;
