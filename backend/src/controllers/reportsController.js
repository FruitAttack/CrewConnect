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

// Budget vs Actual report — queries tables directly (no view dependency)
export const getBudgetVsActual = async (req, res) => {
  try {
    const { company_id } = req.user;
    const { project_id } = req.query;

    // 1. Get all projects for this company
    let projectsQuery = supabase.from('projects').select('id, name').eq('company_id', company_id);
    if (project_id) projectsQuery = projectsQuery.eq('id', project_id);
    const { data: projects, error: projectsError } = await projectsQuery;
    if (projectsError) throw projectsError;

    if (!projects || projects.length === 0) {
      return res.json({ totals: { total_budgeted_hours: 0, total_actual_hours: 0, hours_variance: 0, total_budgeted_labor_cost: 0, total_actual_labor_cost: 0, labor_cost_variance: 0 }, details: [] });
    }

    const projectIds = projects.map(p => p.id);
    const projectMap = {};
    for (const p of projects) projectMap[p.id] = p.name;

    // 2. Get project cost codes (budgets)
    const { data: costCodes, error: ccError } = await supabase
      .from('project_cost_codes')
      .select('project_id, cost_code_id, budgeted_hours, budgeted_labor_cost, cost_code:cost_codes(id, code, name)')
      .in('project_id', projectIds);
    if (ccError) throw ccError;

    // 3. Get time entries for those projects
    const { data: entries, error: entriesError } = await supabase
      .from('time_entries')
      .select('project_id, cost_code_id, clock_in, clock_out, break_minutes, hourly_rate, user_id')
      .eq('company_id', company_id)
      .in('project_id', projectIds)
      .not('clock_out', 'is', null);
    if (entriesError) throw entriesError;

    // 4. Get employment rates
    const { data: employment } = await supabase
      .from('user_employment')
      .select('user_id, hourly_rate, salary_annual')
      .eq('company_id', company_id)
      .eq('is_active', true);

    const rateByUser = {};
    for (const e of (employment || [])) {
      rateByUser[e.user_id] = parseFloat(e.hourly_rate) > 0
        ? parseFloat(e.hourly_rate)
        : (parseFloat(e.salary_annual) || 0) / (52 * 40);
    }

    // 5. Aggregate actual hours + cost per project+cost_code
    const actualByKey = {};
    for (const entry of (entries || [])) {
      const hrs  = Math.max(0, (new Date(entry.clock_out) - new Date(entry.clock_in)) / 3600000 - (entry.break_minutes || 0) / 60);
      const rate = parseFloat(entry.hourly_rate) || rateByUser[entry.user_id] || 0;
      const key  = `${entry.project_id}:${entry.cost_code_id}`;
      if (!actualByKey[key]) actualByKey[key] = { hours: 0, cost: 0 };
      actualByKey[key].hours += hrs;
      actualByKey[key].cost  += hrs * rate;
    }

    // 6. Build details rows
    const details = (costCodes || []).map(row => {
      const key    = `${row.project_id}:${row.cost_code_id}`;
      const actual = actualByKey[key] || { hours: 0, cost: 0 };
      return {
        project_id:          row.project_id,
        project_name:        projectMap[row.project_id] || 'Unknown',
        cost_code_id:        row.cost_code_id,
        cost_code:           row.cost_code?.code || '',
        cost_code_name:      row.cost_code?.name || '',
        budgeted_hours:      parseFloat(row.budgeted_hours)      || 0,
        budgeted_labor_cost: parseFloat(row.budgeted_labor_cost) || 0,
        actual_hours:        Math.round(actual.hours * 100) / 100,
        actual_labor_cost:   Math.round(actual.cost  * 100) / 100,
      };
    }).sort((a, b) => a.project_name.localeCompare(b.project_name));

    // 7. Totals
    const totals = details.reduce((acc, r) => {
      acc.total_budgeted_hours      += r.budgeted_hours;
      acc.total_budgeted_labor_cost += r.budgeted_labor_cost;
      acc.total_actual_hours        += r.actual_hours;
      acc.total_actual_labor_cost   += r.actual_labor_cost;
      return acc;
    }, { total_budgeted_hours: 0, total_budgeted_labor_cost: 0, total_actual_hours: 0, total_actual_labor_cost: 0 });

    totals.hours_variance      = Math.round((totals.total_budgeted_hours - totals.total_actual_hours) * 100) / 100;
    totals.labor_cost_variance = Math.round((totals.total_budgeted_labor_cost - totals.total_actual_labor_cost) * 100) / 100;

    res.json({ totals, details });
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

// Payroll Summary — hours + OT + estimated pay per employee
export const getPayrollSummary = async (req, res) => {
  try {
    const { company_id } = req.user;
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ message: 'start_date and end_date are required' });
    }

    const [entriesRes, empRes, usersRes] = await Promise.all([
      supabase
        .from('time_entries')
        .select('id, user_id, clock_in, clock_out, break_minutes, project_id, project:projects(id, name)')
        .eq('company_id', company_id)
        .not('clock_out', 'is', null)
        .gte('clock_in', start_date)
        .lte('clock_in', `${end_date}T23:59:59`),
      supabase
        .from('user_employment')
        .select('user_id, hourly_rate, salary_annual, ot_after_hours_per_day, ot_multiplier, pay_type')
        .eq('company_id', company_id)
        .eq('is_active', true),
      supabase
        .from('users')
        .select('id, full_name, email')
        .eq('default_company_id', company_id)
        .eq('is_active', true),
    ]);

    if (entriesRes.error) throw entriesRes.error;
    if (empRes.error)     throw empRes.error;
    if (usersRes.error)   throw usersRes.error;

    const entries    = entriesRes.data || [];
    const employment = empRes.data    || [];
    const users      = usersRes.data  || [];

    const empByUser = {};
    for (const e of employment) empByUser[e.user_id] = e;
    const userById = {};
    for (const u of users) userById[u.id] = u;

    // Group by user → date (for OT) and user → project (for breakdown)
    const byUserDay     = {}; // { uid: { date: [entries] } }
    const byUserProject = {}; // { uid: { project_id: { name, hours } } }

    for (const entry of entries) {
      const uid  = entry.user_id;
      const date = entry.clock_in.substring(0, 10);

      if (!byUserDay[uid]) byUserDay[uid] = {};
      if (!byUserDay[uid][date]) byUserDay[uid][date] = [];
      byUserDay[uid][date].push(entry);

      if (!byUserProject[uid]) byUserProject[uid] = {};
      const projId = entry.project_id;
      if (projId && !byUserProject[uid][projId]) {
        byUserProject[uid][projId] = {
          project_id:   projId,
          project_name: entry.project?.name || 'Unknown',
          hours: 0,
        };
      }
    }

    const payroll = [];
    for (const [userId, days] of Object.entries(byUserDay)) {
      const emp  = empByUser[userId];
      const user = userById[userId];

      const hourlyRate   = emp
        ? (parseFloat(emp.hourly_rate) > 0 ? parseFloat(emp.hourly_rate) : (parseFloat(emp.salary_annual) || 0) / (52 * 40))
        : 0;
      const otThreshold  = emp ? parseFloat(emp.ot_after_hours_per_day) || 8   : 8;
      const otMultiplier = emp ? parseFloat(emp.ot_multiplier)           || 1.5 : 1.5;

      let totalHours = 0, regularHours = 0, otHours = 0, entryCount = 0;

      for (const dayEntries of Object.values(days)) {
        let dayHours = 0;
        for (const e of dayEntries) {
          const hrs = Math.max(0,
            (new Date(e.clock_out) - new Date(e.clock_in)) / 3600000
            - (e.break_minutes || 0) / 60
          );
          dayHours += hrs;
          entryCount++;
          const projId = e.project_id;
          if (projId && byUserProject[userId]?.[projId]) {
            byUserProject[userId][projId].hours += hrs;
          }
        }
        totalHours   += dayHours;
        const dayOT   = Math.max(0, dayHours - otThreshold);
        otHours      += dayOT;
        regularHours += dayHours - dayOT;
      }

      const estimatedPay = regularHours * hourlyRate + otHours * hourlyRate * otMultiplier;

      payroll.push({
        user_id:       userId,
        full_name:     user?.full_name || 'Unknown',
        email:         user?.email     || '',
        total_hours:   Math.round(totalHours   * 100) / 100,
        regular_hours: Math.round(regularHours * 100) / 100,
        ot_hours:      Math.round(otHours      * 100) / 100,
        hourly_rate:   Math.round(hourlyRate   * 100) / 100,
        estimated_pay: Math.round(estimatedPay * 100) / 100,
        pay_type:      emp?.pay_type || 'hourly',
        entry_count:   entryCount,
        projects:      Object.values(byUserProject[userId] || {})
                         .filter(p => p.hours > 0)
                         .map(p => ({ ...p, hours: Math.round(p.hours * 100) / 100 }))
                         .sort((a, b) => b.hours - a.hours),
      });
    }

    payroll.sort((a, b) => b.total_hours - a.total_hours);

    const totals = payroll.reduce(
      (acc, p) => {
        acc.total_hours   += p.total_hours;
        acc.regular_hours += p.regular_hours;
        acc.ot_hours      += p.ot_hours;
        acc.estimated_pay += p.estimated_pay;
        return acc;
      },
      { total_hours: 0, regular_hours: 0, ot_hours: 0, estimated_pay: 0 }
    );
    for (const key of Object.keys(totals)) totals[key] = Math.round(totals[key] * 100) / 100;

    res.json({ payroll, totals });
  } catch (error) {
    console.error('Get payroll summary error:', error);
    res.status(500).json({ error: error.message });
  }
};