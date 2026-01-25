import { supabase } from '../utils/supabase.js';

// Clock in
export const clockIn = async (req, res) => {
  try {
    const { id: user_id } = req.user;
    const {
      project_id,
      cost_code_id,
      equipment_id,
      notes,
      lat,
      lng,
      accuracy,
      quantity,
      unit_of_measure
    } = req.body;

    if (!project_id || !cost_code_id) {
      return res.status(400).json({ error: 'project_id and cost_code_id are required' });
    }

    // Get project and its company_id
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, company_id')
      .eq('id', project_id)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const company_id = project.company_id;

    // Check for existing open time entry
    const { data: existingEntry } = await supabase
      .from('time_entries')
      .select('id')
      .eq('user_id', user_id)
      .is('clock_out', null)
      .single();

    if (existingEntry) {
      return res.status(409).json({
        error: 'Already clocked in. Please clock out first.',
        existing_entry_id: existingEntry.id
      });
    }

    // Verify cost code belongs to same company
    const { data: costCode, error: costCodeError } = await supabase
      .from('cost_codes')
      .select('id, company_id')
      .eq('id', cost_code_id)
      .eq('company_id', company_id)
      .single();

    if (costCodeError || !costCode) {
      return res.status(404).json({ error: 'Cost code not found' });
    }

    // Get hourly rate from user employment
    const { data: employment } = await supabase
      .from('user_employment')
      .select('hourly_rate')
      .eq('user_id', user_id)
      .eq('company_id', company_id)
      .eq('is_active', true)
      .single();

    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        company_id,
        user_id,
        project_id,
        cost_code_id,
        equipment_id,
        clock_in: new Date().toISOString(),
        clock_in_lat: lat,
        clock_in_lng: lng,
        clock_in_accuracy: accuracy,
        hourly_rate: employment?.hourly_rate,
        notes,
        quantity,
        unit_of_measure
      })
      .select(`
        *,
        project:projects(id, name),
        cost_code:cost_codes(id, code, name, unit_of_measure),
        equipment:equipment(id, label)
      `)
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Clock in error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Clock out
export const clockOut = async (req, res) => {
  try {
    const { id: user_id } = req.user;
    const {
      lat,
      lng,
      accuracy,
      notes,
      quantity,
      unit_of_measure
    } = req.body;

    // Find open time entry
    const { data: entry, error: findError } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', user_id)
      .is('clock_out', null)
      .single();

    if (findError || !entry) {
      return res.status(404).json({ error: 'No open time entry found' });
    }

    // Build update object
    const updates = {
      clock_out: new Date().toISOString(),
      clock_out_lat: lat,
      clock_out_lng: lng,
      clock_out_accuracy: accuracy
    };

    if (notes !== undefined) updates.notes = notes;
    if (quantity !== undefined) updates.quantity = quantity;
    if (unit_of_measure !== undefined) updates.unit_of_measure = unit_of_measure;

    const { data, error } = await supabase
      .from('time_entries')
      .update(updates)
      .eq('id', entry.id)
      .select(`
        *,
        project:projects(id, name),
        cost_code:cost_codes(id, code, name, unit_of_measure),
        equipment:equipment(id, label)
      `)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Clock out error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get current time entry
export const getCurrentTimeEntry = async (req, res) => {
  try {
    const { id: user_id } = req.user;

    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        *,
        project:projects(id, name, address, lat, lng, geofence_m),
        cost_code:cost_codes(id, code, name, unit_of_measure),
        equipment:equipment(id, label, type)
      `)
      .eq('user_id', user_id)
      .is('clock_out', null)
      .order('clock_in', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.json(null); // No open entry
      }
      throw error;
    }

    // Calculate hours worked so far
    const clockIn = new Date(data.clock_in);
    const now = new Date();
    const hoursWorked = (now - clockIn) / (1000 * 60 * 60) - (data.break_minutes || 0) / 60;

    res.json({
      ...data,
      hours_so_far: Math.round(hoursWorked * 100) / 100
    });
  } catch (error) {
    console.error('Get current time entry error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get time entries with filters
export const getTimeEntries = async (req, res) => {
  try {
    const { id: user_id, default_company_id, role_key } = req.user;
    const {
      start_date,
      end_date,
      project_id,
      cost_code_id,
      target_user_id,
      all_users,
      limit = 100,
      offset = 0
    } = req.query;

    // DEBUG: Log the raw end_date value
    console.log('Raw end_date from query:', end_date);
    console.log('end_date type:', typeof end_date);

    // Use query param company_id or fall back to default
    const company_id = req.query.company_id || default_company_id;

    let query = supabase
      .from('time_entries')
      .select(`
        *,
        project:projects(id, name),
        cost_code:cost_codes(id, code, name, unit_of_measure),
        equipment:equipment(id, label),
        user:users(id, full_name, email)
      `, { count: 'exact' })
      .eq('company_id', company_id)
      .order('clock_in', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Role-based filtering
    const isPrivileged = ['admin', 'supervisor', 'foreman'].includes(role_key);
    
    if (target_user_id) {
      query = query.eq('user_id', target_user_id);
    } else if (all_users === 'true' && isPrivileged) {
      // Show all users' entries
    } else {
      query = query.eq('user_id', user_id);
    }

    if (project_id) query = query.eq('project_id', project_id);
    if (cost_code_id) query = query.eq('cost_code_id', cost_code_id);
    if (start_date) query = query.gte('clock_in', start_date);
    
    if (end_date) {
      // Safely handle end_date
      let endDateStr;
      try {
        // Remove any existing time portion and rebuild
        const dateOnly = end_date.replace(/T.*$/, '').trim();
        endDateStr = `${dateOnly}T23:59:59.999Z`;
        console.log('Constructed end date string:', endDateStr);
      } catch (e) {
        console.error('Error constructing end_date:', e);
        return res.status(400).json({ error: 'Invalid end_date format' });
      }
      query = query.lte('clock_in', endDateStr);
    }

    const { data, error, count } = await query;

    if (error) throw error;
    
    res.json({ time_entries: data, total: count });
  } catch (error) {
    console.error('Get time entries error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get nearby projects for clock-in
export const getNearbyProjects = async (req, res) => {
  try {
    const { lat, lng, max_distance_km = 50 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    // Use the database function
    const { data, error } = await supabase.rpc('get_nearby_projects', {
      p_user_lat: parseFloat(lat),
      p_user_lng: parseFloat(lng),
      p_max_distance_km: parseFloat(max_distance_km)
    });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Get nearby projects error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Validate geofence
export const validateGeofence = async (req, res) => {
  try {
    const { project_id, lat, lng } = req.body;

    if (!project_id || !lat || !lng) {
      return res.status(400).json({ error: 'project_id, lat, and lng are required' });
    }

    // Get project with geofence info
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, lat, lng, geofence_m')
      .eq('id', project_id)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // If no geofence set, allow
    if (!project.geofence_m || !project.lat || !project.lng) {
      return res.json({ valid: true, message: 'No geofence configured' });
    }

    // Calculate distance using Haversine formula
    const R = 6371000; // Earth's radius in meters
    const lat1 = lat * Math.PI / 180;
    const lat2 = project.lat * Math.PI / 180;
    const deltaLat = (project.lat - lat) * Math.PI / 180;
    const deltaLng = (project.lng - lng) * Math.PI / 180;

    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    const isValid = distance <= project.geofence_m;

    res.json({
      valid: isValid,
      distance_meters: Math.round(distance),
      geofence_meters: project.geofence_m,
      message: isValid ? 'Within geofence' : 'Outside geofence'
    });
  } catch (error) {
    console.error('Validate geofence error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update time entry
export const updateTimeEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: user_id } = req.user;
    const {
      project_id,
      cost_code_id,
      equipment_id,
      clock_in,
      clock_out,
      break_minutes,
      notes,
      quantity,
      unit_of_measure
    } = req.body;

    // First check if entry exists and get its company_id
    const { data: existing, error: fetchError } = await supabase
      .from('time_entries')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Time entry not found' });
    }

    // Check permissions - user can only edit their own entries for now
    if (existing.user_id !== user_id) {
      return res.status(403).json({ error: 'Not authorized to edit this time entry' });
    }

    // Build update object
    const updates = {};
    if (project_id !== undefined) updates.project_id = project_id;
    if (cost_code_id !== undefined) updates.cost_code_id = cost_code_id;
    if (equipment_id !== undefined) updates.equipment_id = equipment_id;
    if (clock_in !== undefined) updates.clock_in = clock_in;
    if (clock_out !== undefined) updates.clock_out = clock_out;
    if (break_minutes !== undefined) updates.break_minutes = break_minutes;
    if (notes !== undefined) updates.notes = notes;
    if (quantity !== undefined) updates.quantity = quantity;
    if (unit_of_measure !== undefined) updates.unit_of_measure = unit_of_measure;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data, error } = await supabase
      .from('time_entries')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        project:projects(id, name),
        cost_code:cost_codes(id, code, name, unit_of_measure),
        equipment:equipment(id, label)
      `)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Update time entry error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete time entry
export const deleteTimeEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: user_id } = req.user;

    // Get the entry first to verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('time_entries')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Time entry not found' });
    }

    // For now, only allow users to delete their own entries
    if (existing.user_id !== user_id) {
      return res.status(403).json({ error: 'Not authorized to delete this time entry' });
    }

    const { data, error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Time entry deleted', data });
  } catch (error) {
    console.error('Delete time entry error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Helper function to calculate seconds worked
const calculateSecondsWorked = (entries) => {
  return entries.reduce((total, entry) => {
    const clockIn = new Date(entry.clock_in);
    const clockOut = entry.clock_out ? new Date(entry.clock_out) : new Date();
    const breakSeconds = (entry.break_minutes || 0) * 60;
    const worked = (clockOut - clockIn) / 1000 - breakSeconds;
    return total + Math.max(0, worked);
  }, 0);
};

// Get seconds worked for current shift
export const getSecondsWorkedShift = async (req, res) => {
  try {
    const { id: user_id } = req.user;

    const { data, error } = await supabase
      .from('time_entries')
      .select('clock_in, clock_out, break_minutes')
      .eq('user_id', user_id)
      .is('clock_out', null)
      .single();

    if (error || !data) {
      return res.json({ seconds: 0 });
    }

    const seconds = calculateSecondsWorked([data]);
    res.json({ seconds: Math.round(seconds) });
  } catch (error) {
    console.error('Get seconds worked shift error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get seconds worked today
export const getSecondsWorkedToday = async (req, res) => {
  try {
    const { id: user_id } = req.user;
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('time_entries')
      .select('clock_in, clock_out, break_minutes')
      .eq('user_id', user_id)
      .gte('clock_in', `${today}T00:00:00`)
      .lte('clock_in', `${today}T23:59:59`);

    if (error) throw error;

    const seconds = calculateSecondsWorked(data || []);
    res.json({ seconds: Math.round(seconds) });
  } catch (error) {
    console.error('Get seconds worked today error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get seconds worked for a specific day
export const getSecondsWorkedDay = async (req, res) => {
  try {
    const { id: user_id } = req.user;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'date query parameter is required' });
    }

    const { data, error } = await supabase
      .from('time_entries')
      .select('clock_in, clock_out, break_minutes')
      .eq('user_id', user_id)
      .gte('clock_in', `${date}T00:00:00`)
      .lte('clock_in', `${date}T23:59:59`);

    if (error) throw error;

    const seconds = calculateSecondsWorked(data || []);
    res.json({ seconds: Math.round(seconds), date });
  } catch (error) {
    console.error('Get seconds worked day error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get seconds worked this week
export const getSecondsWorkedWeek = async (req, res) => {
  try {
    const { id: user_id } = req.user;

    // Get start of week (Sunday)
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('time_entries')
      .select('clock_in, clock_out, break_minutes')
      .eq('user_id', user_id)
      .gte('clock_in', startOfWeek.toISOString());

    if (error) throw error;

    const seconds = calculateSecondsWorked(data || []);
    res.json({
      seconds: Math.round(seconds),
      week_start: startOfWeek.toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Get seconds worked week error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get seconds worked this month
export const getSecondsWorkedMonth = async (req, res) => {
  try {
    const { id: user_id } = req.user;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data, error } = await supabase
      .from('time_entries')
      .select('clock_in, clock_out, break_minutes')
      .eq('user_id', user_id)
      .gte('clock_in', startOfMonth.toISOString());

    if (error) throw error;

    const seconds = calculateSecondsWorked(data || []);
    res.json({
      seconds: Math.round(seconds),
      month_start: startOfMonth.toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Get seconds worked month error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get seconds worked this year
export const getSecondsWorkedYear = async (req, res) => {
  try {
    const { id: user_id } = req.user;

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const { data, error } = await supabase
      .from('time_entries')
      .select('clock_in, clock_out, break_minutes')
      .eq('user_id', user_id)
      .gte('clock_in', startOfYear.toISOString());

    if (error) throw error;

    const seconds = calculateSecondsWorked(data || []);
    res.json({
      seconds: Math.round(seconds),
      year_start: startOfYear.toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Get seconds worked year error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Start break
export const startBreak = async (req, res) => {
  try {
    const { id: user_id } = req.user;
    const { break_type = 'standard' } = req.body;

    // Find current open time entry (includes company_id)
    const { data: timeEntry, error: findError } = await supabase
      .from('time_entries')
      .select('id, company_id')
      .eq('user_id', user_id)
      .is('clock_out', null)
      .single();

    if (findError || !timeEntry) {
      return res.status(400).json({ error: 'Must be clocked in to start a break' });
    }

    // Check for existing open break
    const { data: existingBreak } = await supabase
      .from('breaks')
      .select('id')
      .eq('user_id', user_id)
      .is('break_end', null)
      .single();

    if (existingBreak) {
      return res.status(409).json({
        error: 'Already on break',
        existing_break_id: existingBreak.id
      });
    }

    const { data, error } = await supabase
      .from('breaks')
      .insert({
        time_entry_id: timeEntry.id,
        company_id: timeEntry.company_id,
        user_id,
        break_start: new Date().toISOString(),
        break_type
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Start break error:', error);
    res.status(500).json({ error: error.message });
  }
};

// End break
export const endBreak = async (req, res) => {
  try {
    const { id: user_id } = req.user;

    // Find open break
    const { data: openBreak, error: findError } = await supabase
      .from('breaks')
      .select('*')
      .eq('user_id', user_id)
      .is('break_end', null)
      .single();

    if (findError || !openBreak) {
      return res.status(404).json({ error: 'No active break found' });
    }

    const breakEnd = new Date();
    const breakStart = new Date(openBreak.break_start);
    const breakMinutes = Math.round((breakEnd - breakStart) / (1000 * 60));

    // Update break record
    const { data: updatedBreak, error: breakError } = await supabase
      .from('breaks')
      .update({ break_end: breakEnd.toISOString() })
      .eq('id', openBreak.id)
      .select()
      .single();

    if (breakError) throw breakError;

    // Update time entry break_minutes
    const { data: timeEntry } = await supabase
      .from('time_entries')
      .select('break_minutes')
      .eq('id', openBreak.time_entry_id)
      .single();

    await supabase
      .from('time_entries')
      .update({
        break_minutes: (timeEntry?.break_minutes || 0) + breakMinutes
      })
      .eq('id', openBreak.time_entry_id);

    res.json({
      ...updatedBreak,
      break_duration_minutes: breakMinutes
    });
  } catch (error) {
    console.error('End break error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get current break
export const getCurrentBreak = async (req, res) => {
  try {
    const { id: user_id } = req.user;

    const { data, error } = await supabase
      .from('breaks')
      .select('*')
      .eq('user_id', user_id)
      .is('break_end', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.json(null);
      }
      throw error;
    }

    // Calculate break duration so far
    const breakStart = new Date(data.break_start);
    const now = new Date();
    const minutesSoFar = Math.round((now - breakStart) / (1000 * 60));

    res.json({
      ...data,
      minutes_so_far: minutesSoFar
    });
  } catch (error) {
    console.error('Get current break error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update cost code for current time entry
export const updateCostCode = async (req, res) => {
  try {
    const { id: user_id } = req.user;
    const { cost_code_id } = req.body;

    if (!cost_code_id) {
      return res.status(400).json({ error: 'cost_code_id is required' });
    }

    // Find current open time entry (includes company_id)
    const { data: timeEntry, error: findError } = await supabase
      .from('time_entries')
      .select('id, company_id')
      .eq('user_id', user_id)
      .is('clock_out', null)
      .single();

    if (findError || !timeEntry) {
      return res.status(404).json({ error: 'No open time entry found' });
    }

    // Verify cost code belongs to same company
    const { data: costCode, error: costCodeError } = await supabase
      .from('cost_codes')
      .select('id')
      .eq('id', cost_code_id)
      .eq('company_id', timeEntry.company_id)
      .single();

    if (costCodeError || !costCode) {
      return res.status(404).json({ error: 'Cost code not found' });
    }

    const { data, error } = await supabase
      .from('time_entries')
      .update({ cost_code_id })
      .eq('id', timeEntry.id)
      .select(`
        *,
        project:projects(id, name),
        cost_code:cost_codes(id, code, name, unit_of_measure),
        equipment:equipment(id, label)
      `)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Update cost code error:', error);
    res.status(500).json({ error: error.message });
  }
};

// --- Live management helpers ---

const getCompanyId = (req) => req.query.company_id || req.body.company_id || req.user?.default_company_id;

async function assertCanManageUser({ req, targetUserId, companyId }) {
  const role = req.user?.role_key;

  if (!role) {
    const err = new Error("Not authenticated");
    err.status = 401;
    throw err;
  }

  // Admin/supervisor can manage anyone in company
  if (role === "admin" || role === "supervisor") return true;

  // Foreman can manage assigned employees (and optionally themselves)
  if (role === "foreman") {
    if (targetUserId === req.user.id) return true;

    const { data, error } = await supabase
      .from("employee_assignments")
      .select("foreman_id, employee_id")
      .eq("foreman_id", req.user.id)
      .eq("employee_id", targetUserId)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      const err = new Error("You can only manage your assigned employees");
      err.status = 403;
      throw err;
    }
    return true;
  }

  const err = new Error("Insufficient permissions");
  err.status = 403;
  throw err;
}

// Fetch open entry for a user in a company (if any)
async function getOpenEntry(company_id, user_id) {
  const { data, error } = await supabase
    .from("time_entries")
    .select(`
      *,
      project:projects(id, name),
      cost_code:cost_codes(id, code, name, unit_of_measure),
      equipment:equipment(id, label),
      user:users(id, full_name, email)
    `)
    .eq("company_id", company_id)
    .eq("user_id", user_id)
    .is("clock_out", null)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

// --- Handlers ---

// GET /api/time-entries/manage/active?company_id=...
export const getActiveRoster = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    if (!company_id) return res.status(400).json({ error: "company_id is required" });

    const role = req.user?.role_key;

    // Determine roster scope
    let rosterUserIds = null;

    if (role === "foreman") {
      const { data: assigned, error: aErr } = await supabase
        .from("employee_assignments")
        .select("employee_id")
        .eq("foreman_id", req.user.id);

      if (aErr) throw aErr;
      rosterUserIds = Array.from(new Set([req.user.id, ...(assigned || []).map(x => x.employee_id)]));
    }

    // Get users who belong to this company via user_employment
    let employmentQuery = supabase
      .from("user_employment")
      .select(`
        user_id,
        user:users(id, full_name, email, is_active, phone, can_view_rates)
      `)
      .eq("company_id", company_id)
      .eq("is_active", true);

    if (rosterUserIds) {
      employmentQuery = employmentQuery.in("user_id", rosterUserIds);
    }

    const { data: employments, error: empErr } = await employmentQuery;
    if (empErr) throw empErr;

    // Fetch user roles for this company
    const userIds = (employments || []).map(e => e.user_id).filter(Boolean);
    const { data: userRoles, error: roleErr } = await supabase
      .from("user_roles")
      .select("user_id, role_key")
      .eq("company_id", company_id)
      .in("user_id", userIds);

    if (roleErr) throw roleErr;

    const roleByUser = new Map((userRoles || []).map(r => [r.user_id, r.role_key]));

    // Extract unique active users with their roles
    const usersMap = new Map();
    (employments || []).forEach(emp => {
      if (emp.user && emp.user.is_active) {
        usersMap.set(emp.user.id, {
          ...emp.user,
          role_key: roleByUser.get(emp.user.id) || null
        });
      }
    });

    const users = Array.from(usersMap.values()).sort((a, b) => 
      (a.full_name || '').localeCompare(b.full_name || '')
    );

    // Fetch open breaks
    const { data: openBreaks, error: bErr } = await supabase
      .from("breaks")
      .select("user_id, id, break_start")
      .eq("company_id", company_id)
      .is("break_end", null);

    if (bErr) throw bErr;

    const breakByUser = new Map((openBreaks || []).map(b => [b.user_id, b]));

    // Fetch all open entries in company (then map)
    let openQuery = supabase
      .from("time_entries")
      .select(`
        id, company_id, user_id, project_id, cost_code_id, equipment_id,
        clock_in, clock_out, break_minutes, notes,
        project:projects(id, name),
        cost_code:cost_codes(id, code, name, unit_of_measure),
        equipment:equipment(id, label),
        user:users(id, full_name, email)
      `)
      .eq("company_id", company_id)
      .is("clock_out", null);

    if (rosterUserIds) openQuery = openQuery.in("user_id", rosterUserIds);

    const { data: openEntries, error: oErr } = await openQuery;
    if (oErr) throw oErr;

    const openByUser = new Map((openEntries || []).map(e => [e.user_id, e]));

    const roster = users.map(u => {
      const open = openByUser.get(u.id) || null;
      const activeBreak = breakByUser.get(u.id) || null;
      return {
        user: u,
        is_clocked_in: !!open,
        open_entry: open ? {
          ...open,
          is_on_break: !!activeBreak,
          current_break: activeBreak
        } : null,
      };
    });

    res.json({ roster });
  } catch (error) {
    console.error("Get active roster error:", error);
    res.status(error.status || 500).json({ error: error.message });
  }
};

// POST /api/time-entries/manage/:user_id/clock-in
export const clockInForUser = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const target_user_id = req.params.user_id;

    const {
      project_id,
      cost_code_id,
      equipment_id,
      notes,
      quantity,
      unit_of_measure,
      lat,
      lng,
      accuracy,
      // optional: allow custom clock_in for corrections
      clock_in
    } = req.body;

    if (!company_id) return res.status(400).json({ error: "company_id is required" });
    if (!project_id || !cost_code_id) {
      return res.status(400).json({ error: "project_id and cost_code_id are required" });
    }

    await assertCanManageUser({ req, targetUserId: target_user_id, companyId: company_id });

    // Prevent double clock-in
    const existing = await getOpenEntry(company_id, target_user_id);
    if (existing) return res.status(409).json({ error: "User already has an open time entry", open_entry: existing });

    // Verify project belongs to company
    const { data: project, error: pErr } = await supabase
      .from("projects")
      .select("id")
      .eq("id", project_id)
      .eq("company_id", company_id)
      .single();
    if (pErr || !project) return res.status(404).json({ error: "Project not found" });

    // Verify cost code belongs to company
    const { data: costCode, error: cErr } = await supabase
      .from("cost_codes")
      .select("id")
      .eq("id", cost_code_id)
      .eq("company_id", company_id)
      .single();
    if (cErr || !costCode) return res.status(404).json({ error: "Cost code not found" });

    // Hourly rate (optional)
    const { data: employment } = await supabase
      .from("user_employment")
      .select("hourly_rate")
      .eq("user_id", target_user_id)
      .eq("company_id", company_id)
      .eq("is_active", true)
      .maybeSingle();

    const { data, error } = await supabase
      .from("time_entries")
      .insert({
        company_id,
        user_id: target_user_id,
        project_id,
        cost_code_id,
        equipment_id: equipment_id || null,
        clock_in: clock_in || new Date().toISOString(),
        clock_in_lat: lat,
        clock_in_lng: lng,
        clock_in_accuracy: accuracy,
        hourly_rate: employment?.hourly_rate,
        notes,
        quantity,
        unit_of_measure
      })
      .select(`
        *,
        project:projects(id, name),
        cost_code:cost_codes(id, code, name, unit_of_measure),
        equipment:equipment(id, label),
        user:users(id, full_name, email)
      `)
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error("Clock in for user error:", error);
    res.status(error.status || 500).json({ error: error.message });
  }
};

// POST /api/time-entries/manage/:user_id/clock-out
export const clockOutForUser = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const target_user_id = req.params.user_id;
    if (!company_id) return res.status(400).json({ error: "company_id is required" });

    await assertCanManageUser({ req, targetUserId: target_user_id, companyId: company_id });

    // Find open entry in that company
    const { data: entry, error: findError } = await supabase
      .from("time_entries")
      .select("*")
      .eq("company_id", company_id)
      .eq("user_id", target_user_id)
      .is("clock_out", null)
      .single();

    if (findError || !entry) return res.status(404).json({ error: "No open time entry found" });

    const { lat, lng, accuracy, notes, quantity, unit_of_measure, clock_out } = req.body;

    const updates = {
      clock_out: clock_out || new Date().toISOString(),
      clock_out_lat: lat,
      clock_out_lng: lng,
      clock_out_accuracy: accuracy,
    };
    if (notes !== undefined) updates.notes = notes;
    if (quantity !== undefined) updates.quantity = quantity;
    if (unit_of_measure !== undefined) updates.unit_of_measure = unit_of_measure;

    const { data, error } = await supabase
      .from("time_entries")
      .update(updates)
      .eq("id", entry.id)
      .select(`
        *,
        project:projects(id, name),
        cost_code:cost_codes(id, code, name, unit_of_measure),
        equipment:equipment(id, label),
        user:users(id, full_name, email)
      `)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Clock out for user error:", error);
    res.status(error.status || 500).json({ error: error.message });
  }
};

// POST /api/time-entries/manage/:user_id/switch-task
export const switchTaskForUser = async (req, res) => {
  try {
    // Switch = clock out current entry + clock in new entry (same day, new task timer)
    const company_id = getCompanyId(req);
    const target_user_id = req.params.user_id;
    if (!company_id) return res.status(400).json({ error: "company_id is required" });

    await assertCanManageUser({ req, targetUserId: target_user_id, companyId: company_id });

    // 1) Close current entry
    const closed = await (async () => {
      const { data: entry } = await supabase
        .from("time_entries")
        .select("*")
        .eq("company_id", company_id)
        .eq("user_id", target_user_id)
        .is("clock_out", null)
        .maybeSingle();

      if (!entry) return null;

      const { error } = await supabase
        .from("time_entries")
        .update({ clock_out: new Date().toISOString() })
        .eq("id", entry.id);

      if (error) throw error;
      return entry.id;
    })();

    // 2) Create new entry (requires project & cost code)
    // Reuse clockInForUser logic by calling it “manually”
    req.body = { ...req.body, company_id };
    const { project_id, cost_code_id } = req.body;
    if (!project_id || !cost_code_id) {
      return res.status(400).json({ error: "project_id and cost_code_id are required" });
    }

    // Directly insert (call the same checks)
    // (If you prefer, you can refactor checks into a shared function)
    // We'll just call clockInForUser’s core by duplicating minimal checks:
    const { data: project } = await supabase.from("projects").select("id").eq("id", project_id).eq("company_id", company_id).maybeSingle();
    if (!project) return res.status(404).json({ error: "Project not found" });

    const { data: costCode } = await supabase.from("cost_codes").select("id").eq("id", cost_code_id).eq("company_id", company_id).maybeSingle();
    if (!costCode) return res.status(404).json({ error: "Cost code not found" });

    const { data: employment } = await supabase
      .from("user_employment")
      .select("hourly_rate")
      .eq("user_id", target_user_id)
      .eq("company_id", company_id)
      .eq("is_active", true)
      .maybeSingle();

    const now = new Date().toISOString();

    const { data: newEntry, error: insErr } = await supabase
      .from("time_entries")
      .insert({
        company_id,
        user_id: target_user_id,
        project_id,
        cost_code_id,
        equipment_id: req.body.equipment_id || null,
        clock_in: now,
        hourly_rate: employment?.hourly_rate,
        notes: req.body.notes,
      })
      .select(`
        *,
        project:projects(id, name),
        cost_code:cost_codes(id, code, name, unit_of_measure),
        equipment:equipment(id, label),
        user:users(id, full_name, email)
      `)
      .single();

    if (insErr) throw insErr;

    res.status(201).json({ switched_from_entry_id: closed, new_entry: newEntry });
  } catch (error) {
    console.error("Switch task for user error:", error);
    res.status(error.status || 500).json({ error: error.message });
  }
};

// POST /api/time-entries/manage/:user_id/break/start
export const startBreakForUser = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const target_user_id = req.params.user_id;
    if (!company_id) return res.status(400).json({ error: "company_id is required" });

    await assertCanManageUser({ req, targetUserId: target_user_id, companyId: company_id });

    // Find the user's open time entry
    const { data: timeEntry, error: findError } = await supabase
      .from("time_entries")
      .select("id")
      .eq("company_id", company_id)
      .eq("user_id", target_user_id)
      .is("clock_out", null)
      .single();

    if (findError || !timeEntry) {
      return res.status(404).json({ error: "User is not clocked in" });
    }

    // Check if already on break
    const { data: existingBreak } = await supabase
      .from("breaks")
      .select("id")
      .eq("user_id", target_user_id)
      .eq("time_entry_id", timeEntry.id)
      .is("break_end", null)
      .single();

    if (existingBreak) {
      return res.status(409).json({ error: "User is already on break" });
    }

    // Start the break
    const { data: newBreak, error: breakError } = await supabase
      .from("breaks")
      .insert({
        user_id: target_user_id,
        company_id: company_id,
        time_entry_id: timeEntry.id,
        break_start: new Date().toISOString()
      })
      .select()
      .single();

    if (breakError) throw breakError;

    res.status(201).json(newBreak);
  } catch (error) {
    console.error("Start break for user error:", error);
    res.status(error.status || 500).json({ error: error.message });
  }
};
// Update notes for current time entry
export const updateNotes = async (req, res) => {
  try {
    const { id: user_id } = req.user;
    const { notes } = req.body;

    if (notes === undefined) {
      return res.status(400).json({ error: 'notes field is required' });
    }

    // Find current open time entry
    const { data: entry, error: findError } = await supabase
      .from('time_entries')
      .select('id, company_id')
      .eq('user_id', user_id)
      .is('clock_out', null)
      .single();

    if (findError || !entry) {
      return res.status(404).json({ error: 'No open time entry found' });
    }

    const { data, error } = await supabase
      .from('time_entries')
      .update({ notes })
      .eq('id', entry.id)
      .select(`
        *,
        project:projects(id, name),
        cost_code:cost_codes(id, code, name, unit_of_measure),
        equipment:equipment(id, label)
      `)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Update notes error:', error);
    res.status(500).json({ error: error.message });
  }
};
// POST /api/time-entries/manage/:user_id/break/end
export const endBreakForUser = async (req, res) => {
  try {
    const company_id = getCompanyId(req);
    const target_user_id = req.params.user_id;
    if (!company_id) return res.status(400).json({ error: "company_id is required" });

    await assertCanManageUser({ req, targetUserId: target_user_id, companyId: company_id });

    // Find the user's open break
    const { data: openBreak, error: findError } = await supabase
      .from("breaks")
      .select("*, time_entry_id")
      .eq("user_id", target_user_id)
      .is("break_end", null)
      .single();

    if (findError || !openBreak) {
      return res.status(404).json({ error: "User is not on break" });
    }

    // Calculate break duration
    const breakStart = new Date(openBreak.break_start);
    const breakEnd = new Date();
    const breakMinutes = Math.round((breakEnd - breakStart) / (1000 * 60));

    // End the break
    const { data: updatedBreak, error: breakError } = await supabase
      .from("breaks")
      .update({ break_end: breakEnd.toISOString() })
      .eq("id", openBreak.id)
      .select()
      .single();

    if (breakError) throw breakError;

    // Update time entry break_minutes
    const { data: timeEntry } = await supabase
      .from("time_entries")
      .select("break_minutes")
      .eq("id", openBreak.time_entry_id)
      .single();

    await supabase
      .from("time_entries")
      .update({
        break_minutes: (timeEntry?.break_minutes || 0) + breakMinutes
      })
      .eq("id", openBreak.time_entry_id);

    res.json({
      ...updatedBreak,
      break_duration_minutes: breakMinutes
    });
  } catch (error) {
    console.error("End break for user error:", error);
    res.status(error.status || 500).json({ error: error.message });
  }
};
