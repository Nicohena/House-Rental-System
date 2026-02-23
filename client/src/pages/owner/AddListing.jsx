import React, { useState, useEffect } from "react"; // Hook import
import "./AddListing.css"; // Ensure this imports the updated CSS
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { houseService } from "../../api/houseService";
import { useNavigate } from "react-router-dom";
// Assuming you have an Icon component or similar library.
// If not, I'll use simple spans or standard emojis/svgs as placeholders for icons
// Since the HTML used "iconify-icon", we might need to install a library or use a CDN script.
// For now, I will assume we can replace them with lucide-react icons if available, or just leave the custom elements if the script is in index.html.
// But wait, React doesn't like custom elements without some handling. I'll use Lucide React icons for better integration if available,
// or just standard SVGs. Let's check package.json first for icon libraries.
// Checking package.json... I don't want to use another tool call just for that.
// I'll stick to safe standard implementation. The user's HTML snippet included a script for iconify.
// I'll assume that script is globally available or I should use lucide-react if I see it in imports elsewhere.
// But wait, the user provided a script tag in the HTML: <script src="https://code.iconify.design/iconify-icon/3.0.0/iconify-icon.min.js"></script>
// I should add that to index.html as well for the custom element <iconify-icon> to work.

import {
  ArrowLeft,
  Check,
  ChevronDown,
  MapPin,
  UploadCloud,
  X,
  Home,
  LayoutDashboard,
  Building2,
  CalendarCheck,
  MessageSquare,
  Wallet,
  Settings,
  MoreVertical,
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { getImageUrl } from "../../utils/imageUtils";


// Fix for default marker icon issues in React/Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Component to handle map clicks and location updates
const LocationMarker = ({ position, setPosition, setFormData }) => {
  const map = useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);

      // Reverse Geocoding via backend proxy (avoids CORS)
      const API_URL =
        import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      fetch(`${API_URL}/geocode/reverse?lat=${lat}&lon=${lng}`)
        .then((res) => res.json())
        .then((data) => {
          const address = data.address || {};
          setFormData((prev) => ({
            ...prev,
            address: data.display_name
              ? data.display_name.split(",")[0]
              : prev.address,
            city: address.city || address.town || address.village || prev.city,
            state: address.state || prev.state,
            zip: address.postcode || prev.zip,
          }));
        })
        .catch((err) => console.error("Reverse geocoding failed", err));
    },
  });

  return position === null ? null : <Marker position={position}></Marker>;
};

// Component to update map center when external state changes
const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 13);
    }
  }, [center, map]);
  return null;
};

const AddListing = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    propertyType: "Apartment",
    price: "",
    bedrooms: 2,
    bathrooms: 2,
    size: 1100,
    maxOccupants: 4,
    address: "",
    city: "Addis Ababa",
    state: "Addis Ababa",
    zip: "",
    amenities: [],
    images: [],
  });

  // Map state
  const [mapCenter, setMapCenter] = useState([9.005401, 38.763611]); // Default: Addis Ababa
  const [markerPosition, setMarkerPosition] = useState([9.005401, 38.763611]);

  const amenitiesList = [
    "Wi-Fi",
    "Air Conditioning",
    "Swimming Pool",
    "Dishwasher",
    "Parking Spot",
    "Gym",
    "Pet Friendly",
    "Balcony",
    "Washer/Dryer",
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Debounce logic for city update could be added here,
  // but for simplicity using onBlur or explicit check
  const handleCityBlur = () => {
    if (formData.city) {
      const API_URL =
        import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      fetch(`${API_URL}/geocode/search?q=${encodeURIComponent(formData.city)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.length > 0) {
            const { lat, lon } = data[0];
            const newCenter = [parseFloat(lat), parseFloat(lon)];
            setMapCenter(newCenter);
            setMarkerPosition(newCenter);
          }
        })
        .catch((err) => console.error("Forward geocoding failed", err));
    }
  };

  const handleAmenityToggle = (amenity) => {
    setFormData((prev) => {
      const isSelected = prev.amenities.includes(amenity);
      if (isSelected) {
        return {
          ...prev,
          amenities: prev.amenities.filter((a) => a !== amenity),
        };
      } else {
        return { ...prev, amenities: [...prev.amenities, amenity] };
      }
    });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const uploadData = new FormData();
    files.forEach((file) => {
      uploadData.append("images", file);
    });

    try {
      setLoading(true);
      console.log("Starting image upload for", files.length, "files");
      const response = await houseService.uploadImages(uploadData);
      console.log("Upload response:", response.data);

      const uploadedPaths = response.data.data || [];

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...uploadedPaths],
      }));
    } catch (error) {
      console.error("Image upload failed:", error);
      alert(
        "Image upload failed: " +
          (error.response?.data?.message || error.message || "Unknown error"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Client-side validation to prevent 422 errors
    const missing = [];
    if (!formData.title.trim()) missing.push("Property Title");
    if (!formData.description.trim()) missing.push("Description");
    if (!formData.price) missing.push("Monthly Rent");
    if (!formData.address.trim())
      missing.push("Street Address (click the map to set it)");
    if (!formData.city.trim()) missing.push("City");
    if (!formData.state.trim()) missing.push("State / Province");
    if (missing.length > 0) {
      alert(
        `Please fill in the following required fields:\n• ${missing.join("\n• ")}`,
      );
      return;
    }

    setLoading(true);
    try {
      // Map frontend amenities to backend enums
      const amenityMapping = {
        "Wi-Fi": "wifi",
        "Air Conditioning": "ac",
        "Swimming Pool": "pool",
        Dishwasher: "dishwasher",
        "Parking Spot": "parking",
        Gym: "gym",
        "Pet Friendly": "pet-friendly",
        Balcony: "balcony",
        "Washer/Dryer": "laundry",
      };

      const payload = {
        title: formData.title,
        description: formData.description,
        price: Number(formData.price),
        propertyType: formData.propertyType.toLowerCase(),
        rooms: {
          bedrooms: Number(formData.bedrooms),
          bathrooms: Number(formData.bathrooms),
          totalRooms: Number(formData.bedrooms) + 2,
        },
        size: Number(formData.size),
        amenities: formData.amenities.map(
          (a) => amenityMapping[a] || a.toLowerCase(),
        ),
        location: {
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip: formData.zip || "00000",
          country: "Ethiopia", // Updated default
          coordinates: {
            type: "Point",
            coordinates: [markerPosition[1], markerPosition[0]], // Longitude, Latitude
          },
        },
        images: formData.images.map((url, index) => ({
          url,
          isPrimary: index === 0,
        })),
        available: true,
        rules: {
          maxOccupants: Number(formData.maxOccupants),
        },
      };

      await houseService.createHouse(payload);
      alert("Listing created successfully!");
      navigate("/owner/listings");
    } catch (error) {
      console.error("Failed to create listing:", error);
      alert("Failed to create listing. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto pb-12">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <h1 className="text-2xl font-bold text-slate-900">
              Add New Property
            </h1>
          </div>
          <div className="text-sm text-slate-500">Draft saved 2m ago</div>
        </div>

        {/* Scrollable Form Area */}
        <div className="scroll-area">
          <div className="form-container">
            {/* General Info */}
            <div className="section-card">
              <div className="section-header">
                <div className="section-title">Basic Information</div>
                <div className="section-desc">
                  Key details about your property.
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label className="label">Property Title</label>
                  <input
                    type="text"
                    name="title"
                    className="input-field"
                    placeholder="e.g. Modern Loft in Downtown"
                    value={formData.title}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group full-width">
                  <label className="label">Description</label>
                  <textarea
                    name="description"
                    className="input-field"
                    placeholder="Describe the unique features of your property..."
                    value={formData.description}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Property Type</label>
                  <div style={{ position: "relative" }}>
                    <select
                      name="propertyType"
                      className="input-field"
                      style={{ width: "100%", appearance: "none" }}
                      value={formData.propertyType}
                      onChange={handleInputChange}
                    >
                      <option value="Apartment">Apartment</option>
                      <option value="House">House</option>
                      <option value="Condo">Condo</option>
                      <option value="Townhouse">Townhouse</option>
                      <option value="Studio">Studio</option>
                      <option value="Room">Room</option>
                    </select>
                    <ChevronDown
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "12px",
                        pointerEvents: "none",
                        color: "var(--muted-foreground)",
                      }}
                      size={16}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="label">Monthly Rent ($)</label>
                  <input
                    type="number"
                    name="price"
                    className="input-field"
                    placeholder="2400"
                    value={formData.price}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            {/* Property Specs */}
            <div className="section-card">
              <div className="section-header">
                <div className="section-title">Property Details</div>
                <div className="section-desc">
                  Specify the size and capacity.
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="label">Bedrooms</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="number"
                      name="bedrooms"
                      className="input-field"
                      value={formData.bedrooms}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="label">Bathrooms</label>
                  <input
                    type="number"
                    name="bathrooms"
                    className="input-field"
                    value={formData.bathrooms}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Square Footage</label>
                  <input
                    type="number"
                    name="size"
                    className="input-field"
                    value={formData.size}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Max Occupancy</label>
                  <input
                    type="number"
                    name="maxOccupants"
                    className="input-field"
                    value={formData.maxOccupants}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="section-card">
              <div className="section-header">
                <div className="section-title">Location</div>
                <div className="section-desc">
                  Where is the property located?
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label className="label">Street Address</label>
                  <input
                    type="text"
                    name="address"
                    className="input-field"
                    placeholder="123 Main St"
                    value={formData.address}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label className="label">City</label>
                  <input
                    type="text"
                    name="city"
                    className="input-field"
                    value={formData.city}
                    onChange={handleInputChange}
                    onBlur={handleCityBlur}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCityBlur();
                      }
                    }}
                  />
                </div>
                <div className="form-group">
                  <label className="label">State / Province</label>
                  <input
                    type="text"
                    name="state"
                    className="input-field"
                    value={formData.state}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group full-width">
                  <label className="label">Pin Location on Map</label>
                  <div className="map-placeholder" style={{ zIndex: 0 }}>
                    {/* Leaflet Map */}
                    <MapContainer
                      center={mapCenter}
                      zoom={13}
                      style={{ height: "100%", width: "100%" }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker position={markerPosition} />
                      <LocationMarker
                        position={markerPosition}
                        setPosition={setMarkerPosition}
                        setFormData={setFormData}
                      />
                      <MapUpdater center={mapCenter} />
                    </MapContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* Amenities */}
            <div className="section-card">
              <div className="section-header">
                <div className="section-title">Amenities</div>
                <div className="section-desc">Select all that apply.</div>
              </div>
              <div className="amenities-grid">
                {amenitiesList.map((amenity) => (
                  <div
                    key={amenity}
                    className={`checkbox-group ${
                      formData.amenities.includes(amenity) ? "checked" : ""
                    }`}
                    onClick={() => handleAmenityToggle(amenity)}
                  >
                    <div className="checkbox-custom">
                      <Check size={14} />
                    </div>
                    <span style={{ fontSize: "14px" }}>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Photos */}
            <div className="section-card">
              <div className="section-header">
                <div className="section-title">Photos</div>
                <div className="section-desc">Upload at least 5 photos.</div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "16px",
                  marginBottom: "16px",
                }}
              >
                {/* PREVIEW IMAGES */}
                {formData.images.map((img, index) => (
                  <div
                    key={index}
                    style={{
                      aspectRatio: "4/3",
                      position: "relative",
                      borderRadius: "8px",
                      overflow: "hidden",
                    }}
                  >
                    <img
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                      src={getImageUrl(img)}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: "4px",
                        right: "4px",
                        background: "rgba(0, 0, 0, 0.5)",
                        width: "24px",
                        height: "24px",
                        borderRadius: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          images: prev.images.filter((_, i) => i !== index),
                        }));
                      }}
                    >
                      <X size={14} />
                    </div>
                    {index === 0 && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: "4px",
                          left: "4px",
                          background: "var(--primary)",
                          color: "white",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontSize: "10px",
                          fontWeight: "600",
                        }}
                      >
                        Cover
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div
                className="upload-area"
                onClick={() => document.getElementById("file-upload").click()}
              >
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleImageUpload}
                />
                <div className="upload-icon">
                  <UploadCloud size={24} />
                </div>
                <div
                  style={{
                    fontWeight: "500",
                    fontSize: "15px",
                    marginBottom: "4px",
                  }}
                >
                  Click to upload or drag and drop
                </div>
                <div
                  style={{ fontSize: "13px", color: "var(--muted-foreground)" }}
                >
                  SVG, PNG, JPG or GIF (max. 800x400px)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="actions-footer">
          <button className="btn btn-secondary">Save as Draft</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              "Publishing..."
            ) : (
              <>
                <Check size={16} />
                Publish Listing
              </>
            )}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AddListing;
