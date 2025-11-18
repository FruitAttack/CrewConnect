import { supabase } from '../utils/supabase.js';

/**
 * Get all cost codes for company
 * GET /api/cost-codes?company_id=xxx&active=true&parent_id=xxx
 */
export async function getAllCostCodes(req, res) {
  try {
    const { company_id, active, parent_id } = req.query;

    if (!company_id) {
      return res.status(400).json({ message: 'company_id is required' });
    }

    let query = supabase
      .from('cost_codes')
      .select(`
        *,
        parent:parent_id(id, code, name),
        children:cost_codes!parent_id(id, code, name, active)
      `)
      .eq('company_id', company_id)
      .order('display_order', { ascending: true });

    // Filter by active status
    if (active !== undefined) {
      query = query.eq('active', active === 'true');
    }

    // Filter by parent (for subcodes)
    if (parent_id === 'null') {
      query = query.is('parent_id', null); // Top-level codes
    } else if (parent_id) {
      query = query.eq('parent_id', parent_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get cost codes error:', error);
      return res.status(500).json({ message: 'Failed to get cost codes' });
    }

    return res.status(200).json({ cost_codes: data });

  } catch (err) {
    console.error('Get cost codes error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Get single cost code by ID
 * GET /api/cost-codes/:id
 */
export async function getCostCode(req, res) {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('cost_codes')
      .select(`
        *,
        parent:parent_id(id, code, name),
        children:cost_codes!parent_id(id, code, name, active)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Get cost code error:', error);
      if (error.code === 'PGRST116') {
        return res.status(404).json({ message: 'Cost code not found' });
      }
      return res.status(500).json({ message: 'Failed to get cost code' });
    }

    return res.status(200).json({ cost_code: data });

  } catch (err) {
    console.error('Get cost code error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Create new cost code
 * POST /api/cost-codes
 */
export async function createCostCode(req, res) {
  try {
    const {
      company_id,
      code,
      name,
      parent_id,
      display_code,
      display_order
    } = req.body;

    // Validate required fields
    if (!company_id || !code || !name) {
      return res.status(400).json({ 
        message: 'company_id, code, and name are required' 
      });
    }

    const newCostCode = {
      company_id,
      code,
      name,
      parent_id: parent_id || null,
      display_code: display_code || null,
      display_order: display_order || 0,
      active: true
    };

    const { data, error } = await supabase
      .from('cost_codes')
      .insert(newCostCode)
      .select()
      .single();

    if (error) {
      console.error('Create cost code error:', error);
      // Check for unique constraint violation
      if (error.code === '23505') {
        return res.status(400).json({ 
          message: 'Cost code already exists for this company' 
        });
      }
      return res.status(400).json({ message: error.message });
    }

    return res.status(201).json({
      message: 'Cost code created successfully',
      cost_code: data
    });

  } catch (err) {
    console.error('Create cost code error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Update cost code
 * PUT /api/cost-codes/:id
 */
export async function updateCostCode(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated
    delete updates.id;
    delete updates.company_id;
    delete updates.created_at;

    const { data, error } = await supabase
      .from('cost_codes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update cost code error:', error);
      return res.status(400).json({ message: error.message });
    }

    return res.status(200).json({
      message: 'Cost code updated successfully',
      cost_code: data
    });

  } catch (err) {
    console.error('Update cost code error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Soft delete cost code (set active = false)
 * DELETE /api/cost-codes/:id
 */
export async function deleteCostCode(req, res) {
  try {
    const { id } = req.params;
    const { hard_delete } = req.query;

    if (hard_delete === 'true') {
      // Hard delete (Admin only)
      const { error } = await supabase
        .from('cost_codes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete cost code error:', error);
        return res.status(400).json({ message: error.message });
      }

      return res.status(200).json({
        message: 'Cost code permanently deleted'
      });

    } else {
      // Soft delete
      const { data, error } = await supabase
        .from('cost_codes')
        .update({ active: false })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Deactivate cost code error:', error);
        return res.status(400).json({ message: error.message });
      }

      return res.status(200).json({
        message: 'Cost code deactivated successfully',
        cost_code: data
      });
    }

  } catch (err) {
    console.error('Delete cost code error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Reactivate cost code
 * PATCH /api/cost-codes/:id/activate
 */
export async function activateCostCode(req, res) {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('cost_codes')
      .update({ active: true })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Activate cost code error:', error);
      return res.status(400).json({ message: error.message });
    }

    return res.status(200).json({
      message: 'Cost code activated successfully',
      cost_code: data
    });

  } catch (err) {
    console.error('Activate cost code error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Search cost codes (full-text search)
 * GET /api/cost-codes/search?company_id=xxx&query=concrete
 */
export async function searchCostCodes(req, res) {
  try {
    const { company_id, query } = req.query;

    if (!company_id || !query) {
      return res.status(400).json({ 
        message: 'company_id and query are required' 
      });
    }

    const { data, error } = await supabase
      .from('cost_codes')
      .select('*')
      .eq('company_id', company_id)
      .eq('active', true)
      .textSearch('search_vector', query)
      .limit(20);

    if (error) {
      console.error('Search cost codes error:', error);
      return res.status(500).json({ message: 'Failed to search cost codes' });
    }

    return res.status(200).json({ results: data });

  } catch (err) {
    console.error('Search cost codes error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}