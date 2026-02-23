import React, { useState, useEffect } from "react";
import {
  Star,
  Share,
  Heart,
  MapPin,
  ShieldCheck,
  Calendar,
  Users,
  Wifi,
  Monitor,
  Briefcase,
  Wind,
  WashingMachine,
  Coffee,
  MessageSquare,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { getImageUrl } from "../../utils/imageUtils";
import {
  SmartMatchBadge,
  FairPriceBadge,
} from "../../components/pieces/Badges";
import { useNavigate, useParams } from "react-router-dom";
import { houseService } from "../../api/houseService";
import { useAuth } from "../../context/AuthContext";
import bookingService from "../../api/bookingService";
import chatService from "../../api/chatService";
import recommendationService from "../../api/recommendationService";
import { HouseCard } from "../../components/pieces/HouseCard";
import PaymentModal from "../../components/payment/PaymentModal";
import userService from "../../api/userService";

const BookingWidget = ({
  price,
  rating,
  reviewsCount,
  onBook,
  loading,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  totalPrice,
}) => (
  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl sticky top-28 h-fit">
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-black text-slate-900">ETB {price}</span>
        <span className="text-sm text-slate-500 font-medium">/ month</span>
      </div>
      <div className="flex items-center gap-1">
        <Star size={14} className="fill-warning text-warning" />
        <span className="text-sm font-bold">{rating}</span>
        <span className="text-xs text-slate-400">({reviewsCount})</span>
      </div>
    </div>

    <div className="grid grid-cols-1 border border-slate-200 rounded-2xl mb-4 overflow-hidden">
      <div className="p-3 border-b border-slate-200 hover:bg-slate-50">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
          Check-in
        </p>
        <input
          type="date"
          value={startDate}
          min={new Date().toISOString().split("T")[0]}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full text-sm font-bold text-slate-900 bg-transparent outline-none cursor-pointer"
        />
      </div>
      <div className="p-3 hover:bg-slate-50">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
          Check-out
        </p>
        <input
          type="date"
          value={endDate}
          min={startDate || new Date().toISOString().split("T")[0]}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-full text-sm font-bold text-slate-900 bg-transparent outline-none cursor-pointer"
        />
      </div>
    </div>

    <button
      onClick={onBook}
      disabled={loading}
      className="w-full py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 mb-6 disabled:opacity-50"
    >
      {loading ? "Processing..." : "Request Booking"}
    </button>
    <p className="text-xs text-center text-slate-400 italic mb-6">
      You won't be charged yet
    </p>

    <div className="space-y-4 pt-4 border-t border-slate-100">
      <div className="flex justify-between text-sm">
        <span className="text-slate-600 underline">Subtotal</span>
        <span className="text-slate-900 font-medium font-mono">
          ETB {totalPrice.toLocaleString()}
        </span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-slate-600 underline">Service Fee</span>
        <span className="text-slate-900 font-medium font-mono">ETB 350</span>
      </div>
      <div className="flex justify-between pt-4 border-t border-slate-100">
        <span className="text-lg font-black text-slate-900">Total</span>
        <span className="text-lg font-black text-slate-900 font-mono">
          ETB {(totalPrice + 350).toLocaleString()}
        </span>
      </div>
    </div>
  </div>
);

const DetailsPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [currentBooking, setCurrentBooking] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [similarHouses, setSimilarHouses] = useState([]);

  // Rating states
  const [ratingScore, setRatingScore] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingLoading, setRatingLoading] = useState(false);

  // Booking states
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split("T")[0];
  });
  const [totalPrice, setTotalPrice] = useState(0);

  // Handle dynamic price calculation
  useEffect(() => {
    if (!data?.house?.price || !startDate || !endDate) return;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end > start) {
      const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      // Daily rate from monthly price
      const calculated = Math.round((data.house.price / 30) * diffDays);
      setTotalPrice(calculated);
    } else {
      setTotalPrice(0);
    }
  }, [startDate, endDate, data?.house?.price]);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const response = await houseService.getHouseById(id);
        setData(response.data.data);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch house details", err);
        setError("Property not found or server error.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  // Fetch similar properties
  useEffect(() => {
    const fetchSimilar = async () => {
      if (!id) return;
      try {
        const response = await recommendationService.getSimilarHouses(id);
        setSimilarHouses(response.data?.houses || response.data || []);
      } catch (err) {
        // Silently fail — section just won't show
      }
    };
    fetchSimilar();
  }, [id]);

  // Check if this house is already saved when user or data changes
  useEffect(() => {
    const checkSaved = async () => {
      if (!user || !data?.house?._id) {
        setIsSaved(false);
        return;
      }
      try {
        const response = await userService.getSavedHomes(user.id);
        const houses =
          response.data?.houses || response.data?.data?.houses || [];
        const savedIds = houses.map((h) => h._id);
        setIsSaved(savedIds.includes(data.house._id));
      } catch (err) {
        console.error("Failed to check saved state", err);
      }
    };

    checkSaved();
  }, [user, data]);

  const handleBookingRequest = async () => {
    if (!user) {
      alert("Please login to book a house");
      return;
    }

    try {
      setBookingLoading(true);

      if (new Date(endDate) <= new Date(startDate)) {
        alert("Check-out date must be after check-in date");
        return;
      }

      const bookingData = {
        houseId: id,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      };

      const response = await bookingService.createBooking(bookingData);
      setBookingLoading(false);
      toast.success(
        "Booking request sent! You can pay once the owner approves.",
      );
      // Defer payment until owner approves
      // setCurrentBooking(response.data.booking);
      // setShowPayment(true);
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to create booking";
      toast.error(errorMsg);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleStartChat = () => {
    if (!user) {
      alert("Please login to chat with the host");
      return;
    }

    // Navigate to chat with pre-filled user details/context
    navigate("/messages", {
      state: {
        owner: data.house.ownerId,
        houseId: data.house._id,
        initialMessage: `Hi, I'm interested in your property: ${data.house.title}`,
      },
    });
  };

  const handleToggleSave = async () => {
    if (!user) {
      alert("Please login to save homes");
      return;
    }

    if (!data?.house?._id) return;

    try {
      setSaving(true);
      if (isSaved) {
        await userService.removeSavedHome(user.id, data.house._id);
        setIsSaved(false);
      } else {
        await userService.addSavedHome(user.id, data.house._id);
        setIsSaved(true);
      }
    } catch (err) {
      console.error("Failed to update saved home", err);
      alert(
        err.response?.data?.message ||
          "Something went wrong while updating your saved homes.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitRating = async () => {
    if (!user) {
      alert("Please login to leave a review");
      return;
    }
    if (ratingScore === 0) {
      alert("Please select a star rating");
      return;
    }
    setRatingLoading(true);
    try {
      const response = await houseService.addRating(id, {
        score: ratingScore,
        comment: ratingComment,
      });
      // Update local data with the new rating
      setData((prev) => ({
        ...prev,
        house: {
          ...prev.house,
          ratings: response.data?.data?.house?.ratings || [
            ...prev.house.ratings,
            {
              tenantId: { _id: user.id, name: user.name, avatar: user.avatar },
              score: ratingScore,
              comment: ratingComment,
              createdAt: new Date(),
            },
          ],
          averageRating:
            response.data?.data?.house?.averageRating ||
            prev.house.averageRating,
        },
      }));
      setRatingScore(0);
      setRatingComment("");
      alert("Review submitted successfully!");
    } catch (err) {
      console.error("Failed to submit rating", err);
      alert(err.response?.data?.message || "Failed to submit review");
    } finally {
      setRatingLoading(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
        <Loader2 className="animate-spin text-primary" size={48} />
        <p className="text-slate-500 font-bold">Loading property details...</p>
      </div>
    );

  if (error || !data)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white p-8">
        <div className="bg-red-50 text-red-600 p-8 rounded-[40px] text-center max-w-md">
          <h2 className="text-2xl font-black mb-4">Oops!</h2>
          <p className="font-medium mb-6">{error}</p>
          <button onClick={() => navigate("/search")} className="btn-primary">
            Back to Search
          </button>
        </div>
      </div>
    );

  const { house, priceFairness, matchScore } = data;

  return (
    <div className="bg-white min-h-screen pb-20">
      <nav className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between border-b border-slate-50">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold transition-colors"
        >
          <ChevronLeft size={20} />
          <span>Back</span>
        </button>
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="p-2.5 hover:bg-slate-50 rounded-xl transition-colors"
            onClick={() => {
              if (navigator.share) {
                navigator
                  .share({
                    title: data?.house?.title || "SmartRent Home",
                    text: "Check out this property on SmartRent",
                    url: window.location.href,
                  })
                  .catch(() => {});
              } else {
                navigator.clipboard
                  .writeText(window.location.href)
                  .then(() => alert("Link copied to clipboard"))
                  .catch(() => alert("Unable to copy link"));
              }
            }}
          >
            <Share size={18} />
          </button>
          <button
            type="button"
            onClick={handleToggleSave}
            disabled={saving}
            className={`p-2.5 rounded-xl transition-colors ${
              isSaved
                ? "bg-red-50 text-red-500 hover:bg-red-100"
                : "hover:bg-slate-50"
            }`}
          >
            <Heart size={18} className={isSaved ? "fill-current" : ""} />
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 pt-10">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
              {house.title}
            </h1>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 font-bold">
                <Star size={14} className="fill-warning text-warning" />
                <span>{house.averageRating?.toFixed(1) || "0.0"}</span>
                <span className="text-slate-400 font-medium underline">
                  ({house.ratings?.length || 0} reviews)
                </span>
              </div>
              <div className="flex items-center gap-1 text-slate-500 font-bold">
                <MapPin size={14} />
                <span className="underline">
                  {house.location.city}, {house.location.state}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {matchScore && <SmartMatchBadge percentage={matchScore} />}
            <FairPriceBadge score={priceFairness?.score} />
          </div>
        </div>

        {/* Photo Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-4 h-[500px] mb-12 rounded-[32px] overflow-hidden">
          <div className="md:col-span-2 md:row-span-2">
            <img
              src={getImageUrl(
                house.images?.[0]?.url ||
                  house.images?.[0] ||
                  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=1200",
              )}
              className="w-full h-full object-cover hover:opacity-90 transition-opacity cursor-pointer"
              alt="Main"
            />
          </div>
          {house.images?.slice(1, 5).map((img, idx) => (
            <div key={idx} className="hidden md:block">
              <img
                src={getImageUrl(img.url || img)}
                className="w-full h-full object-cover hover:opacity-90 transition-opacity cursor-pointer"
                alt={`Small ${idx}`}
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          <div className="lg:col-span-2 space-y-12">
            <div className="flex justify-between items-center pb-8 border-b border-slate-100">
              <div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">
                  Entire {house.propertyType} hosted by {house.ownerId?.name}
                </h2>
                <p className="text-slate-500 font-medium">
                  {house.rooms?.bedrooms} bedrooms • {house.rooms?.bathrooms}{" "}
                  baths • {house.size?.toLocaleString()} sqft
                </p>
              </div>
              <div className="w-14 h-14 rounded-full bg-slate-100 overflow-hidden border-2 border-white shadow-md">
                <img
                  src={getImageUrl(
                    house.ownerId?.avatar ||
                      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100",
                  )}
                  alt="Host"
                />
              </div>
            </div>

            <div className="space-y-8">
              {house.verified?.status && (
                <div className="flex gap-4">
                  <ShieldCheck className="text-slate-400 shrink-0" size={24} />
                  <div>
                    <p className="font-bold text-slate-900">Verified Listing</p>
                    <p className="text-sm text-slate-500 font-medium">
                      This home has been physically verified by SmartRent
                      agents.
                    </p>
                  </div>
                </div>
              )}
              <div className="flex gap-4">
                <MapPin className="text-slate-400 shrink-0" size={24} />
                <div>
                  <p className="font-bold text-slate-900">Great Location</p>
                  <p className="text-sm text-slate-500 font-medium">
                    100% of recent guests gave the location a 5-star rating.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Calendar className="text-slate-400 shrink-0" size={24} />
                <div>
                  <p className="font-bold text-slate-900">
                    Free cancellation for 48 hours
                  </p>
                  <p className="text-sm text-slate-500 font-medium">
                    Get a full refund if you change your mind.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6 pt-12 border-t border-slate-100">
              <p className="text-slate-600 leading-relaxed font-medium">
                {house.description}
              </p>
              <button className="text-sm font-bold text-slate-900 underline">
                Show more
              </button>
            </div>

            <div className="pt-12 border-t border-slate-100">
              <h3 className="text-xl font-black text-slate-900 mb-8">
                What this place offers
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6">
                {house.amenities?.map((amenity, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-4 text-slate-600"
                  >
                    <Wifi size={22} className="shrink-0" />
                    <span className="font-medium">{amenity}</span>
                  </div>
                ))}
              </div>
              <button className="mt-10 px-8 py-3 border border-slate-900 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors">
                Show all {house.amenities?.length} amenities
              </button>
            </div>

            <div className="p-8 bg-slate-50 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden">
                  <img
                    src={getImageUrl(
                      house.ownerId?.avatar ||
                        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100",
                    )}
                    alt="Host"
                  />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">
                    Hosted by {house.ownerId?.name}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    User Rating: {house.ownerId?.rating?.average || "New"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleStartChat}
                className="px-8 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm flex items-center gap-2 hover:shadow-md transition-all"
              >
                <MessageSquare size={18} />
                <span>Chat with {house.ownerId?.name}</span>
              </button>
            </div>

            {/* Reviews & Ratings Section */}
            <div className="pt-12 border-t border-slate-100">
              <div className="flex items-center gap-3 mb-8">
                <Star className="text-yellow-400 fill-yellow-400" size={24} />
                <h3 className="text-xl font-black text-slate-900">
                  {house.averageRating?.toFixed(1) || "New"} ·{" "}
                  {house.ratings?.length || 0} review
                  {house.ratings?.length !== 1 ? "s" : ""}
                </h3>
              </div>

              {/* Existing Reviews */}
              {house.ratings?.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                  {house.ratings.map((review, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-2xl p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {review.tenantId?.name?.charAt(0)?.toUpperCase() ||
                            "?"}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">
                            {review.tenantId?.name || "Anonymous"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {new Date(review.createdAt).toLocaleDateString(
                              "en-US",
                              { month: "short", year: "numeric" },
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-0.5 mb-2">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={14}
                            className={
                              s <= review.score
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-slate-200"
                            }
                          />
                        ))}
                      </div>
                      {review.comment && (
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Submit Review Form */}
              {user && user.role === "tenant" && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6">
                  <h4 className="font-bold text-slate-900 mb-4">
                    Leave a Review
                  </h4>
                  <div className="flex gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRatingScore(s)}
                        onMouseEnter={() => setRatingHover(s)}
                        onMouseLeave={() => setRatingHover(0)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          size={28}
                          className={
                            s <= (ratingHover || ratingScore)
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-slate-200"
                          }
                        />
                      </button>
                    ))}
                    {ratingScore > 0 && (
                      <span className="ml-2 text-sm text-slate-500 self-center font-medium">
                        {ratingScore === 1
                          ? "Poor"
                          : ratingScore === 2
                            ? "Fair"
                            : ratingScore === 3
                              ? "Good"
                              : ratingScore === 4
                                ? "Very Good"
                                : "Excellent"}
                      </span>
                    )}
                  </div>
                  <textarea
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    placeholder="Tell others about your experience (optional)..."
                    rows={3}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none mb-4"
                  />
                  <button
                    onClick={handleSubmitRating}
                    disabled={ratingLoading || ratingScore === 0}
                    className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {ratingLoading ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <Star size={16} />
                    )}
                    Submit Review
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="relative">
            <BookingWidget
              price={house.price}
              rating={house.averageRating?.toFixed(1)}
              reviewsCount={house.ratings?.length}
              onBook={handleBookingRequest}
              loading={bookingLoading}
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              totalPrice={totalPrice}
            />
          </div>
        </div>

        {/* Similar Properties */}
        {similarHouses.length > 0 && (
          <div className="mt-16 mb-12">
            <h2 className="text-2xl font-black text-slate-900 mb-8">
              Similar Properties
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {similarHouses.slice(0, 3).map((h) => (
                <HouseCard
                  key={h._id}
                  house={{
                    id: h._id,
                    title: h.title,
                    location: `${h.location?.city || ""}, ${h.location?.state || ""}`,
                    price: h.price,
                    rating: h.averageRating || 0,
                    beds: h.rooms?.bedrooms || 0,
                    sqft: h.size || 0,
                    verified: h.verified?.status,
                    match: h.matchScore,
                    isFair: h.price < 5000,
                    image: h.images?.[0]?.url || h.images?.[0],
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {showPayment && (
        <PaymentModal
          booking={currentBooking}
          onClose={() => setShowPayment(false)}
          onSuccess={() => {
            setShowPayment(false);
            navigate("/payments");
          }}
        />
      )}
    </div>
  );
};

export default DetailsPage;
