import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import paymentService from "../../api/paymentService";

/**
 * PaymentSuccess
 *
 * Chapa redirects here after the user completes (or cancels) checkout.
 * The URL will contain ?trx_ref=<tx_ref>&status=success|failed
 *
 * We show an appropriate success / failure screen and let the user
 * navigate to their payment history.
 */
const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Chapa appends ?trx_ref=... and ?status=success|failed to the return_url
  const status = searchParams.get("status");
  const trxRef = searchParams.get("trx_ref");

  const isSuccess = status === "success";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-10 text-center border border-slate-100">
        {isSuccess ? (
          <>
            <div className="flex justify-center mb-6">
              <CheckCircle
                className="text-green-500"
                size={72}
                strokeWidth={1.5}
              />
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-2">
              Payment Successful!
            </h1>
            <p className="text-slate-500 font-medium mb-2">
              Your rental payment has been received and is being verified.
            </p>
            {trxRef && (
              <p className="text-xs text-slate-400 mb-8 font-mono bg-slate-50 rounded-xl p-2 border border-slate-100">
                Reference: {trxRef}
              </p>
            )}
          </>
        ) : (
          <>
            <div className="flex justify-center mb-6">
              <XCircle className="text-red-400" size={72} strokeWidth={1.5} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-2">
              Payment Cancelled
            </h1>
            <p className="text-slate-500 font-medium mb-8">
              Your payment was not completed. You can try again from your
              bookings.
            </p>
          </>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate("/payments")}
            className="w-full py-3.5 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl transition-colors"
          >
            View Payment History
          </button>
          <button
            onClick={() => navigate("/tenant/dashboard")}
            className="w-full py-3.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-2xl transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
