import React, { useState, useEffect, useMemo } from "react";
import {
  Star,
  Share,
  Heart,
  MapPin,
  ShieldCheck,
  Calendar,
  Wifi,
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
import recommendationService from "../../api/recommendationService";
import { HouseCard } from "../../components/pieces/HouseCard";
import PaymentModal from "../../components/payment/PaymentModal";
import userService from "../../api/userService";
import toast from "react-hot-toast";

// Extracted sub-components
import {
  PhotoGrid,
  PropertyDetails,
  HouseRules,
  HostSection,
  ReviewsSection,
  PropertyMapModal,
} from "../../components/details";
import BookingWidget from "../../components/booking/BookingWidget";

// DetailsPage — main component
// ─────────────────────────────────────────────────────────────
const DetailsPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [currentBooking, setCurrentBooking] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [similarHouses, setSimilarHouses] = useState([]);
  const [showMap, setShowMap] = useState(false);

  // Rating states
  const [ratingScore, setRatingScore] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingLoading, setRatingLoading] = useState(false);

  // Fetch house details
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
        // Correctly access response.data.similar from backend
        setSimilarHouses(response.data?.similar || response.data?.houses || []);
      } catch (err) {
        setSimilarHouses([]);
      }
    };
    fetchSimilar();
  }, [id]);

  // ── Fix #2: Optimized dependency — only re-run when house ID changes ──
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
  }, [user, data?.house?._id]);

  // ── Fix #6: Detect if user is the owner ──
  const isOwner = user?.id === data?.house?.ownerId?._id;

  // ── Fix #9: Memoize similar houses slice ──
  const displayedSimilarHouses = useMemo(
    () => (Array.isArray(similarHouses) ? similarHouses.slice(0, 3) : []),
    [similarHouses],
  );

  // ── Fixes #1, #3, #4: Cleaned handleBookingRequest ──
  const handleBookingRequest = async () => {
    // Logic moved to BookingWidget.jsx
  };

  const handleStartChat = () => {
    if (!user) {
      alert("Please login to chat with the host");
      return;
    }

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
        toast.success("Removed from saved homes");
      } else {
        await userService.addSavedHome(user.id, data.house._id);
        setIsSaved(true);
        toast.success("Added to saved homes");
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

  // ── Loading / Error states ──
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

  // ── Fix #3 helper: Build full address string with optional chaining ──
  const fullAddress = [
    house.location?.address,
    house.location?.city,
    house.location?.state,
    house.location?.zip,
    house.location?.country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="bg-white min-h-screen pb-20">
      {/* ── Navigation Bar ── */}
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
                    title: house?.title || "SmartRent Home",
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
        {/* ── Title & Badges ── */}
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
              {/* ── Fix #7: Clickable address opens map modal ── */}
              <button
                type="button"
                onClick={() => setShowMap(true)}
                className="flex items-center gap-1 text-slate-500 font-bold hover:text-primary transition-colors group"
              >
                <MapPin size={14} />
                <span className="underline group-hover:text-primary">
                  {fullAddress}
                </span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {matchScore && <SmartMatchBadge percentage={matchScore} />}
            <FairPriceBadge score={priceFairness?.score} />
          </div>
        </div>

        {/* ── Photo Grid ── */}
        <PhotoGrid images={house.images} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          <div className="lg:col-span-2 space-y-12">
            {/* ── Host Header ── */}
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
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* ── Highlights ── */}
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

            {/* ── Description ── */}
            <div className="space-y-6 pt-12 border-t border-slate-100">
              <p className="text-slate-600 leading-relaxed font-medium">
                {house.description}
              </p>
            </div>

            {/* ── Property Details (extracted) ── */}
            <PropertyDetails house={house} />

            {/* ── Amenities ── */}
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
              {house.amenities?.length > 6 && (
                <button className="mt-10 px-8 py-3 border border-slate-900 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors">
                  Show all {house.amenities?.length} amenities
                </button>
              )}
            </div>

            {/* ── House Rules (extracted) ── */}
            <HouseRules rules={house.rules} />

            {/* ── Host Section (extracted) ── */}
            <HostSection owner={house.ownerId} onStartChat={handleStartChat} />

            {/* ── Reviews Section (extracted) ── */}
            <ReviewsSection
              ratings={house.ratings}
              averageRating={house.averageRating}
              user={user}
              ratingScore={ratingScore}
              setRatingScore={setRatingScore}
              ratingHover={ratingHover}
              setRatingHover={setRatingHover}
              ratingComment={ratingComment}
              setRatingComment={setRatingComment}
              ratingLoading={ratingLoading}
              onSubmitRating={handleSubmitRating}
            />
          </div>

          {/* ── Booking Widget (sidebar) ── */}
          <div className="relative">
            <BookingWidget house={house} user={user} />
          </div>
        </div>

        {/* ── Similar Properties (memoized) ── */}
        {displayedSimilarHouses.length > 0 && (
          <div className="mt-16 mb-12">
            <h2 className="text-2xl font-black text-slate-900 mb-8">
              Similar Properties
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {displayedSimilarHouses.map((h) => (
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

      {/* ── Property Map Modal ── */}
      <PropertyMapModal
        isOpen={showMap}
        onClose={() => setShowMap(false)}
        location={house.location}
      />

      {/* ── Payment Modal ── */}
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
