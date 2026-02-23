import React, { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { Loader2, PlusCircle } from "lucide-react";
import { houseService } from "../../api/houseService";
import OwnerListingCard from "../../components/pieces/OwnerListingCard";
import { useNavigate } from "react-router-dom";

const FilterChip = ({ label, active = false, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all whitespace-nowrap ${
      active
        ? "bg-primary border-primary text-white shadow-md"
        : "bg-white border-slate-200 text-slate-600 hover:border-primary/50"
    }`}
  >
    {label}
  </button>
);

const OwnerListings = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | paused
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState("createdAt"); // createdAt | views | price
  const [updatingId, setUpdatingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      try {
        const response = await houseService.getMyListings();
        setListings(response.data.data.houses || []);
        setError(null);
      } catch (err) {
        console.error("Failed to load listings", err);
        setError(
          err.response?.data?.message ||
            "Failed to load your listings. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, []);

  const handleToggleAvailability = async (house) => {
    try {
      setUpdatingId(house._id);
      const updated = await houseService.updateHouse(house._id, {
        available: !house.available,
      });
      const updatedHouse = updated.data.data.house;
      setListings((prev) =>
        prev.map((h) => (h._id === house._id ? updatedHouse : h)),
      );
    } catch (err) {
      console.error("Failed to update availability", err);
      window.alert(
        err.response?.data?.message ||
          "Failed to update listing availability. Please try again.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (house) => {
    const confirmed = window.confirm(
      `Delete "${house.title}"? This cannot be undone and active bookings may be affected.`,
    );
    if (!confirmed) return;

    try {
      setUpdatingId(house._id);
      await houseService.deleteHouse(house._id);
      setListings((prev) => prev.filter((h) => h._id !== house._id));
    } catch (err) {
      console.error("Failed to delete listing", err);
      window.alert(
        err.response?.data?.message ||
          "Failed to delete listing. Please try again.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const stats = useMemo(() => {
    if (!listings || listings.length === 0) {
      return {
        total: 0,
        active: 0,
        paused: 0,
        totalViews: 0,
        avgRating: 0,
      };
    }
    const total = listings.length;
    const active = listings.filter((l) => l.available).length;
    const paused = total - active;
    const totalViews = listings.reduce((sum, l) => sum + (l.viewCount || 0), 0);
    const avgRating =
      listings.reduce((sum, l) => sum + (l.averageRating || 0), 0) / total;
    return {
      total,
      active,
      paused,
      totalViews,
      avgRating,
    };
  }, [listings]);

  const filteredAndSorted = useMemo(() => {
    let data = [...listings];

    if (statusFilter === "active") {
      data = data.filter((l) => l.available);
    } else if (statusFilter === "paused") {
      data = data.filter((l) => !l.available);
    }

    if (verifiedOnly) {
      data = data.filter((l) => l.verified?.status);
    }

    data.sort((a, b) => {
      if (sortBy === "views") {
        return (b.viewCount || 0) - (a.viewCount || 0);
      }
      if (sortBy === "price") {
        return (b.price || 0) - (a.price || 0);
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return data;
  }, [listings, statusFilter, verifiedOnly, sortBy]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              My Listings
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              Manage your properties and track their performance.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/owner/listings/add")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold shadow-md hover:bg-primary/90"
          >
            <PlusCircle size={16} />
            <span>Add New Listing</span>
          </button>
        </div>

        {/* Owner stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              Active listings
            </p>
            <p className="mt-2 text-2xl font-black text-slate-900">
              {stats.active}{" "}
              <span className="text-sm font-semibold text-slate-400">
                / {stats.total}
              </span>
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              Total views
            </p>
            <p className="mt-2 text-2xl font-black text-slate-900">
              {stats.totalViews.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              Average rating
            </p>
            <p className="mt-2 text-2xl font-black text-slate-900">
              {stats.avgRating.toFixed(1)}
              <span className="text-sm font-semibold text-slate-400 ml-1">
                / 5
              </span>
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              Paused listings
            </p>
            <p className="mt-2 text-2xl font-black text-slate-900">
              {stats.paused}
            </p>
          </div>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <FilterChip
              label="All Listings"
              active={statusFilter === "all" && !verifiedOnly}
              onClick={() => {
                setStatusFilter("all");
                setVerifiedOnly(false);
              }}
            />
            <FilterChip
              label="Active Only"
              active={statusFilter === "active"}
              onClick={() => setStatusFilter("active")}
            />
            <FilterChip
              label="Paused"
              active={statusFilter === "paused"}
              onClick={() => setStatusFilter("paused")}
            />
            <FilterChip
              label="Verified Only"
              active={verifiedOnly}
              onClick={() => setVerifiedOnly((v) => !v)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase">
              Sort by
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm font-medium border border-slate-200 rounded-xl px-3 py-1.5 bg-white"
            >
              <option value="createdAt">Newest</option>
              <option value="views">Most views</option>
              <option value="price">Highest price</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-primary" size={40} />
            <p className="text-slate-500 font-medium">
              Loading your listings...
            </p>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-6 rounded-3xl text-center font-bold">
            {error}
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500 text-lg font-bold mb-2">
              You don&apos;t have any listings yet.
            </p>
            <p className="text-slate-400 text-sm mb-6">
              Create your first listing to start receiving booking requests.
            </p>
            <button
              type="button"
              onClick={() => navigate("/owner/listings/add")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold shadow-md hover:bg-primary/90"
            >
              <PlusCircle size={16} />
              <span>Add New Listing</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredAndSorted.map((house) => (
              <div
                key={house._id}
                className={
                  updatingId === house._id
                    ? "opacity-60 pointer-events-none"
                    : ""
                }
              >
                <OwnerListingCard
                  house={house}
                  onToggleAvailability={handleToggleAvailability}
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default OwnerListings;
