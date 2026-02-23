import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getRedirectPath } from "../utils/auth";
import {
  Search,
  ShieldCheck,
  Zap,
  Scale,
  ArrowRight,
  Home,
  Loader2,
} from "lucide-react";
import { HouseCard } from "../components/pieces/HouseCard";
import { houseService } from "../api/houseService";

const FeatureCard = ({ icon: Icon, title, description }) => (
  <div className="p-8 rounded-3xl bg-white border border-slate-100 hover:shadow-xl transition-shadow group">
    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
      <Icon size={24} />
    </div>
    <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
    <p className="text-slate-500 leading-relaxed text-sm">{description}</p>
  </div>
);

const LandingPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [featuredHouses, setFeaturedHouses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      navigate(getRedirectPath(user.role));
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        setLoading(true);
        const response = await houseService.getHouses({
          limit: 3,
          sort: "-createdAt",
        });
        setFeaturedHouses(response.data.data.houses);
      } catch (err) {
        console.error("Failed to fetch featured houses", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatured();
  }, []);

  return (
    <div className="bg-white min-h-screen">
      {/* Navbar Overlay */}
      <nav className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
        <div
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-primary cursor-pointer"
        >
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <div className="w-6 h-6 bg-white rounded-sm" />
          </div>
          <span className="text-xl font-black italic tracking-tighter uppercase">
            SmartRent
          </span>
        </div>
        <div className="hidden md:flex items-center gap-10">
          <button
            onClick={() => navigate("/search")}
            className="text-sm font-bold text-slate-600 hover:text-primary transition-colors"
          >
            Explore
          </button>
          <a
            href="#features"
            className="text-sm font-bold text-slate-600 hover:text-primary transition-colors"
          >
            How it Works
          </a>
          <button
            onClick={() => navigate("/owner/dashboard")}
            className="text-sm font-bold text-slate-600 hover:text-primary transition-colors"
          >
            Landlords
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/login")}
            className="text-sm font-bold text-slate-900 px-6 py-2.5 hover:bg-slate-50 rounded-xl transition-all"
          >
            Log in
          </button>
          <button
            onClick={() => navigate("/register")}
            className="text-sm font-bold text-white bg-primary px-6 py-2.5 rounded-xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/25"
          >
            Sign up
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-8 pt-20 pb-32 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div className="space-y-10">
          <div className="inline-flex items-center gap-2 bg-primary/5 px-4 py-2 rounded-full border border-primary/10">
            <ShieldCheck size={16} className="text-primary" />
            <span className="text-xs font-bold text-primary tracking-wide uppercase">
              The #1 Trusted Smart Rental Platform
            </span>
          </div>
          <h1 className="text-6xl md:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight">
            Find a home that <br />
            <span className="text-primary italic">matches</span> your <br />
            lifestyle.
          </h1>
          <p className="text-slate-500 text-lg max-w-md leading-relaxed">
            Discover verified smart homes with transparent pricing and
            AI-powered match scores. Renting has never been this intelligent.
          </p>
          <div className="flex items-center gap-4 pt-4">
            <button
              onClick={() => navigate("/search")}
              className="px-8 py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary-dark transition-all flex items-center gap-2 shadow-xl shadow-primary/30"
            >
              Browse Properties
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => navigate("/owner/dashboard")}
              className="px-8 py-4 bg-white text-slate-900 font-bold rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all"
            >
              List Your Home
            </button>
          </div>
        </div>

        <div className="relative">
          <div className="aspect-[4/5] rounded-[40px] overflow-hidden shadow-2xl skew-y-1">
            <img
              src="https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&q=80&w=1200"
              className="w-full h-full object-cover"
              alt="Living Room"
            />
          </div>
          {/* Floating Indicators */}
          <div className="absolute top-1/4 -right-12 bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 flex items-center gap-4 animate-bounce-slow">
            <div className="w-12 h-12 bg-success/10 rounded-2xl flex items-center justify-center text-success">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Verified Host
              </p>
              <p className="text-sm font-black text-slate-900">Sarah Jenkins</p>
            </div>
          </div>
          <div className="absolute bottom-1/4 -left-12 bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 flex items-center gap-4 animate-pulse-slow">
            <div className="w-12 h-12 bg-warning/10 rounded-2xl flex items-center justify-center text-warning">
              <Zap size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                98% Match
              </p>
              <p className="text-sm font-black text-slate-900">
                Based on your preferences
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section id="features" className="bg-slate-50 py-32">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-4xl font-black text-slate-900 mb-6">
              Renting made simple & smart
            </h2>
            <p className="text-slate-500 italic">
              We use technology to remove friction from the rental process,
              ensuring safety and satisfaction for everyone.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={ShieldCheck}
              title="Verified Listings Only"
              description="Every home on SmartRent is physically verified by our team. Say goodbye to scams and misleading photos forever."
            />
            <FeatureCard
              icon={Zap}
              title="AI Match Score"
              description="Our smart algorithm analyzes your preferences to show you homes that match your lifestyle, commute, and budget."
            />
            <FeatureCard
              icon={Scale}
              title="Fair Price Guarantee"
              description="We analyze local market data to ensure you never overpay. If a listing is overpriced, we'll flag it for you instantly."
            />
          </div>
        </div>
      </section>

      {/* Trending Section */}
      <section className="py-32">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-center justify-between mb-16">
            <div>
              <h2 className="text-4xl font-black text-slate-900 mb-4">
                Trending smart homes
              </h2>
              <p className="text-slate-500 italic">
                Explore highly-rated properties newly added this week.
              </p>
            </div>
            <button
              onClick={() => navigate("/search")}
              className="text-sm font-bold text-primary flex items-center gap-2 hover:underline"
            >
              View all listings
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {loading ? (
              <div className="col-span-full flex flex-col items-center py-20 gap-4">
                <Loader2 className="animate-spin text-primary" size={40} />
                <p className="text-slate-500 font-medium">
                  Loading properties...
                </p>
              </div>
            ) : featuredHouses.length === 0 ? (
              <div className="col-span-full text-center py-20">
                <p className="text-slate-500 font-bold">
                  No trending homes yet.
                </p>
              </div>
            ) : (
              featuredHouses.map((house) => (
                <HouseCard
                  key={house._id}
                  house={{
                    id: house._id,
                    title: house.title,
                    location: `${house.location?.city || ""}, ${
                      house.location?.state || ""
                    }`,
                    price: house.price,
                    rating: house.averageRating || 0,
                    beds: house.rooms?.bedrooms || 0,
                    sqft: house.size || 0,
                    verified: house.verified?.status,
                    match: house.matchScore,
                    isFair: house.price < 5000,
                    image: house.images?.[0]?.url || house.images?.[0],
                  }}
                />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Owner CTA Section */}
      <section className="max-w-7xl mx-auto px-8 mb-32">
        <div className="relative rounded-[50px] overflow-hidden bg-slate-900 py-24 px-12 text-center">
          <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1560184897-ae75f418493e?auto=format&fit=crop&q=80&w=1200')] bg-cover bg-center" />
          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-5xl font-black text-white mb-8">
              Are you a property owner?
            </h2>
            <p className="text-slate-300 text-lg mb-12">
              Join thousands of landlords who trust SmartRent to manage their
              properties. Get verified tenants, automated payments, and
              real-time market insights.
            </p>
            <button
              onClick={() => navigate("/owner/dashboard")}
              className="px-10 py-5 bg-white text-slate-900 font-bold rounded-2xl hover:bg-slate-100 transition-all shadow-2xl"
            >
              List Your Property for Free
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
            <div
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-primary cursor-pointer"
            >
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <div className="w-6 h-6 bg-white rounded-sm" />
              </div>
              <span className="text-xl font-black italic tracking-tighter uppercase">
                SmartRent
              </span>
            </div>
            <p className="text-slate-500 text-sm max-w-xs leading-relaxed text-center md:text-right">
              The smartest way to rent. Verified homes, fair prices, and happy
              tenants.
            </p>
          </div>
          <div className="pt-8 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium">
              © 2026 SmartRent Inc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
