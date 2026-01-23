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
    const { id: user_id, default_company_id } = req.user;
    const {
      start_date,
      end_date,
      project_id,
      cost_code_id,
      target_user_id,
      limit = 100,
      offset = 0
    } = req.query;

    // Use query param company_id or fall back to default
    const company_id = req.query.company_id || default_company_id;

    let query = supabase
      .from('time_entries')
      .select(`
        *,
        project:projects(id, name),
        cost_code:cost_codes(id, code, name, unit_of_measure),
        equipment:equipment(id, label),
        user:users(id, full_name)
      `, { count: 'exact' })
      .eq('company_id', company_id)
      .order('clock_in', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // For now, filter by user (role-based filtering can be added later)
    if (target_user_id) {
      query = query.eq('user_id', target_user_id);
    } else {
      query = query.eq('user_id', user_id);
    }

    if (project_id) query = query.eq('project_id', project_id);
    if (cost_code_id) query = query.eq('cost_code_id', cost_code_id);
    if (start_date) query = query.gte('clock_in', start_date);
    if (end_date) query = query.lte('clock_in', end_date);

    const { data, error, count } = await query;

    if (error) throw error;
    res.json({ data, total: count });
  } catch (error) {
    console.error('Get time entries error:', error);
    res.status(500).json({ error: error.message });
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

// Update notes for a time entry
export const updateNotes = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: user_id } = req.user;
    const { notes } = req.body;

    if (notes === undefined) {
      return res.status(400).json({ error: 'notes field is required' });
    }

    // First check if entry exists
    const { data: existing, error: fetchError } = await supabase
      .from('time_entries')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Time entry not found' });
    }

    // Check permissions - user can only edit their own entries
    if (existing.user_id !== user_id) {
      return res.status(403).json({ error: 'Not authorized to edit this time entry' });
    }

    const { data, error } = await supabase
      .from('time_entries')
      .update({ notes })
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
    console.error('Update notes error:', error);
    res.status(500).json({ error: error.message });
  }
};