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

// Budget vs Actual report
export const getBudgetVsActual = async (req, res) => {
  try {
    const { company_id } = req.user;
    const { project_id, cost_code_id } = req.query;

    let query = supabase
      .from('v_budget_vs_actual')
      .select('*')
      .eq('company_id', company_id);

    if (project_id) query = query.eq('project_id', project_id);
    if (cost_code_id) query = query.eq('cost_code_id', cost_code_id);

    const { data, error } = await query.order('project_name').order('cost_code');

    if (error) throw error;

    // Calculate company-wide totals
    const totals = data.reduce((acc, row) => {
      acc.total_budgeted_hours += parseFloat(row.budgeted_hours) || 0;
      acc.total_budgeted_labor_cost += parseFloat(row.budgeted_labor_cost) || 0;
      acc.total_budgeted_quantity += parseFloat(row.budgeted_quantity) || 0;
      acc.total_actual_hours += parseFloat(row.actual_hours) || 0;
      acc.total_actual_labor_cost += parseFloat(row.actual_labor_cost) || 0;
      acc.total_actual_quantity += parseFloat(row.actual_quantity) || 0;
      return acc;
    }, {
      total_budgeted_hours: 0,
      total_budgeted_labor_cost: 0,
      total_budgeted_quantity: 0,
      total_actual_hours: 0,
      total_actual_labor_cost: 0,
      total_actual_quantity: 0
    });

    // Calculate variances and percentages
    totals.hours_variance = totals.total_budgeted_hours - totals.total_actual_hours;
    totals.labor_cost_variance = totals.total_budgeted_labor_cost - totals.total_actual_labor_cost;
    totals.hours_percent_complete = totals.total_budgeted_hours > 0
      ? Math.round((totals.total_actual_hours / totals.total_budgeted_hours) * 100 * 100) / 100
      : 0;
    totals.cost_percent_complete = totals.total_budgeted_labor_cost > 0
      ? Math.round((totals.total_actual_labor_cost / totals.total_budgeted_labor_cost) * 100 * 100) / 100
      : 0;

    res.json({
      totals,
      details: data
    });
  } catch (error) {
    console.error('Get budget vs actual error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Production report (quantities)
export const getProductionReport = async (req, res) => {
  try {
    const { company_id } = req.user;
    const { project_id, start_date, end_date } = req.query;

    // Get production from view
    let query = supabase
      .from('v_actual_production')
      .select('*')
      .eq('company_id', company_id);

    if (project_id) query = query.eq('project_id', project_id);

    const { data: productionData, error: productionError } = await query;

    if (productionError) throw productionError;

    // Get daily breakdown if date filters provided
    let dailyData = null;
    if (start_date || end_date) {
      let dailyQuery = supabase
        .from('daily_production')
        .select(`
          *,
          project:projects(id, name),
          cost_code:cost_codes(id, code, name, unit_of_measure),
          entered_by_user:users!daily_production_entered_by_fkey(id, full_name)
        `)
        .eq('company_id', company_id)
        .order('production_date', { ascending: false });

      if (project_id) dailyQuery = dailyQuery.eq('project_id', project_id);
      if (start_date) dailyQuery = dailyQuery.gte('production_date', start_date);
      if (end_date) dailyQuery = dailyQuery.lte('production_date', end_date);

      const { data, error } = await dailyQuery;
      if (error) throw error;
      dailyData = data;
    }

    res.json({
      summary: productionData,
      daily: dailyData
    });
  } catch (error) {
    console.error('Get production report error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Labor cost report
export const getLaborCostReport = async (req, res) => {
  try {
    const { company_id } = req.user;
    const { project_id, start_date, end_date } = req.query;

    // Get labor costs from view
    let query = supabase
      .from('v_actual_labor_costs')
      .select('*')
      .eq('company_id', company_id);

    if (project_id) query = query.eq('project_id', project_id);

    const { data, error } = await query.order('project_name').order('cost_code');

    if (error) throw error;

    // Calculate totals
    const totals = data.reduce((acc, row) => {
      acc.total_hours += parseFloat(row.actual_hours) || 0;
      acc.total_labor_cost += parseFloat(row.actual_labor_cost) || 0;
      acc.total_workers += parseInt(row.worker_count) || 0;
      return acc;
    }, {
      total_hours: 0,
      total_labor_cost: 0,
      total_workers: 0
    });

    // Calculate average hourly rate
    totals.average_hourly_rate = totals.total_hours > 0
      ? Math.round((totals.total_labor_cost / totals.total_hours) * 100) / 100
      : 0;

    res.json({
      totals,
      details: data
    });
  } catch (error) {
    console.error('Get labor cost report error:', error);
    res.status(500).json({ error: error.message });
  }
};