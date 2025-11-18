import { supabase } from '../utils/supabase.js';

/**
 * Get equipment utilization report
 * GET /api/reports/equipment-utilization?company_id=xxx&start_date=2025-01-01&end_date=2025-01-31
 */
export async function getEquipmentUtilization(req, res) {
  try {
    const { company_id, start_date, end_date } = req.query;

    if (!company_id || !start_date || !end_date) {
      return res.status(400).json({ 
        message: 'company_id, start_date, and end_date are required' 
      });
    }

    const { data, error } = await supabase.rpc('get_equipment_utilization', {
      p_company_id: company_id,
      p_start_date: start_date,
      p_end_date: end_date
    });

    if (error) {
      console.error('Equipment utilization error:', error);
      return res.status(500).json({ message: 'Failed to get equipment utilization' });
    }

    return res.status(200).json({ utilization: data });

  } catch (err) {
    console.error('Equipment utilization error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Get user timecard
 * GET /api/reports/timecard?user_id=xxx&start_date=2025-01-01&end_date=2025-01-31
 */
export async function getUserTimecard(req, res) {
  try {
    const { user_id, start_date, end_date } = req.query;

    if (!user_id || !start_date || !end_date) {
      return res.status(400).json({ 
        message: 'user_id, start_date, and end_date are required' 
      });
    }

    const { data, error } = await supabase.rpc('get_user_timecard', {
      p_user_id: user_id,
      p_start_date: start_date,
      p_end_date: end_date
    });

    if (error) {
      console.error('Get timecard error:', error);
      return res.status(500).json({ message: 'Failed to get timecard' });
    }

    return res.status(200).json({ timecard: data });

  } catch (err) {
    console.error('Get timecard error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Get daily crew report
 * GET /api/reports/daily-crew?company_id=xxx&date=2025-01-15
 */
export async function getDailyCrew(req, res) {
  try {
    const { company_id, date } = req.query;

    if (!company_id) {
      return res.status(400).json({ 
        message: 'company_id is required' 
      });
    }

    const { data, error } = await supabase.rpc('get_daily_crew', {
      p_company_id: company_id,
      p_date: date || new Date().toISOString().split('T')[0] // Today if not specified
    });

    if (error) {
      console.error('Get daily crew error:', error);
      return res.status(500).json({ message: 'Failed to get daily crew' });
    }

    return res.status(200).json({ crew: data });

  } catch (err) {
    console.error('Get daily crew error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Get company dashboard stats
 * GET /api/reports/dashboard?company_id=xxx&date=2025-01-15
 */
export async function getCompanyDashboard(req, res) {
  try {
    const { company_id, date } = req.query;

    if (!company_id) {
      return res.status(400).json({ 
        message: 'company_id is required' 
      });
    }

    const { data, error } = await supabase.rpc('get_company_dashboard', {
      p_company_id: company_id,
      p_date: date || new Date().toISOString().split('T')[0]
    });

    if (error) {
      console.error('Get dashboard error:', error);
      return res.status(500).json({ message: 'Failed to get dashboard' });
    }

    return res.status(200).json({ dashboard: data[0] || {} });

  } catch (err) {
    console.error('Get dashboard error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Get audit history for a record (Admin only)
 * GET /api/reports/audit-history?table_name=time_entries&record_id=xxx
 */
export async function getAuditHistory(req, res) {
  try {
    const { table_name, record_id, limit } = req.query;

    if (!table_name || !record_id) {
      return res.status(400).json({ 
        message: 'table_name and record_id are required' 
      });
    }

    const { data, error } = await supabase.rpc('get_audit_history', {
      p_table_name: table_name,
      p_record_id: record_id,
      p_limit: limit ? parseInt(limit) : 50
    });

    if (error) {
      console.error('Get audit history error:', error);
      return res.status(500).json({ message: 'Failed to get audit history' });
    }

    return res.status(200).json({ history: data });

  } catch (err) {
    console.error('Get audit history error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Get wage change history for user (Admin only)
 * GET /api/reports/wage-history?user_id=xxx
 */
export async function getWageHistory(req, res) {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ 
        message: 'user_id is required' 
      });
    }

    const { data, error } = await supabase.rpc('get_wage_history', {
      p_user_id: user_id
    });

    if (error) {
      console.error('Get wage history error:', error);
      // This function throws an error if user is not admin
      if (error.message.includes('administrators')) {
        return res.status(403).json({ message: 'Admin access required' });
      }
      return res.status(500).json({ message: 'Failed to get wage history' });
    }

    return res.status(200).json({ wage_history: data });

  } catch (err) {
    console.error('Get wage history error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}