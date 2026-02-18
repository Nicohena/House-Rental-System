/**
 * Smart Match Utility
 * 
 * Calculates match percentage between tenant preferences and house attributes
 * Uses weighted scoring for:
 * - Price match (25%)
 * - Location match (25%)
 * - Room count match (20%)
 * - Amenities match (20%)
 * - Additional factors (10%)
 */

/**
 * Calculate the smart match score between user preferences and a house
 * 
 * @param {Object} preferences - User preferences object
 * @param {Object} house - House document
 * @param {boolean} includeReasons - Whether to return reasons for the score
 * @returns {number|Object} - Match score (0-100) or { score, reasons }
 */
const calculateSmartMatch = (preferences, house, includeReasons = false) => {
  if (!preferences || !house) {
    return includeReasons ? { score: 0, reasons: [] } : 0;
  }

  const weights = {
    price: 25,
    location: 25,
    rooms: 20,
    amenities: 20,
    bonus: 10
  };

  let totalScore = 0;
  const reasons = [];

  // ===== PRICE MATCH (25 points) =====
  const priceScore = calculatePriceMatch(preferences, house.price);
  totalScore += priceScore * (weights.price / 100);
  if (priceScore >= 80) {
    reasons.push('price_match');
  }

  // ===== LOCATION MATCH (25 points) =====
  const locationScore = calculateLocationMatch(preferences, house.location);
  totalScore += locationScore * (weights.location / 100);
  if (locationScore >= 80) {
    reasons.push('location_match');
  }

  // ===== ROOMS MATCH (20 points) =====
  const roomsScore = calculateRoomsMatch(preferences, house.rooms);
  totalScore += roomsScore * (weights.rooms / 100);
  if (roomsScore >= 80) {
    reasons.push('rooms_match');
  }

  // ===== AMENITIES MATCH (20 points) =====
  const amenitiesScore = calculateAmenitiesMatch(preferences, house.amenities);
  totalScore += amenitiesScore * (weights.amenities / 100);
  if (amenitiesScore >= 80) {
    reasons.push('amenities_match');
  }

  // ===== BONUS FACTORS (10 points) =====
  let bonusScore = 0;
  
  // Verified listing bonus
  if (house.verified && house.verified.status) {
    bonusScore += 30;
    reasons.push('owner_verified');
  }

  // High rating bonus
  if (house.averageRating >= 4.0) {
    bonusScore += 30;
    reasons.push('highly_rated');
  }

  // Quick availability bonus
  if (house.available && (!house.availableFrom || new Date(house.availableFrom) <= new Date())) {
    bonusScore += 20;
    reasons.push('quick_availability');
  }

  // Popular listing bonus (high view count)
  if (house.viewCount > 100) {
    bonusScore += 20;
    reasons.push('trending');
  }

  totalScore += Math.min(bonusScore, 100) * (weights.bonus / 100);

  // Normalize to 0-100 range
  const finalScore = Math.round(Math.min(Math.max(totalScore, 0), 100));

  if (includeReasons) {
    return { score: finalScore, reasons };
  }

  return finalScore;
};

/**
 * Calculate price match score
 * @param {Object} preferences - User preferences with priceRange
 * @param {number} housePrice - House monthly price
 * @returns {number} - Score 0-100
 */
const calculatePriceMatch = (preferences, housePrice) => {
  const priceRange = preferences.priceRange;
  
  if (!priceRange || (!priceRange.min && !priceRange.max)) {
    return 50; // No preference, neutral score
  }

  const minPrice = priceRange.min || 0;
  const maxPrice = priceRange.max || 999999;
  const midPoint = (minPrice + maxPrice) / 2;

  // Perfect match - price is within range
  if (housePrice >= minPrice && housePrice <= maxPrice) {
    // Higher score if closer to midpoint
    const distanceFromMid = Math.abs(housePrice - midPoint);
    const rangeHalf = (maxPrice - minPrice) / 2;
    const proximity = 1 - (distanceFromMid / rangeHalf);
    return 80 + (proximity * 20); // 80-100
  }

  // Outside range - calculate penalty
  if (housePrice < minPrice) {
    const underPercent = (minPrice - housePrice) / minPrice;
    return Math.max(0, 70 - (underPercent * 100)); // Slightly under is okay
  }

  if (housePrice > maxPrice) {
    const overPercent = (housePrice - maxPrice) / maxPrice;
    return Math.max(0, 60 - (overPercent * 150)); // Over budget penalized more
  }

  return 50;
};

/**
 * Calculate location match score
 * @param {Object} preferences - User preferences with locations/coordinates
 * @param {Object} houseLocation - House location object
 * @returns {number} - Score 0-100
 */
const calculateLocationMatch = (preferences, houseLocation) => {
  if (!houseLocation) return 0;

  let score = 0;

  // Check preferred locations (city/state match)
  if (preferences.preferredLocations && preferences.preferredLocations.length > 0) {
    const cityMatch = preferences.preferredLocations.find(
      loc => loc.city?.toLowerCase() === houseLocation.city?.toLowerCase()
    );
    const stateMatch = preferences.preferredLocations.find(
      loc => loc.state?.toLowerCase() === houseLocation.state?.toLowerCase()
    );

    if (cityMatch) {
      score = 100;
    } else if (stateMatch) {
      score = 70;
    }
  } else {
    score = 50; // No preference
  }

  // Check coordinates distance if available (MAP INTEGRATION)
  if (
    preferences.preferredCoordinates &&
    preferences.preferredCoordinates.lat &&
    preferences.preferredCoordinates.lng &&
    houseLocation.coordinates &&
    houseLocation.coordinates.coordinates
  ) {
    const [houseLng, houseLat] = houseLocation.coordinates.coordinates;
    const distance = calculateDistance(
      preferences.preferredCoordinates.lat,
      preferences.preferredCoordinates.lng,
      houseLat,
      houseLng
    );

    const maxDistance = preferences.maxDistance || 50; // km

    if (distance <= maxDistance) {
      const proximityScore = 100 - ((distance / maxDistance) * 40);
      score = Math.max(score, proximityScore);
    } else {
      // Too far
      score = Math.max(0, score - 30);
    }
  }

  return score;
};

/**
 * Calculate rooms match score
 * @param {Object} preferences - User preferences with preferredRooms
 * @param {Object} houseRooms - House rooms object
 * @returns {number} - Score 0-100
 */
const calculateRoomsMatch = (preferences, houseRooms) => {
  if (!houseRooms) return 50;

  const prefRooms = preferences.preferredRooms;
  if (!prefRooms || (!prefRooms.min && !prefRooms.max)) {
    return 50; // No preference
  }

  const bedrooms = houseRooms.bedrooms || 1;
  const minRooms = prefRooms.min || 1;
  const maxRooms = prefRooms.max || 10;

  if (bedrooms >= minRooms && bedrooms <= maxRooms) {
    return 100; // Perfect match
  }

  // Calculate how far off
  if (bedrooms < minRooms) {
    const diff = minRooms - bedrooms;
    return Math.max(0, 80 - (diff * 20));
  }

  if (bedrooms > maxRooms) {
    const diff = bedrooms - maxRooms;
    return Math.max(0, 80 - (diff * 15)); // Extra rooms less penalized
  }

  return 50;
};

/**
 * Calculate amenities match score
 * @param {Object} preferences - User preferences with requiredAmenities
 * @param {Array} houseAmenities - House amenities array
 * @returns {number} - Score 0-100
 */
const calculateAmenitiesMatch = (preferences, houseAmenities) => {
  const required = preferences.requiredAmenities;
  
  if (!required || required.length === 0) {
    return 50; // No preference
  }

  if (!houseAmenities || houseAmenities.length === 0) {
    return 20; // House has no amenities but user wants some
  }

  // Calculate percentage of required amenities present
  const matched = required.filter(amenity => 
    houseAmenities.includes(amenity)
  ).length;

  const matchPercent = matched / required.length;
  return Math.round(matchPercent * 100);
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @param {number} lat1 - Latitude 1
 * @param {number} lng1 - Longitude 1
 * @param {number} lat2 - Latitude 2
 * @param {number} lng2 - Longitude 2
 * @returns {number} - Distance in kilometers
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (deg) => deg * (Math.PI / 180);

/**
 * Get top matching houses for a user
 * @param {Object} user - User document with preferences
 * @param {Array} houses - Array of house documents
 * @param {number} limit - Number of results to return
 * @returns {Array} - Sorted array of houses with match scores
 */
const getTopMatches = (user, houses, limit = 10) => {
  if (!user.preferences) {
    return houses.slice(0, limit);
  }

  const scored = houses.map(house => ({
    house,
    ...calculateSmartMatch(user.preferences, house, true)
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
};

module.exports = {
  calculateSmartMatch,
  calculateDistance,
  getTopMatches
};
