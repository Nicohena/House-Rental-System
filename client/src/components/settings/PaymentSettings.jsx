import React, { useState } from "react";
import { CreditCard, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

const PaymentSettings = () => {
  const [loading, setLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([
    {
      id: "1",
      type: "visa",
      last4: "4242",
      expiry: "12/25",
      isDefault: true,
    },
    {
      id: "2",
      type: "mastercard",
      last4: "8888",
      expiry: "06/26",
      isDefault: false,
    },
  ]);

  const getCardIcon = (type) => {
    return <CreditCard className="w-6 h-6 text-gray-600" />;
  };

  const handleSetDefault = async (id) => {
    try {
      setLoading(true);
      setPaymentMethods((prev) =>
        prev.map((method) => ({
          ...method,
          isDefault: method.id === id,
        })),
      );
      toast.success("Default payment method updated");
    } catch (error) {
      toast.error("Failed to update default payment method");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id) => {
    if (
      !window.confirm("Are you sure you want to remove this payment method?")
    ) {
      return;
    }

    try {
      setLoading(true);
      setPaymentMethods((prev) => prev.filter((method) => method.id !== id));
      toast.success("Payment method removed");
    } catch (error) {
      toast.error("Failed to remove payment method");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = () => {
    toast("Add payment method feature coming soon", {
      icon: "ℹ️",
    });
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Payment Methods</h2>
        <p className="text-sm text-gray-600 mt-1">
          Manage your saved payment methods.
        </p>
      </div>

      <div className="space-y-4 mb-6">
        {paymentMethods.map((method) => (
          <div
            key={method.id}
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
          >
            <div className="flex items-center gap-4">
              {getCardIcon(method.type)}
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900 capitalize">
                    {method.type} •••• {method.last4}
                  </p>
                  {method.isDefault && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Expires {method.expiry}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!method.isDefault && (
                <button
                  onClick={() => handleSetDefault(method.id)}
                  disabled={loading}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Set as Default
                </button>
              )}
              <button
                onClick={() => handleRemove(method.id)}
                disabled={loading || method.isDefault}
                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  method.isDefault
                    ? "Cannot remove default payment method"
                    : "Remove"
                }
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleAddPayment}
        className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-colors w-full justify-center"
      >
        <Plus className="w-5 h-5" />
        <span className="font-medium">Add Payment Method</span>
      </button>
    </div>
  );
};

export default PaymentSettings;
