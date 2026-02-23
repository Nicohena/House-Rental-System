import React, { useState } from "react";
import Modal from "./Modal";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";
import clsx from "clsx";

/**
 * Confirm Dialog Component
 * Accessible confirmation dialog to replace window.confirm()
 */

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "warning",
  isLoading = false,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const variantConfig = {
    warning: {
      icon: AlertTriangle,
      iconColor: "text-yellow-600",
      iconBg: "bg-yellow-100",
      buttonColor: "bg-yellow-600 hover:bg-yellow-700",
    },
    danger: {
      icon: AlertTriangle,
      iconColor: "text-red-600",
      iconBg: "bg-red-100",
      buttonColor: "bg-red-600 hover:bg-red-700",
    },
    info: {
      icon: Info,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-100",
      buttonColor: "bg-blue-600 hover:bg-blue-700",
    },
    success: {
      icon: CheckCircle,
      iconColor: "text-green-600",
      iconBg: "bg-green-100",
      buttonColor: "bg-green-600 hover:bg-green-700",
    },
  };

  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Confirmation action failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const loading = isLoading || isProcessing;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      closeOnOverlayClick={!loading}
      showCloseButton={false}
    >
      <div className="text-center">
        {/* Icon */}
        <div
          className={clsx(
            "mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-4",
            config.iconBg,
          )}
        >
          <Icon
            className={clsx("h-8 w-8", config.iconColor)}
            aria-hidden="true"
          />
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>

        {/* Message */}
        {message && <p className="text-gray-600 mb-6">{message}</p>}

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 justify-center">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={clsx(
              "px-6 py-2 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2",
              config.buttonColor,
            )}
          >
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            )}
            {loading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

/**
 * Hook to use confirm dialog
 */
export const useConfirmDialog = () => {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    variant: "warning",
    confirmText: "Confirm",
    cancelText: "Cancel",
  });

  const confirm = ({
    title,
    message,
    onConfirm,
    variant = "warning",
    confirmText = "Confirm",
    cancelText = "Cancel",
  }) => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        title,
        message,
        onConfirm: async () => {
          await onConfirm();
          resolve(true);
        },
        variant,
        confirmText,
        cancelText,
      });
    });
  };

  const closeDialog = () => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  };

  return {
    confirm,
    ConfirmDialog: () => (
      <ConfirmDialog {...dialogState} onClose={closeDialog} />
    ),
  };
};

export default ConfirmDialog;
