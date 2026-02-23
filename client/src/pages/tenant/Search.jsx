import React, { useState, useEffect } from "react";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { HouseCard } from "../../components/pieces/HouseCard";
import { Map as MapIcon, SlidersHorizontal, Loader2 } from "lucide-react";
import { houseService } from "../../api/houseService";
import userService from "../../api/userService";
import { useAuth } from "../../context/AuthContext";

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

const SearchPage = () => {
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    verified: false,
    minRooms: null,
    minPrice: null,
    maxPrice: null,
    amenities: [],
    smartMatchHigh: false,
  });
  const { user } = useAuth();
  const [savedHomeIds, setSavedHomeIds] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showAmenitiesModal, setShowAmenitiesModal] = useState(false);
  const [priceDraft, setPriceDraft] = useState({ min: "", max: "" });
  const [amenitiesDraft, setAmenitiesDraft] = useState([]);

  useEffect(() => {
    const fetchHouses = async () => {
      setLoading(true);
      try {
        const response = await houseService.getHouses({
          verified: filters.verified ? "true" : undefined,
          minRooms: filters.minRooms || undefined,
          minPrice: filters.minPrice || undefined,
          maxPrice: filters.maxPrice || undefined,
          amenities:
            filters.amenities && filters.amenities.length > 0
              ? filters.amenities.join(",")
              : undefined,
          sort: filters.smartMatchHigh ? "match" : "-createdAt",
        });
        let list = response.data.data.houses;

        if (filters.smartMatchHigh) {
          list = list.filter(
            (h) => typeof h.matchScore === "number" && h.matchScore >= 90
          );
        }

        setHouses(list);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch houses", err);
        setError("Failed to load properties. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchHouses();
  }, [filters]);

  // Load saved homes when user logs in
  useEffect(() => {
    const fetchSavedHomes = async () => {
      if (!user) {
        setSavedHomeIds([]);
        return;
      }
      try {
        const response = await userService.getSavedHomes(user.id);
        const ids = (response.data?.houses || response.data?.data?.houses || []).map(
          (h) => h._id
        );
        setSavedHomeIds(ids);
      } catch (err) {
        console.error("Failed to load saved homes", err);
      }
    };

    fetchSavedHomes();
  }, [user]);

  const handleToggleSave = async (houseId) => {
    if (!user) {
      alert("Please login to save homes");
      return;
    }

    try {
      setSavingId(houseId);
      const isSaved = savedHomeIds.includes(houseId);

      if (isSaved) {
        await userService.removeSavedHome(user.id, houseId);
        setSavedHomeIds((prev) => prev.filter((id) => id !== houseId));
      } else {
        await userService.addSavedHome(user.id, houseId);
        setSavedHomeIds((prev) => [...prev, houseId]);
      }
    } catch (err) {
      console.error("Failed to update saved home", err);
      alert(
        err.response?.data?.message ||
          "Something went wrong while updating your saved homes."
      );
    } finally {
      setSavingId(null);
    }
  };

  const toggleVerified = () => {
    setFilters((prev) => ({ ...prev, verified: !prev.verified }));
  };

  const toggleTwoPlusBeds = () => {
    setFilters((prev) => ({
      ...prev,
      minRooms: prev.minRooms === 2 ? null : 2,
    }));
  };

  const toggleSmartMatchHigh = () => {
    setFilters((prev) => ({
      ...prev,
      smartMatchHigh: !prev.smartMatchHigh,
    }));
  };

  const handleOpenPriceModal = () => {
    setPriceDraft({
      min: filters.minPrice?.toString() || "",
      max: filters.maxPrice?.toString() || "",
    });
    setShowPriceModal(true);
  };

  const handleApplyPrice = () => {
    setFilters((prev) => ({
      ...prev,
      minPrice: priceDraft.min ? Number(priceDraft.min) : null,
      maxPrice: priceDraft.max ? Number(priceDraft.max) : null,
    }));
    setShowPriceModal(false);
  };

  const AMENITY_OPTIONS = [
    "WiFi",
    "Parking",
    "Furnished",
    "Air Conditioning",
    "Laundry",
  ];

  const handleOpenAmenitiesModal = () => {
    setAmenitiesDraft(filters.amenities || []);
    setShowAmenitiesModal(true);
  };

  const handleToggleAmenity = (amenity) => {
    setAmenitiesDraft((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity]
    );
  };

  const handleApplyAmenities = () => {
    setFilters((prev) => ({
      ...prev,
      amenities: amenitiesDraft,
    }));
    setShowAmenitiesModal(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 relative pb-20">
        <div className="space-y-6">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Find your perfect stay
          </h1>

          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <FilterChip
              label="All Types"
              active={
                !filters.verified &&
                !filters.minRooms &&
                !filters.minPrice &&
                !filters.maxPrice &&
                (!filters.amenities || filters.amenities.length === 0) &&
                !filters.smartMatchHigh
              }
              onClick={() =>
                setFilters({
                  verified: false,
                  minRooms: null,
                  minPrice: null,
                  maxPrice: null,
                  amenities: [],
                  smartMatchHigh: false,
                })
              }
            />
            <FilterChip
              label="Verified Only"
              active={filters.verified}
              onClick={toggleVerified}
            />
            <FilterChip
              label={
                filters.minPrice || filters.maxPrice
                  ? `ETB ${filters.minPrice || 0} - ${filters.maxPrice || "∞"}`
                  : "Price Range"
              }
              active={!!(filters.minPrice || filters.maxPrice)}
              onClick={handleOpenPriceModal}
            />
            <FilterChip
              label="2+ Beds"
              active={filters.minRooms === 2}
              onClick={toggleTwoPlusBeds}
            />
            <FilterChip
              label={
                filters.amenities && filters.amenities.length > 0
                  ? `Amenities (${filters.amenities.length})`
                  : "Amenities"
              }
              active={filters.amenities && filters.amenities.length > 0}
              onClick={handleOpenAmenitiesModal}
            />
            <FilterChip
              label="Smart Match > 90%"
              active={filters.smartMatchHigh}
              onClick={toggleSmartMatchHigh}
            />
            <button
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              onClick={handleOpenPriceModal}
            >
              <SlidersHorizontal size={20} className="text-slate-600" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-primary" size={40} />
            <p className="text-slate-500 font-medium">
              Finding the best matches for you...
            </p>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-6 rounded-3xl text-center font-bold">
            {error}
          </div>
        ) : houses.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500 text-lg font-bold">
              No properties found matching your criteria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
            {houses.map((house) => (
              <HouseCard
                key={house._id}
                house={{
                  id: house._id,
                  title: house.title,
                  location: `${house.location.city}, ${house.location.state}`,
                  price: house.price,
                  rating: house.averageRating || 0,
                  beds: house.rooms.bedrooms,
                  sqft: house.size || 0,
                  verified: house.verified?.status,
                  match: house.matchScore,
                  isFair: house.price < 3000, // Placeholder logic for now
                  image: house.images?.[0]?.url,
                }}
                isSaved={savedHomeIds.includes(house._id)}
                onToggleSave={handleToggleSave}
              />
            ))}
          </div>
        )}

        <button
          className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full flex items-center gap-2 shadow-2xl hover:scale-105 transition-transform font-bold text-sm z-50"
          onClick={() => {
            if (!houses || houses.length === 0) {
              alert("No properties to show on the map yet.");
              return;
            }
            const first = houses[0];
            const loc = first.location || {};
            const query = `${loc.city || ""} ${loc.state || ""}`.trim();
            const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              query || "rental homes"
            )}`;
            window.open(url, "_blank");
          }}
        >
          <MapIcon size={18} />
          <span>Map View</span>
        </button>

        {/* Price Range Modal */}
        {showPriceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">
                Price Range (per month)
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Min price
                  </label>
                  <input
                    type="number"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={priceDraft.min}
                    onChange={(e) =>
                      setPriceDraft((prev) => ({
                        ...prev,
                        min: e.target.value,
                      }))
                    }
                    placeholder="e.g. 3000"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Max price
                  </label>
                  <input
                    type="number"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={priceDraft.max}
                    onChange={(e) =>
                      setPriceDraft((prev) => ({
                        ...prev,
                        max: e.target.value,
                      }))
                    }
                    placeholder="e.g. 12000"
                  />
                </div>
              </div>
              <div className="flex justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPriceDraft({ min: "", max: "" });
                    setFilters((prev) => ({
                      ...prev,
                      minPrice: null,
                      maxPrice: null,
                    }));
                    setShowPriceModal(false);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Clear
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPriceModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyPrice}
                    className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Amenities Modal */}
        {showAmenitiesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">
                Amenities
              </h2>
              <div className="grid grid-cols-1 gap-3 mb-6">
                {AMENITY_OPTIONS.map((amenity) => {
                  const checked = amenitiesDraft.includes(amenity);
                  return (
                    <label
                      key={amenity}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-primary focus:ring-primary/40"
                        checked={checked}
                        onChange={() => handleToggleAmenity(amenity)}
                      />
                      <span className="text-sm text-slate-700 font-medium">
                        {amenity}
                      </span>
                    </label>
                  );
                })}
              </div>
              <div className="flex justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAmenitiesDraft([]);
                    setFilters((prev) => ({
                      ...prev,
                      amenities: [],
                    }));
                    setShowAmenitiesModal(false);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Clear
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAmenitiesModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyAmenities}
                    className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SearchPage;
