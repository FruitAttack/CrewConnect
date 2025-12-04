import { supabase } from '../utils/supabase.js';

/**
 * Clock in with automatic validation and geofencing
 * POST /api/time-entries/clock-in
 */
export async function clockIn(req, res) {
  try {
    console.log('=== CLOCK IN DEBUG ===');
    console.log('Headers:', req.headers.authorization);
    console.log('req.user:', req.user);
    console.log('req.user?.id:', req.user?.id);
    console.log('====================');

    const { 
      project_id, 
      cost_code_id, 
      equipment_id, 
      latitude, 
      longitude, 
      notes 
    } = req.body;

    // Validate required fields
    if (!project_id || !cost_code_id) {
      return res.status(400).json({ 
        message: 'project_id and cost_code_id are required' 
      });
    }

    // Get user ID from authenticated request
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        message: 'User not authenticated' 
      });
    }

    // Call database function for smart clock-in
    // Note: Using .rpc() with schema specified
    const { data, error } = await supabase
      .schema('app')
      .rpc('clock_in', {
        p_user_id: userId,
        p_project_id: project_id,
        p_cost_code_id: cost_code_id,
        p_equipment_id: equipment_id || null,
        p_lat: latitude || null,
        p_lng: longitude || null,
        p_notes: notes || null
      });

    if (error) {
      console.error('Clock in error:', error);
      return res.status(400).json({ 
        message: error.message || 'Failed to clock in'
      });
    }

    // Database function returns {success, time_entry_id, error_message}
    const result = data[0];

    if (!result.success) {
      return res.status(400).json({ 
        message: result.error_message 
      });
    }

    return res.status(201).json({
      message: 'Clocked in successfully',
      time_entry_id: result.time_entry_id
    });

  } catch (err) {
    console.error('Clock in error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Clock out
 * POST /api/time-entries/clock-out
 */
export async function clockOut(req, res) {
  try {
    const { 
      time_entry_id,
      latitude,
      longitude,
      break_minutes,
      notes
    } = req.body;

    if (!time_entry_id) {
      return res.status(400).json({ 
        message: 'time_entry_id is required' 
      });
    }

    // Call database function for clock-out
    const { data, error } = await supabase
      .schema('app')
      .rpc('clock_out', {
        p_time_entry_id: time_entry_id,
        p_lat: latitude || null,
        p_lng: longitude || null,
        p_break_minutes: break_minutes || 0,
        p_notes: notes || null
      });

    if (error) {
      console.error('Clock out error:', error);
      return res.status(400).json({ 
        message: error.message || 'Failed to clock out'
      });
    }

    const result = data[0];

    if (!result.success) {
      return res.status(400).json({ 
        message: result.error_message 
      });
    }

    return res.status(200).json({
      message: 'Clocked out successfully',
      total_hours: result.total_hours
    });

  } catch (err) {
    console.error('Clock out error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Get current user's open time entry
 * GET /api/time-entries/current
 */
export async function getCurrentTimeEntry(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { data, error } = await supabase
      .schema('app')
      .rpc('get_current_time_entry', {
        p_user_id: userId
      });

    if (error) {
      console.error('Get current entry error:', error);
      return res.status(500).json({ message: 'Failed to get current time entry' });
    }

    // If no open entry, data will be empty array
    if (!data || data.length === 0) {
      return res.status(200).json({ 
        message: 'No active time entry',
        current_entry: null 
      });
    }

    return res.status(200).json({
      current_entry: data[0]
    });

  } catch (err) {
    console.error('Get current entry error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Get user's time entries for a date range
 * GET /api/time-entries?start_date=2025-01-01&end_date=2025-01-31
 */
export async function getTimeEntries(req, res) {
  try {
    const { start_date, end_date, user_id } = req.query;
    const requestingUserId = req.user?.id;

    // Build query
    let query = supabase
      .schema('app')
      .from('time_entries')
      .select(`
        *,
        projects:project_id(id, name),
        cost_codes:cost_code_id(id, code, name),
        equipment:equipment_id(id, label)
      `)
      .order('clock_in', { ascending: false });

    // Filter by user - either requesting user or admin looking at someone else
    if (user_id) {
      query = query.eq('user_id', user_id);
    } else {
      query = query.eq('user_id', requestingUserId);
    }

    // Filter by date range if provided
    if (start_date) {
      query = query.gte('clock_in', start_date);
    }
    if (end_date) {
      query = query.lte('clock_in', end_date);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get time entries error:', error);
      return res.status(500).json({ message: 'Failed to get time entries' });
    }

    return res.status(200).json({ time_entries: data });

  } catch (err) {
    console.error('Get time entries error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Get nearby projects based on user location
 * GET /api/time-entries/nearby-projects?latitude=40.7128&longitude=-74.0060
 */
export async function getNearbyProjects(req, res) {
  try {
    const { latitude, longitude, max_distance_km } = req.query;
    const companyId = req.user?.default_company_id;

    if (!latitude || !longitude) {
      return res.status(400).json({ 
        message: 'latitude and longitude are required' 
      });
    }

    if (!companyId) {
      return res.status(400).json({ 
        message: 'User company not found' 
      });
    }

    const { data, error } = await supabase
      .schema('app')
      .rpc('get_nearby_projects', {
        p_company_id: companyId,
        p_user_lat: parseFloat(latitude),
        p_user_lng: parseFloat(longitude),
        p_max_distance_km: max_distance_km ? parseFloat(max_distance_km) : 50
      });

    if (error) {
      console.error('Get nearby projects error:', error);
      return res.status(500).json({ message: 'Failed to get nearby projects' });
    }

    return res.status(200).json({ projects: data });

  } catch (err) {
    console.error('Get nearby projects error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Validate geofence for a project
 * POST /api/time-entries/validate-geofence
 */
export async function validateGeofence(req, res) {
  try {
    const { project_id, latitude, longitude } = req.body;

    if (!project_id || !latitude || !longitude) {
      return res.status(400).json({ 
        message: 'project_id, latitude, and longitude are required' 
      });
    }

    const { data, error } = await supabase
      .schema('app')
      .rpc('validate_geofence', {
        p_project_id: project_id,
        p_user_lat: latitude,
        p_user_lng: longitude
      });

    if (error) {
      console.error('Validate geofence error:', error);
      return res.status(500).json({ message: 'Failed to validate geofence' });
    }

    const result = data[0];

    return res.status(200).json({
      is_valid: result.is_valid,
      distance_meters: result.distance_meters,
      allowed_radius_meters: result.allowed_radius_meters,
      error_message: result.error_message
    });

  } catch (err) {
    console.error('Validate geofence error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Update a time entry (Admin/Supervisor/Foreman only)
 * PUT /api/time-entries/:id
 */
export async function updateTimeEntry(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.user_id;
    delete updates.company_id;
    delete updates.created_at;

    const { data, error } = await supabase
      .schema('app')
      .from('time_entries')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Update time entry error:', error);
      return res.status(400).json({ message: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'Time entry not found or no permission' });
    }

    return res.status(200).json({
      message: 'Time entry updated successfully',
      time_entry: data[0]
    });

  } catch (err) {
    console.error('Update time entry error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Delete a time entry (Admin/Supervisor only)
 * DELETE /api/time-entries/:id
 */
export async function deleteTimeEntry(req, res) {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .schema('app')
      .from('time_entries')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete time entry error:', error);
      return res.status(400).json({ message: error.message });
    }

    return res.status(200).json({
      message: 'Time entry deleted successfully'
    });

  } catch (err) {
    console.error('Delete time entry error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Get total seconds worked for current/active shift
 * GET /api/time-entries/seconds-shift
 */
export async function getSecondsWorkedShift(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const now = new Date();

    // Get the active time entry (no clock_out)
    const { data: activeEntry, error: entryError } = await supabase
      .from('time_entries')
      .select('id, clock_in, clock_out')
      .eq('user_id', userId)
      .is('clock_out', null)
      .order('clock_in', { ascending: false })
      .limit(1)
      .maybeSingle();

    // No active shift
    if (entryError || !activeEntry) {
      return res.status(200).json({
        seconds_worked_shift: 0,
        total_entry_seconds: 0,
        total_break_seconds: 0,
        is_clocked_in: false
      });
    }

    // Calculate shift seconds
    const clockIn = new Date(activeEntry.clock_in);
    const totalEntrySeconds = Math.floor((now - clockIn) / 1000);

    // Get breaks for this shift
    const { data: breaks, error: breaksError } = await supabase
      .from('breaks')
      .select('break_start, break_end')
      .eq('time_entry_id', activeEntry.id);

    let totalBreakSeconds = 0;

    if (!breaksError && breaks) {
      for (const brk of breaks) {
        const breakStart = new Date(brk.break_start);
        const breakEnd = brk.break_end ? new Date(brk.break_end) : now;
        totalBreakSeconds += Math.floor((breakEnd - breakStart) / 1000);
      }
    }

    const secondsWorkedShift = totalEntrySeconds - totalBreakSeconds;

    return res.status(200).json({
      seconds_worked_shift: secondsWorkedShift,
      total_entry_seconds: totalEntrySeconds,
      total_break_seconds: totalBreakSeconds,
      is_clocked_in: true,
      shift_start: activeEntry.clock_in
    });

  } catch (err) {
    console.error('Get seconds worked shift error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Get total seconds worked today (split at midnight for overnight shifts)
 * GET /api/time-entries/seconds-today
 */
export async function getSecondsWorkedToday(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const now = new Date();
    
    // Start and end of today
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // Get time entries that overlap with today
    // This includes: started today, ended today, or spans across today
    const { data: timeEntries, error: entriesError } = await supabase
      .from('time_entries')
      .select('id, clock_in, clock_out')
      .eq('user_id', userId)
      .or(`clock_in.gte.${todayStart.toISOString()},clock_out.gte.${todayStart.toISOString()},and(clock_in.lt.${todayStart.toISOString()},clock_out.is.null)`);

    if (entriesError) {
      console.error('Get time entries error:', entriesError);
      return res.status(500).json({ message: 'Failed to get time entries' });
    }

    let totalEntrySeconds = 0;
    const entryIds = [];

    for (const entry of timeEntries) {
      const clockIn = new Date(entry.clock_in);
      const clockOut = entry.clock_out ? new Date(entry.clock_out) : now;

      // Clamp to today's boundaries
      const effectiveStart = clockIn < todayStart ? todayStart : clockIn;
      const effectiveEnd = clockOut > todayEnd ? todayEnd : clockOut;

      // Only count if there's overlap with today
      if (effectiveStart < effectiveEnd) {
        totalEntrySeconds += Math.floor((effectiveEnd - effectiveStart) / 1000);
        entryIds.push(entry.id);
      }
    }

    // Get breaks for today's entries
    let totalBreakSeconds = 0;

    if (entryIds.length > 0) {
      const { data: breaks, error: breaksError } = await supabase
        .from('breaks')
        .select('break_start, break_end')
        .in('time_entry_id', entryIds);

      if (!breaksError && breaks) {
        for (const brk of breaks) {
          const breakStart = new Date(brk.break_start);
          const breakEnd = brk.break_end ? new Date(brk.break_end) : now;

          // Clamp breaks to today's boundaries too
          const effectiveStart = breakStart < todayStart ? todayStart : breakStart;
          const effectiveEnd = breakEnd > todayEnd ? todayEnd : breakEnd;

          if (effectiveStart < effectiveEnd) {
            totalBreakSeconds += Math.floor((effectiveEnd - effectiveStart) / 1000);
          }
        }
      }
    }

    const secondsWorkedToday = totalEntrySeconds - totalBreakSeconds;

    return res.status(200).json({
      seconds_worked_today: secondsWorkedToday,
      total_entry_seconds: totalEntrySeconds,
      total_break_seconds: totalBreakSeconds,
      entry_count: entryIds.length
    });

  } catch (err) {
    console.error('Get seconds worked today error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}