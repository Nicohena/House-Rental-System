import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import adminService from "../../api/adminService";
import Navbar from "../../components/layout/Navbar";
import { useConfirmDialog } from "../../components/ui/ConfirmDialog";
import { CardSkeleton } from "../../components/ui/Skeleton";
import logger from "../../utils/logger";

const ListingManagement = () => {
  const [pendingListings, setPendingListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const { confirm, ConfirmDialog: ConfirmDialogComponent } = useConfirmDialog();

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const data = await adminService.getPendingListings();
      setPendingListings(data);
    } catch (err) {
      logger.error("Failed to fetch pending listings", err);
      toast.error("Failed to load pending listings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id, decision, title) => {
    const actionText = decision === "approve" ? "approve" : "reject";
    const variant = decision === "approve" ? "success" : "danger";

    await confirm({
      title: `${decision === "approve" ? "Approve" : "Reject"} Listing`,
      message: `Are you sure you want to ${actionText} "${title}"? This action cannot be undone.`,
      confirmText: decision === "approve" ? "Approve" : "Reject",
      variant,
      onConfirm: async () => {
        try {
          await adminService.verifyListing(id, decision);
          setPendingListings(pendingListings.filter((item) => item._id !== id));
          toast.success(`Listing ${actionText}ed successfully! 🎉`);
          logger.info(`Listing ${actionText}ed`, { listingId: id, decision });
        } catch (err) {
          logger.error(`Failed to ${actionText} listing`, err);
          toast.error(`Failed to ${actionText} listing. Please try again.`);
          throw err; // Re-throw to prevent dialog from closing
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Pending Approvals
          </h1>
          <p className="mt-2 text-gray-600">
            Review and approve or reject property listings
          </p>
        </div>

        {loading ? (
          <div
            className="grid grid-cols-1 gap-6"
            role="status"
            aria-label="Loading listings"
          >
            {[1, 2, 3].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {pendingListings.map((listing) => (
              <div
                key={listing._id}
                className="bg-white p-6 rounded-xl shadow-sm border flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow"
              >
                <img
                  src={
                    listing.images?.[0] ||
                    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=400&q=80"
                  }
                  alt={listing.title}
                  className="w-full md:w-64 h-40 object-cover rounded-lg"
                  loading="lazy"
                />
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">
                    {listing.title}
                  </h2>
                  <p className="text-gray-600 mb-2">
                    {listing.location?.address}, {listing.location?.city}
                  </p>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                    {listing.description}
                  </p>
                  <p className="font-bold text-blue-600 mb-4">
                    ETB {listing.price?.toLocaleString()} / Month
                  </p>

                  <div className="flex gap-4">
                    <button
                      onClick={() =>
                        handleVerify(listing._id, "approve", listing.title)
                      }
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                      aria-label={`Approve listing: ${listing.title}`}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() =>
                        handleVerify(listing._id, "reject", listing.title)
                      }
                      className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      aria-label={`Reject listing: ${listing.title}`}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {pendingListings.length === 0 && (
              <div className="bg-white p-12 text-center rounded-xl border border-dashed border-gray-300">
                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                  <svg
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                </div>
                <p className="text-gray-500 text-lg">
                  No pending listings for review.
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  New listings will appear here when they're submitted.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialogComponent />
    </div>
  );
};

export default ListingManagement;
