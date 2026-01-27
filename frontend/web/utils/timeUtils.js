/**
 * Time Entry Utilities (Frontend)
 * Handles splitting time entries across midnight boundaries
 */

/**
 * Check if two dates are the same day
 */
function isSameDay(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Split a single time entry into multiple entries if it crosses midnight
 * @param {Object} entry - Time entry with clock_in and clock_out
 * @returns {Array} Array of entry segments, one per day
 */
export function splitEntryAtMidnight(entry) {
  if (!entry.clock_in) return [entry];
  
  const clockIn = new Date(entry.clock_in);
  const clockOut = entry.clock_out ? new Date(entry.clock_out) : new Date();
  
  // If same day, return as-is
  if (isSameDay(clockIn, clockOut)) {
    return [entry];
  }
  
  const segments = [];
  let currentStart = new Date(clockIn);
  
  while (!isSameDay(currentStart, clockOut)) {
    // End of current day (23:59:59.999)
    const endOfDay = new Date(currentStart);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Calculate what portion of break_minutes belongs to this segment
    const totalMinutes = (clockOut - clockIn) / 60000;
    const segmentMinutes = (endOfDay - currentStart) / 60000;
    const breakPortion = entry.break_minutes 
      ? Math.round((segmentMinutes / totalMinutes) * entry.break_minutes)
      : 0;
    
    segments.push({
      ...entry,
      clock_in: currentStart.toISOString(),
      clock_out: endOfDay.toISOString(),
      break_minutes: breakPortion,
      _split: true,
      _original_entry_id: entry.id,
    });
    
    // Start of next day (00:00:00.000)
    currentStart = new Date(endOfDay);
    currentStart.setDate(currentStart.getDate() + 1);
    currentStart.setHours(0, 0, 0, 0);
  }
  
  // Add final segment (from start of last day to clock_out)
  const remainingBreak = entry.break_minutes 
    ? entry.break_minutes - segments.reduce((sum, s) => sum + (s.break_minutes || 0), 0)
    : 0;
    
  segments.push({
    ...entry,
    clock_in: currentStart.toISOString(),
    clock_out: clockOut.toISOString(),
    break_minutes: Math.max(0, remainingBreak),
    _split: true,
    _original_entry_id: entry.id,
  });
  
  return segments;
}

/**
 * Split multiple time entries at midnight boundaries
 * @param {Array} entries - Array of time entries
 * @returns {Array} Array of entry segments with midnight splits
 */
export function splitEntriesAtMidnight(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.flatMap(entry => splitEntryAtMidnight(entry));
}

/**
 * Calculate hours for a specific date from entries (handles overnight shifts)
 * @param {Array} entries - Array of time entries
 * @param {Date|string} targetDate - The date to calculate hours for
 * @returns {number} Total hours worked on that date
 */
export function calculateHoursForDate(entries, targetDate) {
  if (!Array.isArray(entries)) return 0;
  
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  
  let totalMinutes = 0;
  
  entries.forEach(entry => {
    if (!entry.clock_in) return;
    
    const clockIn = new Date(entry.clock_in);
    const clockOut = entry.clock_out ? new Date(entry.clock_out) : new Date();
    
    // Get the overlap between this entry and the target date
    const dayStart = new Date(target);
    const dayEnd = new Date(target);
    dayEnd.setHours(23, 59, 59, 999);
    
    // Calculate intersection
    const overlapStart = new Date(Math.max(clockIn.getTime(), dayStart.getTime()));
    const overlapEnd = new Date(Math.min(clockOut.getTime(), dayEnd.getTime()));
    
    if (overlapStart < overlapEnd) {
      const overlapMinutes = (overlapEnd - overlapStart) / 60000;
      
      // Proportional break time
      const totalEntryMinutes = (clockOut - clockIn) / 60000;
      const breakPortion = entry.break_minutes && totalEntryMinutes > 0
        ? (overlapMinutes / totalEntryMinutes) * entry.break_minutes
        : 0;
      
      totalMinutes += Math.max(0, overlapMinutes - breakPortion);
    }
  });
  
  return totalMinutes / 60;
}

/**
 * Calculate total hours from entries (simple sum, no date filtering)
 * @param {Array} entries - Array of time entries
 * @returns {number} Total hours
 */
export function calculateTotalHours(entries) {
  if (!Array.isArray(entries)) return 0;
  
  let totalMinutes = 0;
  
  entries.forEach(entry => {
    if (!entry.clock_in) return;
    
    const clockIn = new Date(entry.clock_in);
    const clockOut = entry.clock_out ? new Date(entry.clock_out) : new Date();
    const minutes = (clockOut - clockIn) / 60000;
    const breakMinutes = entry.break_minutes || 0;
    
    totalMinutes += Math.max(0, minutes - breakMinutes);
  });
  
  return totalMinutes / 60;
}

/**
 * Calculate hours for a date range, properly splitting overnight entries
 * @param {Array} entries - Array of time entries  
 * @param {Date|string} startDate - Start of range (inclusive)
 * @param {Date|string} endDate - End of range (inclusive)
 * @returns {number} Total hours in the range
 */
export function calculateHoursInRange(entries, startDate, endDate) {
  if (!Array.isArray(entries)) return 0;
  
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  let totalMinutes = 0;
  
  entries.forEach(entry => {
    if (!entry.clock_in) return;
    
    const clockIn = new Date(entry.clock_in);
    const clockOut = entry.clock_out ? new Date(entry.clock_out) : new Date();
    
    // Calculate intersection with date range
    const overlapStart = new Date(Math.max(clockIn.getTime(), start.getTime()));
    const overlapEnd = new Date(Math.min(clockOut.getTime(), end.getTime()));
    
    if (overlapStart < overlapEnd) {
      const overlapMinutes = (overlapEnd - overlapStart) / 60000;
      
      // Proportional break time
      const totalEntryMinutes = (clockOut - clockIn) / 60000;
      const breakPortion = entry.break_minutes && totalEntryMinutes > 0
        ? (overlapMinutes / totalEntryMinutes) * entry.break_minutes
        : 0;
      
      totalMinutes += Math.max(0, overlapMinutes - breakPortion);
    }
  });
  
  return totalMinutes / 60;
}

/**
 * Group entries by date (splitting overnight entries)
 * @param {Array} entries - Array of time entries
 * @returns {Object} Object with date keys (YYYY-MM-DD) and entry arrays
 */
export function groupEntriesByDate(entries) {
  if (!Array.isArray(entries)) return {};
  
  const splitEntries = splitEntriesAtMidnight(entries);
  const grouped = {};
  
  splitEntries.forEach(entry => {
    if (!entry.clock_in) return;
    
    const dateKey = new Date(entry.clock_in).toISOString().split('T')[0];
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(entry);
  });
  
  return grouped;
}

/**
 * Get hours per day for a date range
 * @param {Array} entries - Array of time entries
 * @param {Date|string} startDate - Start of range
 * @param {Date|string} endDate - End of range
 * @returns {Object} Object with date keys (YYYY-MM-DD) and hours values
 */
export function getHoursPerDay(entries, startDate, endDate) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  const result = {};
  const current = new Date(start);
  
  while (current <= end) {
    const dateKey = current.toISOString().split('T')[0];
    result[dateKey] = calculateHoursForDate(entries, current);
    current.setDate(current.getDate() + 1);
  }
  
  return result;
}
