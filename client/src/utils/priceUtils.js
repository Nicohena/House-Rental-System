/**
 * Price Calculation Utilities
 */

/**
 * Gets the number of days in a given month/year
 * @param {Date} date 
 * @returns {number}
 */
export const getDaysInMonth = (date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

/**
 * Calculates total price based on starting month's daily rate
 * @param {number} basePrice - Monthly price
 * @param {Date|string} startDate 
 * @param {Date|string} endDate 
 * @param {number} serviceFee - Fixed service fee
 * @returns {Object} { subtotal, total, diffDays }
 */
export const calculateTotalPrice = (basePrice, startDate, endDate, serviceFee = 350) => {
  if (!basePrice || !startDate || !endDate) {
    return { subtotal: 0, total: 0, diffDays: 0 };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end <= start) {
    return { subtotal: 0, total: 0, diffDays: 0 };
  }

  const diffMs = end - start;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  // Use days in starting month for daily rate (consistency with backend)
  const daysInMonth = getDaysInMonth(start);
  const dailyRate = basePrice / daysInMonth;
  const subtotal = Math.round(dailyRate * diffDays);
  
  return {
    subtotal,
    total: subtotal + serviceFee,
    diffDays
  };
};

/**
 * Validates if a date range meets the minimum lease requirements
 * @param {Date|string} startDate 
 * @param {Date|string} endDate 
 * @param {number} minLeaseMonths 
 * @returns {boolean}
 */
export const validateMinLease = (startDate, endDate, minLeaseMonths) => {
  if (!minLeaseMonths) return true;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const diffMs = end - start;
  const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44); // Average month length
  
  return diffMonths >= minLeaseMonths;
};
