/**
 * Price Fairness Utility
 * 
 * Compares a house's price with similar properties in the area
 * to determine if the listing is fairly priced
 * 
 * Features:
 * - Compare with nearby listings
 * - Calculate percentile ranking
 * - Provide fairness assessment
 */

const House = require('../models/House');

/**
 * Get price fairness assessment for a house
 * 
 * @param {Object} house - House document
 * @returns {Object} - Price fairness data
 */
const getPriceFairness = async (house) => {
  if (!house || !house.price) {
    return {
      score: 50,
      label: 'Unknown',
      percentile: 50,
      comparison: null
    };
  }

  try {
    // Find comparable listings in the same area
    const comparables = await findComparableListings(house);

    if (comparables.length < 3) {
      return {
        score: 50,
        label: 'Insufficient Data',
        percentile: 50,
        comparison: {
          sampleSize: comparables.length,
          message: 'Not enough similar listings to compare'
        }
      };
    }

    // Calculate statistics
    const prices = comparables.map(h => h.price);
    const stats = calculatePriceStats(prices);

    // Calculate percentile of this house's price
    const percentile = calculatePercentile(house.price, prices);

    // Determine fairness score and label
    const { score, label } = assessFairness(house.price, stats, percentile);

    return {
      score,
      label,
      percentile,
      comparison: {
        sampleSize: comparables.length,
        averagePrice: stats.average,
        medianPrice: stats.median,
        minPrice: stats.min,
        maxPrice: stats.max,
        priceRange: `$${stats.min.toLocaleString()} - $${stats.max.toLocaleString()}`,
        yourPrice: house.price,
        priceDifference: house.price - stats.average,
        priceDifferencePercent: Math.round(((house.price - stats.average) / stats.average) * 100)
      }
    };
  } catch (error) {
    console.error('Error calculating price fairness:', error);
    return {
      score: 50,
      label: 'Error',
      percentile: 50,
      comparison: null
    };
  }
};

/**
 * Find comparable listings in the same area
 * 
 * @param {Object} house - House document
 * @returns {Array} - Array of comparable houses
 */
const findComparableListings = async (house) => {
  const query = {
    _id: { $ne: house._id },
    available: true,
    // Same general area
    $or: [
      { 'location.city': house.location.city },
      { 'location.state': house.location.state }
    ]
  };

  // Similar room count (±1 bedroom)
  if (house.rooms && house.rooms.bedrooms) {
    query['rooms.bedrooms'] = {
      $gte: Math.max(0, house.rooms.bedrooms - 1),
      $lte: house.rooms.bedrooms + 1
    };
  }

  // Same property type if available
  if (house.propertyType) {
    query.propertyType = house.propertyType;
  }

  // Find comparable listings
  const comparables = await House.find(query)
    .select('price rooms location propertyType')
    .limit(50);

  // Prioritize same city over same state
  const sameCity = comparables.filter(
    h => h.location.city?.toLowerCase() === house.location.city?.toLowerCase()
  );

  if (sameCity.length >= 5) {
    return sameCity;
  }

  return comparables;
};

/**
 * Calculate price statistics
 * 
 * @param {Array} prices - Array of prices
 * @returns {Object} - Statistics object
 */
const calculatePriceStats = (prices) => {
  const sorted = [...prices].sort((a, b) => a - b);
  const sum = prices.reduce((acc, p) => acc + p, 0);
  
  const average = sum / prices.length;
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];

  // Calculate standard deviation
  const squareDiffs = prices.map(p => Math.pow(p - average, 2));
  const avgSquareDiff = squareDiffs.reduce((acc, d) => acc + d, 0) / prices.length;
  const stdDev = Math.sqrt(avgSquareDiff);

  return {
    average: Math.round(average),
    median: Math.round(median),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    stdDev: Math.round(stdDev),
    count: prices.length
  };
};

/**
 * Calculate percentile of a value within a dataset
 * 
 * @param {number} value - Value to calculate percentile for
 * @param {Array} data - Dataset
 * @returns {number} - Percentile (0-100)
 */
const calculatePercentile = (value, data) => {
  const sorted = [...data].sort((a, b) => a - b);
  const below = sorted.filter(d => d < value).length;
  const equal = sorted.filter(d => d === value).length;
  
  const percentile = ((below + (0.5 * equal)) / sorted.length) * 100;
  return Math.round(percentile);
};

/**
 * Assess price fairness based on statistics
 * 
 * @param {number} price - House price
 * @param {Object} stats - Price statistics
 * @param {number} percentile - Price percentile
 * @returns {Object} - Fairness score and label
 */
const assessFairness = (price, stats, percentile) => {
  // Calculate z-score (how many standard deviations from mean)
  const zScore = stats.stdDev > 0 
    ? (price - stats.average) / stats.stdDev 
    : 0;

  let score;
  let label;

  // Determine fairness based on percentile and z-score
  if (percentile <= 20) {
    score = 95;
    label = 'Great Deal';
  } else if (percentile <= 40) {
    score = 85;
    label = 'Good Value';
  } else if (percentile <= 60) {
    score = 75;
    label = 'Fair Price';
  } else if (percentile <= 80) {
    score = 55;
    label = 'Above Average';
  } else if (percentile <= 90) {
    score = 40;
    label = 'Premium Price';
  } else {
    score = 25;
    label = 'High End';
  }

  // Adjust for extreme outliers
  if (Math.abs(zScore) > 2) {
    if (zScore < 0) {
      // Unusually cheap - might be a great deal or suspicious
      score = Math.min(score, 90);
      label = 'Unusually Low';
    } else {
      // Unusually expensive
      score = Math.max(20, score - 20);
      label = 'Overpriced';
    }
  }

  return { score, label };
};

/**
 * Get price comparison for a specific location
 * 
 * @param {string} city - City name
 * @param {string} state - State name
 * @param {number} bedrooms - Number of bedrooms
 * @returns {Object} - Location price statistics
 */
const getLocationPriceStats = async (city, state, bedrooms = null) => {
  const query = {
    available: true,
    $or: [
      { 'location.city': new RegExp(city, 'i') },
      { 'location.state': new RegExp(state, 'i') }
    ]
  };

  if (bedrooms) {
    query['rooms.bedrooms'] = bedrooms;
  }

  const houses = await House.find(query).select('price rooms');

  if (houses.length === 0) {
    return null;
  }

  const prices = houses.map(h => h.price);
  return calculatePriceStats(prices);
};

module.exports = {
  getPriceFairness,
  findComparableListings,
  calculatePriceStats,
  calculatePercentile,
  getLocationPriceStats
};
