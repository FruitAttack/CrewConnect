import { supabase } from '../utils/supabase.js';

// Get all daily production entries for the user's company
export const getAllDailyProduction = async (req, res) => {
  try {
    const { company_id } = req.user;
    const { project_id, cost_code_id, start_date, end_date, entered_by } = req.query;

    let query = supabase
      .from('daily_production')
      .select(`
        *,
        project:projects(id, name),
        cost_code:cost_codes(id, code, name, unit_of_measure),
        entered_by_user:users!daily_production_entered_by_fkey(id, full_name),
        approved_by_user:users!daily_production_approved_by_fkey(id, full_name)
      `)
      .eq('company_id', company_id)
      .order('production_date', { ascending: false });

    if (project_id) query = query.eq('project_id', project_id);
    if (cost_code_id) query = query.eq('cost_code_id', cost_code_id);
    if (entered_by) query = query.eq('entered_by', entered_by);
    if (start_date) query = query.gte('production_date', start_date);
    if (end_date) query = query.lte('production_date', end_date);

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Get all daily production error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get single daily production entry
export const getDailyProduction = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user;

    const { data, error } = await supabase
      .from('daily_production')
      .select(`
        *,
        project:projects(id, name, address),
        cost_code:cost_codes(id, code, name, unit_of_measure),
        entered_by_user:users!daily_production_entered_by_fkey(id, full_name),
        approved_by_user:users!daily_production_approved_by_fkey(id, full_name)
      `)
      .eq('id', id)
      .eq('company_id', company_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Daily production entry not found' });
      }
      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error('Get daily production error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create daily production entry (foreman/admin)
export const createDailyProduction = async (req, res) => {
  try {
    const { company_id, id: user_id } = req.user;
    const { 
      project_id, 
      cost_code_id, 
      production_date, 
      quantity, 
      unit_of_measure,
      notes 
    } = req.body;

    // Validation
    if (!project_id || !cost_code_id || !quantity) {
      return res.status(400).json({ 
        error: 'project_id, cost_code_id, and quantity are required' 
      });
    }

    if (quantity < 0) {
      return res.status(400).json({ error: 'Quantity must be non-negative' });
    }

    // Verify project belongs to company
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, company_id')
      .eq('id', project_id)
      .eq('company_id', company_id)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify cost code belongs to company
    const { data: costCode, error: costCodeError } = await supabase
      .from('cost_codes')
      .select('id, company_id, unit_of_measure')
      .eq('id', cost_code_id)
      .eq('company_id', company_id)
      .single();

    if (costCodeError || !costCode) {
      return res.status(404).json({ error: 'Cost code not found' });
    }

    const { data, error } = await supabase
      .from('daily_production')
      .insert({
        company_id,
        project_id,
        cost_code_id,
        production_date: production_date || new Date().toISOString().split('T')[0],
        quantity,
        unit_of_measure: unit_of_measure || costCode.unit_of_measure,
        entered_by: user_id,
        notes
      })
      .select(`
        *,
        project:projects(id, name),
        cost_code:cost_codes(id, code, name, unit_of_measure)
      `)
      .single();

    if (error) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        return res.status(409).json({ 
          error: 'Production entry already exists for this project/cost code/date combination' 
        });
      }
      throw error;
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Create daily production error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update daily production entry
export const updateDailyProduction = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id, id: user_id, role } = req.user;
    const { quantity, unit_of_measure, notes, production_date } = req.body;

    // First check if entry exists and user can edit it
    const { data: existing, error: fetchError } = await supabase
      .from('daily_production')
      .select('*')
      .eq('id', id)
      .eq('company_id', company_id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Daily production entry not found' });
    }

    // Only the person who entered it or admin can edit
    if (existing.entered_by !== user_id && !['admin', 'owner'].includes(role)) {
      return res.status(403).json({ error: 'Not authorized to edit this entry' });
    }

    // Build update object
    const updates = {};
    if (quantity !== undefined) {
      if (quantity < 0) {
        return res.status(400).json({ error: 'Quantity must be non-negative' });
      }
      updates.quantity = quantity;
    }
    if (unit_of_measure !== undefined) updates.unit_of_measure = unit_of_measure;
    if (notes !== undefined) updates.notes = notes;
    if (production_date !== undefined) updates.production_date = production_date;

    const { data, error } = await supabase
      .from('daily_production')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        project:projects(id, name),
        cost_code:cost_codes(id, code, name, unit_of_measure)
      `)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Update daily production error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete daily production entry (admin only)
export const deleteDailyProduction = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user;

    const { data, error } = await supabase
      .from('daily_production')
      .delete()
      .eq('id', id)
      .eq('company_id', company_id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Daily production entry not found' });
      }
      throw error;
    }

    res.json({ message: 'Daily production entry deleted', data });
  } catch (error) {
    console.error('Delete daily production error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get daily production by project
export const getDailyProductionByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { company_id } = req.user;
    const { start_date, end_date } = req.query;

    let query = supabase
      .from('daily_production')
      .select(`
        *,
        cost_code:cost_codes(id, code, name, unit_of_measure),
        entered_by_user:users!daily_production_entered_by_fkey(id, full_name)
      `)
      .eq('project_id', projectId)
      .eq('company_id', company_id)
      .order('production_date', { ascending: false });

    if (start_date) query = query.gte('production_date', start_date);
    if (end_date) query = query.lte('production_date', end_date);

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Get daily production by project error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get daily production by date (for foreman daily view)
export const getDailyProductionByDate = async (req, res) => {
  try {
    const { company_id, id: user_id } = req.user;
    const { date, project_id } = req.query;

    const targetDate = date || new Date().toISOString().split('T')[0];

    let query = supabase
      .from('daily_production')
      .select(`
        *,
        project:projects(id, name),
        cost_code:cost_codes(id, code, name, unit_of_measure)
      `)
      .eq('company_id', company_id)
      .eq('production_date', targetDate)
      .order('created_at', { ascending: false });

    if (project_id) query = query.eq('project_id', project_id);

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Get daily production by date error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get daily production summary (aggregated by cost code)
export const getDailyProductionSummary = async (req, res) => {
  try {
    const { company_id } = req.user;
    const { project_id, start_date, end_date } = req.query;

    // Use the v_actual_production view for aggregated data
    let query = supabase
      .from('v_actual_production')
      .select('*')
      .eq('company_id', company_id);

    if (project_id) query = query.eq('project_id', project_id);

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Get daily production summary error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Approve daily production entry (admin/supervisor)
export const approveDailyProduction = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id, id: user_id } = req.user;

    const { data, error } = await supabase
      .from('daily_production')
      .update({
        approved_by: user_id,
        approved_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('company_id', company_id)
      .select(`
        *,
        project:projects(id, name),
        cost_code:cost_codes(id, code, name, unit_of_measure),
        approved_by_user:users!daily_production_approved_by_fkey(id, full_name)
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Daily production entry not found' });
      }
      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error('Approve daily production error:', error);
    res.status(500).json({ error: error.message });
  }
};