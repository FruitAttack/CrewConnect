import { supabase } from '../utils/supabase.js';

// Get all cost codes assigned to a project
export const getProjectCostCodes = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { company_id } = req.user;
    const { active_only = 'true' } = req.query;

    // Verify project belongs to company
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, company_id')
      .eq('id', projectId)
      .eq('company_id', company_id)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    let query = supabase
      .from('project_cost_codes')
      .select(`
        project_id,
        cost_code_id,
        is_active,
        budgeted_hours,
        budgeted_labor_cost,
        budgeted_quantity,
        budgeted_unit_cost,
        notes,
        created_at,
        cost_code:cost_codes(id, code, name, unit_of_measure, active)
      `)
      .eq('project_id', projectId);

    if (active_only === 'true') {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query.order('cost_code(code)');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Get project cost codes error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Assign a cost code to a project
export const assignCostCodeToProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { company_id } = req.user;
    const { 
      cost_code_id,
      budgeted_hours,
      budgeted_labor_cost,
      budgeted_quantity,
      budgeted_unit_cost,
      notes
    } = req.body;

    if (!cost_code_id) {
      return res.status(400).json({ error: 'cost_code_id is required' });
    }

    // Verify project belongs to company
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, company_id')
      .eq('id', projectId)
      .eq('company_id', company_id)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify cost code belongs to company
    const { data: costCode, error: costCodeError } = await supabase
      .from('cost_codes')
      .select('id, company_id')
      .eq('id', cost_code_id)
      .eq('company_id', company_id)
      .single();

    if (costCodeError || !costCode) {
      return res.status(404).json({ error: 'Cost code not found' });
    }

    const { data, error } = await supabase
      .from('project_cost_codes')
      .insert({
        project_id: projectId,
        cost_code_id,
        budgeted_hours: budgeted_hours || 0,
        budgeted_labor_cost: budgeted_labor_cost || 0,
        budgeted_quantity: budgeted_quantity || 0,
        budgeted_unit_cost: budgeted_unit_cost || 0,
        notes,
        is_active: true
      })
      .select(`
        *,
        cost_code:cost_codes(id, code, name, unit_of_measure)
      `)
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Cost code already assigned to this project' });
      }
      throw error;
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Assign cost code to project error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update budget for a project cost code
export const updateProjectCostCodeBudget = async (req, res) => {
  try {
    const { projectId, costCodeId } = req.params;
    const { company_id } = req.user;
    const {
      budgeted_hours,
      budgeted_labor_cost,
      budgeted_quantity,
      budgeted_unit_cost,
      notes,
      is_active
    } = req.body;

    // Verify project belongs to company
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, company_id')
      .eq('id', projectId)
      .eq('company_id', company_id)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Build update object with only provided fields
    const updates = {};
    if (budgeted_hours !== undefined) updates.budgeted_hours = budgeted_hours;
    if (budgeted_labor_cost !== undefined) updates.budgeted_labor_cost = budgeted_labor_cost;
    if (budgeted_quantity !== undefined) updates.budgeted_quantity = budgeted_quantity;
    if (budgeted_unit_cost !== undefined) updates.budgeted_unit_cost = budgeted_unit_cost;
    if (notes !== undefined) updates.notes = notes;
    if (is_active !== undefined) updates.is_active = is_active;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data, error } = await supabase
      .from('project_cost_codes')
      .update(updates)
      .eq('project_id', projectId)
      .eq('cost_code_id', costCodeId)
      .select(`
        *,
        cost_code:cost_codes(id, code, name, unit_of_measure)
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Project cost code assignment not found' });
      }
      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error('Update project cost code budget error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Remove a cost code from a project
export const removeCostCodeFromProject = async (req, res) => {
  try {
    const { projectId, costCodeId } = req.params;
    const { company_id } = req.user;

    // Verify project belongs to company
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, company_id')
      .eq('id', projectId)
      .eq('company_id', company_id)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { data, error } = await supabase
      .from('project_cost_codes')
      .delete()
      .eq('project_id', projectId)
      .eq('cost_code_id', costCodeId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Project cost code assignment not found' });
      }
      throw error;
    }

    res.json({ message: 'Cost code removed from project', data });
  } catch (error) {
    console.error('Remove cost code from project error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get budget summary for a project (using v_budget_vs_actual view)
export const getProjectBudgetSummary = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { company_id } = req.user;

    // First verify project belongs to company
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, company_id')
      .eq('id', projectId)
      .eq('company_id', company_id)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get budget vs actual data from view
    const { data: costCodeDetails, error: detailsError } = await supabase
      .from('v_budget_vs_actual')
      .select('*')
      .eq('project_id', projectId);

    if (detailsError) throw detailsError;

    // Calculate totals
    const totals = costCodeDetails.reduce((acc, row) => {
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

    // Calculate overall percentages
    totals.overall_hours_percent = totals.total_budgeted_hours > 0
      ? Math.round((totals.total_actual_hours / totals.total_budgeted_hours) * 100 * 100) / 100
      : 0;
    totals.overall_cost_percent = totals.total_budgeted_labor_cost > 0
      ? Math.round((totals.total_actual_labor_cost / totals.total_budgeted_labor_cost) * 100 * 100) / 100
      : 0;
    totals.hours_variance = totals.total_budgeted_hours - totals.total_actual_hours;
    totals.cost_variance = totals.total_budgeted_labor_cost - totals.total_actual_labor_cost;

    res.json({
      project: {
        id: project.id,
        name: project.name
      },
      totals,
      cost_codes: costCodeDetails
    });
  } catch (error) {
    console.error('Get project budget summary error:', error);
    res.status(500).json({ error: error.message });
  }
};