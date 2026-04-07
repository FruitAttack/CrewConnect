import { supabase } from '../utils/supabase.js';

function isSameDay(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function getEndOfDay(date) {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

function getStartOfNextDay(date) {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  return next;
}

function normalizeCoords(body = {}) {
  return {
    lat: body.lat ?? body.latitude ?? null,
    lng: body.lng ?? body.longitude ?? null,
    accuracy: body.accuracy ?? null,
  };
}

function parseOfflineTimestamp(req, explicitFieldName) {
  const raw =
    req.body?.[explicitFieldName] ??
    req.body?.occurred_at ??
    req.body?._localTimestamp ??
    null;

  if (!raw) {
    return { ok: false, error: `${explicitFieldName} is required for offline sync` };
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, error: `${explicitFieldName} must be a valid ISO timestamp` };
  }

  return { ok: true, date: parsed, raw };
}

async function splitEntryAcrossDays(entry, clockOutTime, clockOutData = {}) {
  const clockIn = new Date(entry.clock_in);
  const clockOut = new Date(clockOutTime);

  const segments = [];
  let currentStart = new Date(clockIn);
  let isFirstSegment = true;

  const totalMinutes = (clockOut - clockIn) / 60000;
  let remainingBreakMinutes = entry.break_minutes || 0;

  while (!isSameDay(currentStart, clockOut)) {
    const endOfDay = getEndOfDay(currentStart);
    const segmentMinutes = (endOfDay - currentStart) / 60000;

    const breakPortion = totalMinutes > 0
      ? Math.round((segmentMinutes / totalMinutes) * (entry.break_minutes || 0))
      : 0;
    const segmentBreak = Math.min(breakPortion, remainingBreakMinutes);
    remainingBreakMinutes -= segmentBreak;

    if (isFirstSegment) {
      const { data, error } = await supabase
        .from('time_entries')
        .update({
          clock_out: endOfDay.toISOString(),
          break_minutes: segmentBreak,
          is_split: true,
        })
        .eq('id', entry.id)
        .select()
        .single();

      if (error) throw error;
      segments.push(data);
      isFirstSegment = false;
    } else {
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          company_id: entry.company_id,
          user_id: entry.user_id,
          project_id: entry.project_id,
          cost_code_id: entry.cost_code_id,
          equipment_id: entry.equipment_id,
          clock_in: currentStart.toISOString(),
          clock_out: endOfDay.toISOString(),
          break_minutes: segmentBreak,
          hourly_rate: entry.hourly_rate,
          notes: entry.notes ? `${entry.notes} (continued)` : 'Continued from previous day',
          parent_entry_id: entry.id,
          is_split: true,
        })
        .select()
        .single();

      if (error) throw error;
      segments.push(data);
    }

    currentStart = getStartOfNextDay(currentStart);
  }

  const { data: finalSegment, error: finalError } = await supabase
    .from('time_entries')
    .insert({
      company_id: entry.company_id,
      user_id: entry.user_id,
      project_id: entry.project_id,
      cost_code_id: entry.cost_code_id,
      equipment_id: entry.equipment_id,
      clock_in: currentStart.toISOString(),
      clock_out: clockOut.toISOString(),
      clock_out_lat: clockOutData.lat,
      clock_out_lng: clockOutData.lng,
      clock_out_accuracy: clockOutData.accuracy,
      break_minutes: Math.max(0, remainingBreakMinutes),
      hourly_rate: entry.hourly_rate,
      notes:
        clockOutData.notes !== undefined
          ? clockOutData.notes
          : entry.notes
            ? `${entry.notes} (continued)`
            : 'Continued from previous day',
      quantity: clockOutData.quantity,
      unit_of_measure: clockOutData.unit_of_measure,
      parent_entry_id: entry.id,
      is_split: true,
    })
    .select()
    .single();

  if (finalError) throw finalError;
  segments.push(finalSegment);

  return segments;
}

export const offlineClockIn = async (req, res) => {
  try {
    const { id: user_id } = req.user;
    const {
      project_id,
      cost_code_id,
      equipment_id,
      notes,
      quantity,
      unit_of_measure,
      client_action_id,
    } = req.body;

    const coords = normalizeCoords(req.body);
    const parsedClockIn = parseOfflineTimestamp(req, 'clock_in');

    if (!parsedClockIn.ok) {
      return res.status(400).json({ error: parsedClockIn.error });
    }

    if (!project_id || !cost_code_id) {
      return res.status(400).json({ error: 'project_id and cost_code_id are required' });
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, company_id')
      .eq('id', project_id)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const company_id = project.company_id;

    const { data: existingEntry, error: existingEntryError } = await supabase
      .from('time_entries')
      .select('id, clock_in')
      .eq('user_id', user_id)
      .is('clock_out', null)
      .single();

    if (existingEntryError && existingEntryError.code !== 'PGRST116') {
      throw existingEntryError;
    }

    if (existingEntry) {
      return res.status(409).json({
        error: 'Already clocked in. Please clock out first.',
        existing_entry_id: existingEntry.id,
      });
    }

    const { data: costCode, error: costCodeError } = await supabase
      .from('cost_codes')
      .select('id, company_id')
      .eq('id', cost_code_id)
      .eq('company_id', company_id)
      .single();

    if (costCodeError || !costCode) {
      return res.status(404).json({ error: 'Cost code not found' });
    }

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
        clock_in: parsedClockIn.date.toISOString(),
        clock_in_lat: coords.lat,
        clock_in_lng: coords.lng,
        clock_in_accuracy: coords.accuracy,
        hourly_rate: employment?.hourly_rate,
        notes,
        quantity,
        unit_of_measure,
      })
      .select(`
        *,
        project:projects(id, name),
        cost_code:cost_codes(id, code, name, unit_of_measure),
        equipment:equipment(id, label)
      `)
      .single();

    if (error) throw error;

    return res.status(201).json({
      ...data,
      _offline_sync: true,
      _client_action_id: client_action_id || null,
    });
  } catch (error) {
    console.error('Offline clock in error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const offlineClockOut = async (req, res) => {
  try {
    const { id: user_id } = req.user;
    const {
      notes,
      quantity,
      unit_of_measure,
      client_action_id,
    } = req.body;

    const coords = normalizeCoords(req.body);
    const parsedClockOut = parseOfflineTimestamp(req, 'clock_out');

    if (!parsedClockOut.ok) {
      return res.status(400).json({ error: parsedClockOut.error });
    }

    const { data: entry, error: findError } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', user_id)
      .is('clock_out', null)
      .single();

    if (findError || !entry) {
      return res.status(404).json({ error: 'No open time entry found' });
    }

    const clockIn = new Date(entry.clock_in);
    const clockOutTime = parsedClockOut.date;

    if (clockOutTime < clockIn) {
      return res.status(400).json({ error: 'clock_out cannot be before clock_in' });
    }

    if (!isSameDay(clockIn, clockOutTime)) {
      try {
        const segments = await splitEntryAcrossDays(entry, clockOutTime, {
          ...coords,
          notes,
          quantity,
          unit_of_measure,
        });

        const { data: finalEntry, error: fetchError } = await supabase
          .from('time_entries')
          .select(`
            *,
            project:projects(id, name),
            cost_code:cost_codes(id, code, name, unit_of_measure),
            equipment:equipment(id, label)
          `)
          .eq('id', segments[segments.length - 1].id)
          .single();

        if (fetchError) throw fetchError;

        return res.json({
          ...finalEntry,
          _offline_sync: true,
          _client_action_id: client_action_id || null,
          _split: true,
          _totalSegments: segments.length,
          _originalEntryId: entry.id,
        });
      } catch (splitError) {
        console.error('Offline split error, falling back to normal offline clock out:', splitError);
      }
    }

    const updates = {
      clock_out: clockOutTime.toISOString(),
      clock_out_lat: coords.lat,
      clock_out_lng: coords.lng,
      clock_out_accuracy: coords.accuracy,
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

    return res.json({
      ...data,
      _offline_sync: true,
      _client_action_id: client_action_id || null,
    });
  } catch (error) {
    console.error('Offline clock out error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const offlineStartBreak = async (req, res) => {
  try {
    const { id: user_id } = req.user;
    const { break_type = 'standard', client_action_id } = req.body;

    const parsedBreakStart = parseOfflineTimestamp(req, 'break_start');
    if (!parsedBreakStart.ok) {
      return res.status(400).json({ error: parsedBreakStart.error });
    }

    const { data: timeEntry, error: findError } = await supabase
      .from('time_entries')
      .select('id, company_id, clock_in')
      .eq('user_id', user_id)
      .is('clock_out', null)
      .single();

    if (findError || !timeEntry) {
      return res.status(400).json({ error: 'Must be clocked in to start a break' });
    }

    const timeEntryClockIn = new Date(timeEntry.clock_in);
    if (parsedBreakStart.date < timeEntryClockIn) {
      return res.status(400).json({ error: 'break_start cannot be before clock_in' });
    }

    const { data: existingBreak, error: existingBreakError } = await supabase
      .from('breaks')
      .select('id')
      .eq('user_id', user_id)
      .is('break_end', null)
      .single();

    if (existingBreakError && existingBreakError.code !== 'PGRST116') {
      throw existingBreakError;
    }

    if (existingBreak) {
      return res.status(409).json({
        error: 'Already on break',
        existing_break_id: existingBreak.id,
      });
    }

    const { data, error } = await supabase
      .from('breaks')
      .insert({
        time_entry_id: timeEntry.id,
        company_id: timeEntry.company_id,
        user_id,
        break_start: parsedBreakStart.date.toISOString(),
        break_type,
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      ...data,
      _offline_sync: true,
      _client_action_id: client_action_id || null,
    });
  } catch (error) {
    console.error('Offline start break error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const offlineEndBreak = async (req, res) => {
  try {
    const { id: user_id } = req.user;
    const { client_action_id } = req.body;

    const parsedBreakEnd = parseOfflineTimestamp(req, 'break_end');
    if (!parsedBreakEnd.ok) {
      return res.status(400).json({ error: parsedBreakEnd.error });
    }

    const { data: openBreak, error: findError } = await supabase
      .from('breaks')
      .select('*')
      .eq('user_id', user_id)
      .is('break_end', null)
      .single();

    if (findError || !openBreak) {
      return res.status(404).json({ error: 'No active break found' });
    }

    const breakStart = new Date(openBreak.break_start);
    const breakEnd = parsedBreakEnd.date;

    if (breakEnd < breakStart) {
      return res.status(400).json({ error: 'break_end cannot be before break_start' });
    }

    const breakMinutes = Math.round((breakEnd - breakStart) / (1000 * 60));

    const { data: updatedBreak, error: breakError } = await supabase
      .from('breaks')
      .update({ break_end: breakEnd.toISOString() })
      .eq('id', openBreak.id)
      .select()
      .single();

    if (breakError) throw breakError;

    const { data: timeEntry, error: timeEntryError } = await supabase
      .from('time_entries')
      .select('break_minutes')
      .eq('id', openBreak.time_entry_id)
      .single();

    if (timeEntryError) throw timeEntryError;

    const { error: updateTimeEntryError } = await supabase
      .from('time_entries')
      .update({
        break_minutes: (timeEntry?.break_minutes || 0) + breakMinutes,
      })
      .eq('id', openBreak.time_entry_id);

    if (updateTimeEntryError) throw updateTimeEntryError;

    return res.json({
      ...updatedBreak,
      break_duration_minutes: breakMinutes,
      _offline_sync: true,
      _client_action_id: client_action_id || null,
    });
  } catch (error) {
    console.error('Offline end break error:', error);
    return res.status(500).json({ error: error.message });
  }
};