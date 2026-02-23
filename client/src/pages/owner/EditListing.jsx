import React, { useState, useEffect } from "react";
import "./AddListing.css";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { houseService } from "../../api/houseService";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  UploadCloud,
  X,
  Loader2,
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

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const LocationMarker = ({ position, setPosition, setFormData }) => {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
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
  return position === null ? null : <Marker position={position} />;
};

const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 13);
  }, [center, map]);
  return null;
};

const EditListing = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    city: "",
    state: "",
    zip: "",
    amenities: [],
    images: [],
  });

  const [mapCenter, setMapCenter] = useState([9.005401, 38.763611]);
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

  const backendToFrontendAmenity = {
    wifi: "Wi-Fi",
    ac: "Air Conditioning",
    pool: "Swimming Pool",
    dishwasher: "Dishwasher",
    parking: "Parking Spot",
    gym: "Gym",
    "pet-friendly": "Pet Friendly",
    balcony: "Balcony",
    laundry: "Washer/Dryer",
  };

  const frontendToBackendAmenity = {
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

  useEffect(() => {
    const fetchHouse = async () => {
      try {
        const response = await houseService.getHouseById(id);
        const house = response.data?.data?.house || response.data?.data;
        if (!house) throw new Error("House not found");

        const mappedAmenities = (house.amenities || []).map(
          (a) => backendToFrontendAmenity[a] || a,
        );

        setFormData({
          title: house.title || "",
          description: house.description || "",
          propertyType:
            (house.propertyType || "apartment").charAt(0).toUpperCase() +
            (house.propertyType || "apartment").slice(1),
          price: house.price || "",
          bedrooms: house.rooms?.bedrooms || 2,
          bathrooms: house.rooms?.bathrooms || 2,
          size: house.size || 0,
          maxOccupants: house.rules?.maxOccupants || 4,
          address: house.location?.address || "",
          city: house.location?.city || "",
          state: house.location?.state || "",
          zip: house.location?.zip || "",
          amenities: mappedAmenities,
          images: (house.images || []).map((img) => img.url || img),
        });

        if (house.location?.coordinates?.coordinates) {
          const [lng, lat] = house.location.coordinates.coordinates;
          setMapCenter([lat, lng]);
          setMarkerPosition([lat, lng]);
        }
      } catch (err) {
        console.error("Failed to fetch house", err);
        alert("Failed to load listing. It may no longer exist.");
        navigate("/owner/listings");
      } finally {
        setLoading(false);
      }
    };
    fetchHouse();
  }, [id, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

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
      return {
        ...prev,
        amenities: isSelected
          ? prev.amenities.filter((a) => a !== amenity)
          : [...prev.amenities, amenity],
      };
    });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const uploadData = new FormData();
    files.forEach((file) => uploadData.append("images", file));
    try {
      const response = await houseService.uploadImages(uploadData);
      const uploadedPaths = response.data.data || [];
      const newImages = uploadedPaths;
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...newImages],
      }));
    } catch (error) {
      console.error("Image upload failed:", error);
      alert("Failed to upload images.");
    }
  };

  const handleSubmit = async () => {
    const missing = [];
    if (!formData.title.trim()) missing.push("Property Title");
    if (!formData.description.trim()) missing.push("Description");
    if (!formData.price) missing.push("Monthly Rent");
    if (!formData.city.trim()) missing.push("City");
    if (!formData.state.trim()) missing.push("State / Province");
    if (missing.length > 0) {
      alert(`Please fill in: ${missing.join(", ")}`);
      return;
    }

    setSaving(true);
    try {
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
          (a) => frontendToBackendAmenity[a] || a.toLowerCase(),
        ),
        location: {
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip: formData.zip || "00000",
          country: "Ethiopia",
          coordinates: {
            type: "Point",
            coordinates: [markerPosition[1], markerPosition[0]],
          },
        },
        images: formData.images.map((url, index) => ({
          url,
          isPrimary: index === 0,
        })),
        rules: { maxOccupants: Number(formData.maxOccupants) },
      };

      await houseService.updateHouse(id, payload);
      alert("Listing updated successfully!");
      navigate("/owner/listings");
    } catch (error) {
      console.error("Failed to update listing:", error);
      alert(error.response?.data?.message || "Failed to update listing.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-blue-600" size={40} />
          <span className="ml-3 text-slate-600 font-medium">
            Loading listing...
          </span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto pb-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <h1 className="text-2xl font-bold text-slate-900">Edit Property</h1>
          </div>
        </div>

        <div className="scroll-area">
          <div className="form-container">
            {/* Basic Information */}
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
                    value={formData.title}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group full-width">
                  <label className="label">Description</label>
                  <textarea
                    name="description"
                    className="input-field"
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
                    value={formData.price}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            {/* Property Details */}
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
                  <input
                    type="number"
                    name="bedrooms"
                    className="input-field"
                    value={formData.bedrooms}
                    onChange={handleInputChange}
                  />
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
                    className={`checkbox-group ${formData.amenities.includes(amenity) ? "checked" : ""}`}
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
                <div className="section-desc">Manage your property photos.</div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "16px",
                  marginBottom: "16px",
                }}
              >
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
                      src={img}
                      alt={`Photo ${index + 1}`}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: "4px",
                        right: "4px",
                        background: "rgba(0,0,0,0.5)",
                        width: "24px",
                        height: "24px",
                        borderRadius: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        cursor: "pointer",
                      }}
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          images: prev.images.filter((_, i) => i !== index),
                        }))
                      }
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
                onClick={() =>
                  document.getElementById("edit-file-upload").click()
                }
              >
                <input
                  id="edit-file-upload"
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
          <button
            className="btn btn-secondary"
            onClick={() => navigate("/owner/listings")}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              "Saving..."
            ) : (
              <>
                <Check size={16} /> Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EditListing;
