import { supabase } from '../utils/supabase.js';

/**
 * Get all equipment for a company
 * GET /api/equipment?company_id=xxx&active=true&type=truck
 */
export async function getAllEquipment(req, res) {
  try {
    const { active, type } = req.query;
    
    const company_id = req.query.company_id || req.user?.default_company_id;

    if (!company_id) {
      return res.status(400).json({ message: 'company_id is required' });   
    }

    let query = supabase
      .from('equipment')
      .select('*')
      .eq('company_id', company_id)
      .order('type', { ascending: true })
      .order('label', { ascending: true });

    // Filter by active status
    if (active !== undefined) {
      query = query.eq('active', active === 'true');
    }

    // Filter by type
    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get equipment error:', error);
      return res.status(500).json({ message: 'Failed to get equipment' });
    }

    return res.status(200).json({ equipment: data });

  } catch (err) {
    console.error('Get equipment error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Get single equipment by ID
 * GET /api/equipment/:id
 */
export async function getEquipment(req, res) {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('equipment')
      .select(`
        *,
        company:company_id(id, name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Get equipment error:', error);
      if (error.code === 'PGRST116') {
        return res.status(404).json({ message: 'Equipment not found' });
      }
      return res.status(500).json({ message: 'Failed to get equipment' });
    }

    return res.status(200).json({ equipment: data });

  } catch (err) {
    console.error('Get equipment error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Create new equipment
 * POST /api/equipment
 */
export async function createEquipment(req, res) {
  try {
    const {
      company_id,
      type,
      label,
      model,
      active
    } = req.body;

    // Validate required fields
    if (!company_id || !type || !label) {
      return res.status(400).json({ 
        message: 'company_id, type, and label are required' 
      });
    }

    const newEquipment = {
      company_id,
      type,
      label,
      model: model || null,
      active: active !== undefined ? active : true
    };

    const { data, error } = await supabase
      .from('equipment')
      .insert(newEquipment)
      .select()
      .single();

    if (error) {
      console.error('Create equipment error:', error);
      return res.status(400).json({ message: error.message });
    }

    return res.status(201).json({
      message: 'Equipment created successfully',
      equipment: data
    });

  } catch (err) {
    console.error('Create equipment error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Update equipment
 * PUT /api/equipment/:id
 */
export async function updateEquipment(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated
    delete updates.id;
    delete updates.company_id;
    delete updates.created_at;

    const { data, error } = await supabase
      .from('equipment')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update equipment error:', error);
      return res.status(400).json({ message: error.message });
    }

    return res.status(200).json({
      message: 'Equipment updated successfully',
      equipment: data
    });

  } catch (err) {
    console.error('Update equipment error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Soft delete equipment (set active = false)
 * DELETE /api/equipment/:id
 */
export async function deleteEquipment(req, res) {
  try {
    const { id } = req.params;
    const { hard_delete } = req.query;

    if (hard_delete === 'true') {
      // Hard delete (Admin only)
      // Check if equipment has time entries
      const { data: timeEntries, error: checkError } = await supabase
        .from('time_entries')
        .select('id')
        .eq('equipment_id', id)
        .limit(1);

      if (checkError) {
        console.error('Check time entries error:', checkError);
        return res.status(500).json({ message: 'Failed to check equipment usage' });
      }

      if (timeEntries && timeEntries.length > 0) {
        return res.status(400).json({ 
          message: 'Cannot delete equipment with time entries. Deactivate instead.' 
        });
      }

      const { error } = await supabase
        .from('equipment')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete equipment error:', error);
        return res.status(400).json({ message: error.message });
      }

      return res.status(200).json({
        message: 'Equipment permanently deleted'
      });

    } else {
      // Soft delete (set active = false)
      const { data, error } = await supabase
        .from('equipment')
        .update({ active: false })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Deactivate equipment error:', error);
        return res.status(400).json({ message: error.message });
      }

      return res.status(200).json({
        message: 'Equipment deactivated successfully',
        equipment: data
      });
    }

  } catch (err) {
    console.error('Delete equipment error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Reactivate equipment
 * PATCH /api/equipment/:id/activate
 */
export async function activateEquipment(req, res) {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('equipment')
      .update({ active: true })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Activate equipment error:', error);
      return res.status(400).json({ message: error.message });
    }

    return res.status(200).json({
      message: 'Equipment activated successfully',
      equipment: data
    });

  } catch (err) {
    console.error('Activate equipment error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Get equipment types for a company
 * GET /api/equipment/types?company_id=xxx
 */
export async function getEquipmentTypes(req, res) {
  try {
    const company_id = req.query.company_id || req.user?.default_company_id;

    if (!company_id) {
      return res.status(400).json({ message: 'company_id is required' });   
    }
    
    const { data, error } = await supabase
      .from('equipment')
      .select('type')
      .eq('company_id', company_id)
      .order('type', { ascending: true });

    if (error) {
      console.error('Get equipment types error:', error);
      return res.status(500).json({ message: 'Failed to get equipment types' });
    }

    // Get unique types
    const uniqueTypes = [...new Set(data.map(item => item.type))];

    return res.status(200).json({ types: uniqueTypes });

  } catch (err) {
    console.error('Get equipment types error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Get equipment usage summary
 * GET /api/equipment/:id/usage?start_date=2025-01-01&end_date=2025-01-31
 */
export async function getEquipmentUsage(req, res) {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;

    let query = supabase
      .from('time_entries')
      .select(`
        id,
        clock_in,
        clock_out,
        user_id,
        users:user_id(id, full_name),
        projects:project_id(id, name)
      `)
      .eq('equipment_id', id)
      .order('clock_in', { ascending: false });

    if (start_date) {
      query = query.gte('clock_in', start_date);
    }
    if (end_date) {
      query = query.lte('clock_in', end_date);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get equipment usage error:', error);
      return res.status(500).json({ message: 'Failed to get equipment usage' });
    }

    // Calculate total hours
    const totalHours = data.reduce((sum, entry) => {
      if (entry.clock_in && entry.clock_out) {
        const hours = (new Date(entry.clock_out) - new Date(entry.clock_in)) / (1000 * 60 * 60);
        return sum + hours;
      }
      return sum;
    }, 0);

    return res.status(200).json({ 
      usage: data,
      total_entries: data.length,
      total_hours: Math.round(totalHours * 100) / 100
    });

  } catch (err) {
    console.error('Get equipment usage error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}
