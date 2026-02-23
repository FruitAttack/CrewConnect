import { supabase } from '../utils/supabase.js';

// ============================================
// HELPER FUNCTIONS
// ============================================

const calculateBusinessDays = (startDate, endDate) => {
  let count = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
};

/**
 * Uses req.user directly — avoids DB query where role_key may be NULL
 */
const isManager = (user) => {
  const managerRoles = ['admin', 'manager', 'supervisor', 'foreman', 'superintendent'];
  return managerRoles.includes(user?.role_key?.toLowerCase());
};

// ============================================
// EMPLOYEE ENDPOINTS
// ============================================

/**
 * GET /api/time-off
 */
export const getTimeOffRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, year } = req.query;

    let query = supabase
      .schema('app')
      .from('time_off_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (year) {
      query = query
        .gte('start_date', `${year}-01-01`)
        .lte('start_date', `${year}-12-31`);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error fetching time-off requests:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch time-off requests' });
  }
};

/**
 * POST /api/time-off
 */
export const createTimeOffRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      type = 'PTO',
      start_date,
      end_date,
      hours_per_day = 8,
      total_hours: providedTotalHours,
      reason
    } = req.body;

    if (!start_date || !end_date) {
      return res.status(400).json({ success: false, error: 'Start date and end date are required' });
    }
    if (new Date(end_date) < new Date(start_date)) {
      return res.status(400).json({ success: false, error: 'End date must be on or after start date' });
    }
    if (hours_per_day <= 0 || hours_per_day > 24) {
      return res.status(400).json({ success: false, error: 'Hours per day must be between 0 and 24' });
    }

    let total_hours;
    if (providedTotalHours && providedTotalHours > 0) {
      total_hours = providedTotalHours;
    } else {
      total_hours = calculateBusinessDays(start_date, end_date) * hours_per_day;
    }

    if (total_hours <= 0) {
      return res.status(400).json({ success: false, error: 'No hours requested' });
    }

    const requestYear = new Date(start_date).getFullYear();
    const balanceTypes = ['PTO', 'VACATION', 'PERSONAL'];

    if (balanceTypes.includes(type.toUpperCase())) {
      const { data: balance } = await supabase
        .schema('app')
        .from('pto_balances')
        .select('*')
        .eq('user_id', userId)
        .eq('year', requestYear)
        .single();

      const available = balance
        ? balance.allocated_hours - balance.used_hours - balance.pending_hours
        : 0;

      if (total_hours > available) {
        return res.status(400).json({
          success: false,
          error: `Insufficient PTO balance. Available: ${available} hours, Requested: ${total_hours} hours`
        });
      }
    }

    const { data: request, error: insertError } = await supabase
      .schema('app')
      .from('time_off_requests')
      .insert({
        user_id: userId,
        type: type.toUpperCase(),
        start_date,
        end_date,
        hours_per_day,
        total_hours,
        reason: reason || null,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) throw insertError;

    if (balanceTypes.includes(type.toUpperCase())) {
      const { data: existingBalance } = await supabase
        .schema('app')
        .from('pto_balances')
        .select('id, pending_hours')
        .eq('user_id', userId)
        .eq('year', requestYear)
        .single();

      if (existingBalance) {
        await supabase
          .schema('app')
          .from('pto_balances')
          .update({ pending_hours: existingBalance.pending_hours + total_hours })
          .eq('id', existingBalance.id);
      } else {
        await supabase
          .schema('app')
          .from('pto_balances')
          .insert({ user_id: userId, year: requestYear, allocated_hours: 0, used_hours: 0, pending_hours: total_hours });
      }
    }

    res.status(201).json({ success: true, data: request, message: 'Time-off request submitted successfully' });
  } catch (error) {
    console.error('Error creating time-off request:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create time-off request' });
  }
};

/**
 * DELETE /api/time-off/:id
 */
export const cancelTimeOffRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { data: existing, error: fetchError } = await supabase
      .schema('app')
      .from('time_off_requests')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ success: false, error: 'Time-off request not found' });
    }
    if (existing.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Only pending requests can be cancelled' });
    }

    const { data: cancelled, error: updateError } = await supabase
      .schema('app')
      .from('time_off_requests')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    const requestYear = new Date(existing.start_date).getFullYear();
    const balanceTypes = ['PTO', 'VACATION', 'PERSONAL'];

    if (balanceTypes.includes(existing.type)) {
      const { data: balance } = await supabase
        .schema('app')
        .from('pto_balances')
        .select('id, pending_hours')
        .eq('user_id', userId)
        .eq('year', requestYear)
        .single();

      if (balance) {
        await supabase
          .schema('app')
          .from('pto_balances')
          .update({ pending_hours: Math.max(0, balance.pending_hours - existing.total_hours) })
          .eq('id', balance.id);
      }
    }

    res.json({ success: true, data: cancelled, message: 'Time-off request cancelled' });
  } catch (error) {
    console.error('Error cancelling time-off request:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to cancel time-off request' });
  }
};

/**
 * GET /api/time-off/balances
 */
export const getTimeOffBalances = async (req, res) => {
  try {
    const userId = req.user.id;
    const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();

    const { data: balance } = await supabase
      .schema('app')
      .from('pto_balances')
      .select('*')
      .eq('user_id', userId)
      .eq('year', year)
      .single();

    const result = balance || { id: null, user_id: userId, year, allocated_hours: 0, used_hours: 0, pending_hours: 0 };
    result.available_hours = result.allocated_hours - result.used_hours - result.pending_hours;

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching PTO balance:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch PTO balance' });
  }
};

// ============================================
// MANAGER ENDPOINTS
// ============================================

/**
 * GET /api/time-off/pending
 */
export const getPendingRequests = async (req, res) => {
  try {
    if (!isManager(req.user)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    // Plain select — no joins to avoid schema cache issues
    const { data, error } = await supabase
      .schema('app')
      .from('time_off_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch pending requests' });
  }
};

/**
 * GET /api/time-off/all
 */
export const getAllRequests = async (req, res) => {
  try {
    if (!isManager(req.user)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    const { status, user_id, start_date, end_date } = req.query;

    // Plain select — no joins to avoid schema cache issues
    let query = supabase
      .schema('app')
      .from('time_off_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (user_id) query = query.eq('user_id', user_id);
    if (start_date) query = query.gte('start_date', start_date);
    if (end_date) query = query.lte('end_date', end_date);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error fetching all requests:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch requests' });
  }
};

/**
 * PATCH /api/time-off/:id/approve
 */
export const approveRequest = async (req, res) => {
  try {
    if (!isManager(req.user)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    const approverId = req.user.id;
    const { id } = req.params;
    const { notes } = req.body || {};

    const { data: existing, error: fetchError } = await supabase
      .schema('app')
      .from('time_off_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ success: false, error: 'Time-off request not found' });
    }
    if (existing.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Only pending requests can be approved' });
    }

    const { data: approved, error: updateError } = await supabase
      .schema('app')
      .from('time_off_requests')
      .update({
        status: 'approved',
        reviewed_by: approverId,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: notes || null
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    const requestYear = new Date(existing.start_date).getFullYear();
    const balanceTypes = ['PTO', 'VACATION', 'PERSONAL'];

    if (balanceTypes.includes(existing.type)) {
      const { data: balance } = await supabase
        .schema('app')
        .from('pto_balances')
        .select('id, pending_hours, used_hours')
        .eq('user_id', existing.user_id)
        .eq('year', requestYear)
        .single();

      if (balance) {
        await supabase
          .schema('app')
          .from('pto_balances')
          .update({
            pending_hours: Math.max(0, balance.pending_hours - existing.total_hours),
            used_hours: balance.used_hours + existing.total_hours
          })
          .eq('id', balance.id);
      }
    }

    res.json({ success: true, data: approved, message: 'Time-off request approved' });
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to approve request' });
  }
};

/**
 * PATCH /api/time-off/:id/deny
 */
export const denyRequest = async (req, res) => {
  try {
    if (!isManager(req.user)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    const approverId = req.user.id;
    const { id } = req.params;
    const { notes, reason } = req.body;
    const denialNote = notes || reason || null;

    const { data: existing, error: fetchError } = await supabase
      .schema('app')
      .from('time_off_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ success: false, error: 'Time-off request not found' });
    }
    if (existing.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Only pending requests can be denied' });
    }

    const { data: denied, error: updateError } = await supabase
      .schema('app')
      .from('time_off_requests')
      .update({
        status: 'denied',
        reviewed_by: approverId,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: denialNote
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    const requestYear = new Date(existing.start_date).getFullYear();
    const balanceTypes = ['PTO', 'VACATION', 'PERSONAL'];

    if (balanceTypes.includes(existing.type)) {
      const { data: balance } = await supabase
        .schema('app')
        .from('pto_balances')
        .select('id, pending_hours')
        .eq('user_id', existing.user_id)
        .eq('year', requestYear)
        .single();

      if (balance) {
        await supabase
          .schema('app')
          .from('pto_balances')
          .update({ pending_hours: Math.max(0, balance.pending_hours - existing.total_hours) })
          .eq('id', balance.id);
      }
    }

    res.json({ success: true, data: denied, message: 'Time-off request denied' });
  } catch (error) {
    console.error('Error denying request:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to deny request' });
  }
};