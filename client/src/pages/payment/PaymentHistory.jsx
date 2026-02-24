import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import paymentService from "../../api/paymentService";
import Navbar from "../../components/layout/Navbar";
import { TableRowSkeleton } from "../../components/ui/Skeleton";
import { Receipt, RotateCcw, Loader2, Filter, Search, ChevronLeft, ChevronRight, Info, ExternalLink, CheckCircle2, AlertCircle, Clock, ShieldCheck } from "lucide-react";
import logger from "../../utils/logger";
import { useAuth } from "../../context/AuthContext";
import socket from "../../utils/socket";
import { motion, AnimatePresence } from "framer-motion";

const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refundingId, setRefundingId] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [filters, setFilters] = useState({ status: "", method: "" });
  const [showRefundModal, setShowRefundModal] = useState(null);
  const [refundReason, setRefundReason] = useState("");
  
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isOwner = user?.role === "owner";

  const fetchPayments = useCallback(async (page = pagination.page) => {
    try {
      setLoading(true);
      const result = await paymentService.getPaymentHistory({
        page,
        limit: pagination.limit,
        ...filters
      });
      
      if (result.success) {
        setPayments(result.data.payments);
        setPagination(result.data.pagination);
      }
    } catch (err) {
      logger.error("Failed to fetch payments", err);
      toast.error("Failed to load payment history.");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Real-time updates via WebSockets
  useEffect(() => {
    if (!socket.connected) return;

    const handlePaymentUpdate = (data) => {
      console.log("[Socket] Payment update received:", data);
      setPayments(prev => prev.map(p => 
        p._id === data.paymentId ? { ...p, status: data.status } : p
      ));
      
      if (data.status === 'succeeded') {
        toast.success(`Payment ETB ${data.amount?.toLocaleString()} succeeded!`, { icon: '💰' });
      }
    };

    socket.on('payment:success', (data) => handlePaymentUpdate({ ...data, status: 'succeeded' }));
    socket.on('payment:failed', (data) => handlePaymentUpdate({ ...data, status: 'failed' }));
    socket.on('payment:update', handlePaymentUpdate);
    socket.on('refund:processed', (data) => handlePaymentUpdate({ ...data, status: 'refunded' }));

    return () => {
      socket.off('payment:success');
      socket.off('payment:failed');
      socket.off('payment:update');
      socket.off('refund:processed');
    };
  }, []);

  const handleRefundSubmit = async () => {
    if (!refundReason) {
      toast.error("Please provide a reason for the refund.");
      return;
    }

    setRefundingId(showRefundModal._id);
    try {
      await paymentService.processRefund(showRefundModal._id, { reason: refundReason });
      toast.success("Refund processed successfully!");
      setShowRefundModal(null);
      setRefundReason("");
      fetchPayments();
    } catch (err) {
      logger.error("Failed to refund", err);
      toast.error(err.response?.data?.message || "Failed to process refund.");
    } finally {
      setRefundingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      succeeded: { color: "bg-emerald-100 text-emerald-800", icon: <CheckCircle2 size={12} /> },
      processing: { color: "bg-blue-100 text-blue-800", icon: <Clock size={12} className="animate-pulse" /> },
      pending: { color: "bg-amber-100 text-amber-800", icon: <Clock size={12} /> },
      failed: { color: "bg-red-100 text-red-800", icon: <AlertCircle size={12} /> },
      refunded: { color: "bg-slate-100 text-slate-800", icon: <RotateCcw size={12} /> },
      cancelled: { color: "bg-gray-100 text-gray-800", icon: <X size={12} /> }
    };

    const cur = config[status] || config.pending;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cur.color}`}>
        {cur.icon}
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        
        {/* HeaderSection */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
                <Receipt className="h-6 w-6" />
              </div>
              Transaction Ledger
            </h1>
            <p className="mt-2 text-slate-500 font-medium">
              Manage and track all financial activities across the platform.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
              <select 
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="bg-transparent text-sm font-semibold text-slate-700 px-3 py-2 outline-none cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="succeeded">Succeeded</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
              <div className="w-px h-6 bg-slate-200 self-center mx-1" />
              <select 
                value={filters.method}
                onChange={(e) => setFilters(prev => ({ ...prev, method: e.target.value }))}
                className="bg-transparent text-sm font-semibold text-slate-700 px-3 py-2 outline-none cursor-pointer"
              >
                <option value="">All Gateways</option>
                <option value="chapa">Chapa</option>
                <option value="stripe">Stripe</option>
              </select>
            </div>
            
            <button 
              onClick={() => fetchPayments(1)}
              className="p-2.5 bg-white text-slate-600 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
            >
              <Filter size={20} />
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="p-8">
              <table className="min-w-full">
                <tbody className="divide-y divide-slate-100">
                  {[1, 2, 3, 4, 5].map((i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-6 px-4"><div className="h-4 bg-slate-100 rounded w-24"></div></td>
                        <td className="py-6 px-4"><div className="h-4 bg-slate-100 rounded w-32"></div></td>
                        <td className="py-6 px-4"><div className="h-4 bg-slate-100 rounded w-16"></div></td>
                        <td className="py-6 px-4"><div className="h-6 bg-slate-100 rounded-full w-20"></div></td>
                        <td className="py-6 px-4"><div className="h-4 bg-slate-100 rounded w-24"></div></td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transaction Info</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Property & User</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gateway</th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((payment) => (
                    <tr key={payment._id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-mono text-slate-400 group-hover:text-blue-600 transition-colors">
                            #{payment.transactionId || payment._id.substring(0, 10).toUpperCase()}
                          </span>
                          <span className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(payment.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {payment.houseId?.title || "Property Payment"}
                          </span>
                          <span className="text-xs text-slate-500">
                            {isAdmin || isOwner ? `By: ${payment.userId?.name || 'User'}` : `To: ${payment.ownerId?.name || 'Owner'}`}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-extrabold text-slate-900">
                            {payment.currency} {payment.amount?.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400">Total Charged</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        {getStatusBadge(payment.status)}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                           <div className={`p-1 rounded-lg ${payment.method === 'stripe' ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'}`}>
                             {payment.method === 'stripe' ? <ShieldCheck size={14} /> : <div className="text-[8px] font-black uppercase">CHAPA</div>}
                           </div>
                           <span className="text-xs font-bold text-slate-600 capitalize">{payment.method}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isAdmin && (payment.status === "succeeded") && (
                            <button
                              onClick={() => setShowRefundModal(payment)}
                              className="p-2 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors"
                              title="Process Refund"
                            >
                              <RotateCcw size={16} />
                            </button>
                          )}
                          <button className="p-2 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors">
                            <ExternalLink size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-20 text-center">
              <div className="inline-block p-6 bg-slate-50 rounded-full mb-4">
                <Receipt size={40} className="text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Transactions Found</h3>
              <p className="text-slate-500 max-w-xs mx-auto">
                No payment history recorded for your selection. Try adjusting your filters.
              </p>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-6 py-5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">
                Showing page {pagination.page} of {pagination.pages}
              </span>
              <div className="flex items-center gap-2">
                <button 
                  disabled={pagination.page === 1 || loading}
                  onClick={() => fetchPayments(pagination.page - 1)}
                  className="p-2 bg-white rounded-xl border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="flex gap-1">
                  {[...Array(pagination.pages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => fetchPayments(i + 1)}
                      className={`h-9 w-9 rounded-xl text-xs font-bold transition-all ${
                        pagination.page === i + 1 
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                          : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-400 font-bold'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button 
                  disabled={pagination.page === pagination.pages || loading}
                  onClick={() => fetchPayments(pagination.page + 1)}
                  className="p-2 bg-white rounded-xl border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Admin Refund Modal */}
      <AnimatePresence>
        {showRefundModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-8 overflow-hidden relative"
            >
              <button 
                onClick={() => setShowRefundModal(null)}
                className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X size={20} />
              </button>

              <div className="mb-8">
                <div className="h-16 w-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6">
                  <RotateCcw size={32} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 leading-tight">Process Refund</h2>
                <p className="text-slate-500 text-sm mt-2">
                  You are about to refund <span className="font-bold text-slate-900">ETB {showRefundModal.amount.toLocaleString()}</span> for <span className="text-blue-600 font-bold">{showRefundModal.houseId?.title}</span>.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Refund Reason</label>
                  <textarea 
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="e.g., Booking cancellation by owner, system error..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-red-100 focus:border-red-400 outline-none transition-all resize-none h-32 text-sm font-medium text-slate-800"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setShowRefundModal(null)}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest text-[10px]"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleRefundSubmit}
                    disabled={refundingId || !refundReason}
                    className="flex-[2] py-4 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 shadow-xl shadow-red-200 disabled:opacity-50 transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
                  >
                    {refundingId ? <Loader2 size={16} className="animate-spin" /> : "Confirm Full Refund"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PaymentHistory;
