import { supabase } from '../utils/supabase.js';

// Get all cost codes for the company
export const getAllCostCodes = async (req, res) => {
  try {
    const company_id = req.user.company_id || req.user.default_company_id;
    const { active_only = 'false', parent_id } = req.query;

    let query = supabase
      .from('cost_codes')
      .select('id, code, name, parent_id, display_code, display_order, active, unit_of_measure, created_at')
      .eq('company_id', company_id)
      .order('display_order')
      .order('code');

    if (active_only === 'true') {
      query = query.eq('active', true);
    }

    if (parent_id === 'null') {
      query = query.is('parent_id', null);
    } else if (parent_id) {
      query = query.eq('parent_id', parent_id);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Get all cost codes error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get single cost code
export const getCostCode = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user;

    const { data, error } = await supabase
      .from('cost_codes')
      .select(`
        id, 
        code, 
        name, 
        parent_id, 
        display_code, 
        display_order, 
        active, 
        unit_of_measure,
        created_at,
        parent:cost_codes!cost_codes_parent_id_fkey(id, code, name)
      `)
      .eq('id', id)
      .eq('company_id', company_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Cost code not found' });
      }
      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error('Get cost code error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create cost code
export const createCostCode = async (req, res) => {
  try {
    const { company_id } = req.user;
    const { 
      code, 
      name, 
      parent_id, 
      display_code, 
      display_order,
      unit_of_measure
    } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: 'code and name are required' });
    }

    // If parent_id provided, verify it exists and belongs to company
    if (parent_id) {
      const { data: parent, error: parentError } = await supabase
        .from('cost_codes')
        .select('id')
        .eq('id', parent_id)
        .eq('company_id', company_id)
        .single();

      if (parentError || !parent) {
        return res.status(404).json({ error: 'Parent cost code not found' });
      }
    }

    const { data, error } = await supabase
      .from('cost_codes')
      .insert({
        company_id,
        code,
        name,
        parent_id,
        display_code,
        display_order: display_order || 0,
        unit_of_measure: unit_of_measure || 'hours',
        active: true
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Cost code already exists' });
      }
      throw error;
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Create cost code error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update cost code
export const updateCostCode = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user;
    const { 
      code, 
      name, 
      parent_id, 
      display_code, 
      display_order, 
      active,
      unit_of_measure
    } = req.body;

    // Build update object with only provided fields
    const updates = {};
    if (code !== undefined) updates.code = code;
    if (name !== undefined) updates.name = name;
    if (parent_id !== undefined) updates.parent_id = parent_id;
    if (display_code !== undefined) updates.display_code = display_code;
    if (display_order !== undefined) updates.display_order = display_order;
    if (active !== undefined) updates.active = active;
    if (unit_of_measure !== undefined) updates.unit_of_measure = unit_of_measure;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // If updating parent_id, verify it exists
    if (parent_id) {
      const { data: parent, error: parentError } = await supabase
        .from('cost_codes')
        .select('id')
        .eq('id', parent_id)
        .eq('company_id', company_id)
        .single();

      if (parentError || !parent) {
        return res.status(404).json({ error: 'Parent cost code not found' });
      }

      // Prevent circular reference
      if (parent_id === id) {
        return res.status(400).json({ error: 'Cost code cannot be its own parent' });
      }
    }

    const { data, error } = await supabase
      .from('cost_codes')
      .update(updates)
      .eq('id', id)
      .eq('company_id', company_id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Cost code not found' });
      }
      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error('Update cost code error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete cost code
export const deleteCostCode = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user;

    // Check if cost code has children
    const { data: children } = await supabase
      .from('cost_codes')
      .select('id')
      .eq('parent_id', id)
      .eq('company_id', company_id)
      .limit(1);

    if (children && children.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete cost code with children. Delete or reassign children first.' 
      });
    }

    // Check if cost code is used in time entries
    const { data: timeEntries } = await supabase
      .from('time_entries')
      .select('id')
      .eq('cost_code_id', id)
      .limit(1);

    if (timeEntries && timeEntries.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete cost code with time entries. Deactivate instead.' 
      });
    }

    const { data, error } = await supabase
      .from('cost_codes')
      .delete()
      .eq('id', id)
      .eq('company_id', company_id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Cost code not found' });
      }
      throw error;
    }

    res.json({ message: 'Cost code deleted', data });
  } catch (error) {
    console.error('Delete cost code error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Activate/deactivate cost code
export const activateCostCode = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user;
    const { active } = req.body;

    if (active === undefined) {
      return res.status(400).json({ error: 'active field is required' });
    }

    const { data, error } = await supabase
      .from('cost_codes')
      .update({ active })
      .eq('id', id)
      .eq('company_id', company_id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Cost code not found' });
      }
      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error('Activate cost code error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Search cost codes
export const searchCostCodes = async (req, res) => {
  try {
    const { company_id } = req.user;
    const { q, active_only = 'true', limit = 20 } = req.query;

    if (!q || q.length < 1) {
      return res.status(400).json({ error: 'Search query (q) is required' });
    }

    let query = supabase
      .from('cost_codes')
      .select('id, code, name, parent_id, display_code, active, unit_of_measure')
      .eq('company_id', company_id)
      .or(`code.ilike.%${q}%,name.ilike.%${q}%`)
      .order('code')
      .limit(parseInt(limit));

    if (active_only === 'true') {
      query = query.eq('active', true);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Search cost codes error:', error);
    res.status(500).json({ error: error.message });
  }
};