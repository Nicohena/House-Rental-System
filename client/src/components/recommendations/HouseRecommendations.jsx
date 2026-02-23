import React, { useState, useEffect } from "react";
import recommendationService from "../../api/recommendationService";
import { Link } from "react-router-dom";
import { getImageUrl } from "../../utils/imageUtils";

const HouseRecommendations = ({ userId, houseId, type = "personalized" }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, [userId, houseId, type]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      let data = [];
      if (type === "similar" && houseId) {
        data = await recommendationService.getSimilarHouses(houseId);
      } else if (userId) {
        data = await recommendationService.getRecommendations(userId);
      }
      setRecommendations(data.slice(0, 4)); // Show top 4
    } catch (err) {
      console.error("Failed to fetch recommendations", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return <div className="py-8 text-center">Loading recommendations...</div>;
  if (recommendations.length === 0) return null;

  return (
    <div className="py-10">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {type === "similar"
          ? "Similar Houses You Might Like"
          : "Recommended For You"}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {recommendations.map((house) => (
          <Link
            key={house._id}
            to={`/details/${house._id}`}
            className="group block bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow"
          >
            <div className="aspect-w-16 aspect-h-9 overflow-hidden">
              <img
                src={
                  house.images?.[0]
                    ? getImageUrl(house.images[0].url || house.images[0])
                    : "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=80"
                }
                alt={house.title}
                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 truncate">
                {house.title}
              </h3>
              <p className="text-gray-500 text-sm mt-1">
                {house.location?.city || house.location}
              </p>
              <div className="mt-3 flex justify-between items-center">
                <span className="text-blue-600 font-bold">
                  ETB {house.price}/mo
                </span>
                <span className="text-yellow-500 text-xs flex items-center">
                  ★ {house.averageRating?.toFixed(1) || "NEW"}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default HouseRecommendations;
