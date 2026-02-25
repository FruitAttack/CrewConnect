import { supabase } from '../utils/supabase.js';

/**
 * Get timecard approvals for a company and week
 * GET /api/timecard-approvals?company_id=xxx&week_start=2025-01-19&user_id=xxx
 */
export const getTimecardApprovals = async (req, res) => {
  try {
    const { company_id, week_start, user_id } = req.query;

    if (!company_id) {
      return res.status(400).json({ error: 'company_id is required' });
    }

    let query = supabase
      .from('timecard_approvals')
      .select('*')
      .eq('company_id', company_id);

    if (week_start) {
      query = query.eq('week_start', week_start);
    }

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Get timecard approvals error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Create or update timecard approval (upsert)
 * POST /api/timecard-approvals
 * Body: { company_id, user_id, week_start, week_end, status, notes? }
 *
 * Called by:
 *   - Employee submitting their timecard  → status: 'pending'
 *   - Foreman approving/rejecting         → status: 'approved' | 'rejected' | 'pending_changes'
 */
export const upsertTimecardApproval = async (req, res) => {
  try {
    const { id: requester_id } = req.user; // The person making the request
    const { company_id, user_id, week_start, week_end, status, notes } = req.body;

    if (!company_id || !user_id || !week_start || !week_end || !status) {
      return res.status(400).json({
        error: 'company_id, user_id, week_start, week_end, and status are required',
      });
    }

    const validStatuses = ['pending', 'approved', 'rejected', 'pending_changes'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Only set approved_by / approved_at when a foreman takes action (non-pending)
    const approvalData = {
      company_id,
      user_id,
      week_start,
      week_end,
      status,
      notes: notes || null,
      approved_by: status !== 'pending' ? requester_id : null,
      approved_at: status !== 'pending' ? new Date().toISOString() : null,
    };

    const { data, error } = await supabase
      .from('timecard_approvals')
      .upsert(approvalData, {
        onConflict: 'company_id,user_id,week_start',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Upsert timecard approval error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Bulk update timecard approvals
 * POST /api/timecard-approvals/bulk
 * Body: { company_id, week_start, week_end, user_ids: [], status, notes? }
 */
export const bulkUpdateApprovals = async (req, res) => {
  try {
    const { id: approver_id } = req.user;
    const { company_id, week_start, week_end, user_ids, status, notes } = req.body;

    if (!company_id || !week_start || !week_end || !user_ids || !status) {
      return res.status(400).json({
        error: 'company_id, week_start, week_end, user_ids, and status are required',
      });
    }

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ error: 'user_ids must be a non-empty array' });
    }

    const validStatuses = ['pending', 'approved', 'rejected', 'pending_changes'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const approvals = user_ids.map((user_id) => ({
      company_id,
      user_id,
      week_start,
      week_end,
      status,
      notes: notes || null,
      approved_by: status !== 'pending' ? approver_id : null,
      approved_at: status !== 'pending' ? new Date().toISOString() : null,
    }));

    const { data, error } = await supabase
      .from('timecard_approvals')
      .upsert(approvals, {
        onConflict: 'company_id,user_id,week_start',
        ignoreDuplicates: false,
      })
      .select();

    if (error) throw error;

    res.json({
      success: true,
      message: `Successfully updated ${data.length} timecard approvals`,
      approvals: data,
    });
  } catch (error) {
    console.error('Bulk update approvals error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete a timecard approval
 * DELETE /api/timecard-approvals/:id
 */
export const deleteTimecardApproval = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('timecard_approvals')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Timecard approval deleted successfully' });
  } catch (error) {
    console.error('Delete timecard approval error:', error);
    res.status(500).json({ error: error.message });
  }
};