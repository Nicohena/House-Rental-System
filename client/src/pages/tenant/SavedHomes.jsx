import React, { useEffect, useState } from "react";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { HouseCard } from "../../components/pieces/HouseCard";
import { Loader2, Heart } from "lucide-react";
import userService from "../../api/userService";
import { useAuth } from "../../context/AuthContext";

const SavedHomesPage = () => {
  const { user } = useAuth();
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSavedHomes = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await userService.getSavedHomes(user.id);
        const list =
          response.data?.houses || response.data?.data?.houses || [];
        setHouses(list);
        setError(null);
      } catch (err) {
        console.error("Failed to load saved homes", err);
        setError(
          err.response?.data?.message ||
            "Failed to load your saved homes. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSavedHomes();
  }, [user]);

  const handleToggleSave = async (houseId) => {
    if (!user) return;
    try {
      await userService.removeSavedHome(user.id, houseId);
      setHouses((prev) => prev.filter((h) => h._id !== houseId));
    } catch (err) {
      console.error("Failed to remove saved home", err);
      alert(
        err.response?.data?.message ||
          "Something went wrong while removing this home.",
      );
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Heart className="text-primary" />
              <span>Saved Homes</span>
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              Quickly access homes you've favorited while exploring.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-primary" size={40} />
            <p className="text-slate-500 font-medium">
              Loading your saved homes...
            </p>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-6 rounded-3xl text-center font-bold">
            {error}
          </div>
        ) : houses.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500 text-lg font-bold mb-2">
              You have no saved homes yet.
            </p>
            <p className="text-slate-400 text-sm">
              Tap the heart icon while exploring to add homes here.
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
                  beds: house.rooms?.bedrooms,
                  sqft: house.size || 0,
                  verified: house.verified?.status,
                  match: house.matchScore,
                  isFair: house.price < 3000,
                  image: house.images?.[0]?.url,
                }}
                isSaved
                onToggleSave={handleToggleSave}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SavedHomesPage;

