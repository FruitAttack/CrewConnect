import { supabase } from '../utils/supabase.js';

/**
 * Get all projects for user's company
 * GET /api/projects?active=true
 */
export async function getAllProjects(req, res) {
  try {
    const { active, customer_id, parent_id } = req.query;
    
    // Use query param if provided, otherwise use user's default company
    const company_id = req.query.company_id || req.user?.default_company_id;

    if (!company_id) {
      return res.status(400).json({ message: 'company_id is required' });
    }

    let query = supabase
      .from('projects')
      .select(`
        *,
        customers:customer_id(id, name),
        parent:parent_id(id, name)   
      `)
      .eq('company_id', company_id)
      .order('name', { ascending: true });

    // Filter by active status
    if (active !== undefined) {
      query = query.eq('active', active === 'true');
    }

    // Filter by customer
    if (customer_id) {
      query = query.eq('customer_id', customer_id);
    }

    // Filter by parent (for sub-projects)
    if (parent_id) {
      query = query.eq('parent_id', parent_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get projects error:', error);
      return res.status(500).json({ message: 'Failed to get projects' });
    }

    return res.status(200).json({ projects: data });

  } catch (err) {
    console.error('Get projects error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Get single project by ID
 * GET /api/projects/:id
 */
export async function getProject(req, res) {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        customers:customer_id(id, name, contact_name, contact_email),
        parent:parent_id(id, name),
        sub_projects:projects!parent_id(id, name, active)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Get project error:', error);
      if (error.code === 'PGRST116') {
        return res.status(404).json({ message: 'Project not found' });
      }
      return res.status(500).json({ message: 'Failed to get project' });
    }

    return res.status(200).json({ project: data });

  } catch (err) {
    console.error('Get project error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Create new project
 * POST /api/projects
 */
export async function createProject(req, res) {
  try {
    const {
      company_id,
      customer_id,
      name,
      address,
      lat,
      lng,
      geofence_m,
      parent_id
    } = req.body;

    // Validate required fields
    if (!company_id || !name) {
      return res.status(400).json({ 
        message: 'company_id and name are required' 
      });
    }

    const newProject = {
      company_id,
      customer_id: customer_id || null,
      name,
      address: address || null,
      lat: lat || null,
      lng: lng || null,
      geofence_m: geofence_m || null,
      parent_id: parent_id || null,
      active: true
    };

    const { data, error } = await supabase
      .from('projects')
      .insert(newProject)
      .select()
      .single();

    if (error) {
      console.error('Create project error:', error);
      return res.status(400).json({ message: error.message });
    }

    return res.status(201).json({
      message: 'Project created successfully',
      project: data
    });

  } catch (err) {
    console.error('Create project error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Update project
 * PUT /api/projects/:id
 */
export async function updateProject(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated
    delete updates.id;
    delete updates.company_id;
    delete updates.created_at;

    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update project error:', error);
      return res.status(400).json({ message: error.message });
    }

    return res.status(200).json({
      message: 'Project updated successfully',
      project: data
    });

  } catch (err) {
    console.error('Update project error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Soft delete project (set active = false)
 * DELETE /api/projects/:id
 */
export async function deleteProject(req, res) {
  try {
    const { id } = req.params;
    const { hard_delete } = req.query;

    if (hard_delete === 'true') {
      // Hard delete (Admin only - should add auth check)
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete project error:', error);
        return res.status(400).json({ message: error.message });
      }

      return res.status(200).json({
        message: 'Project permanently deleted'
      });

    } else {
      // Soft delete (set active = false)
      const { data, error } = await supabase
        .from('projects')
        .update({ active: false })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Deactivate project error:', error);
        return res.status(400).json({ message: error.message });
      }

      return res.status(200).json({
        message: 'Project deactivated successfully',
        project: data
      });
    }

  } catch (err) {
    console.error('Delete project error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Reactivate project
 * PATCH /api/projects/:id/activate
 */
export async function activateProject(req, res) {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('projects')
      .update({ active: true })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Activate project error:', error);
      return res.status(400).json({ message: error.message });
    }

    return res.status(200).json({
      message: 'Project activated successfully',
      project: data
    });

  } catch (err) {
    console.error('Activate project error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Get project labor summary
 * GET /api/projects/:id/labor-summary?start_date=2025-01-01&end_date=2025-01-31
 */
export async function getProjectLaborSummary(req, res) {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;

    const { data, error } = await supabase.rpc('get_project_labor_summary', {
      p_project_id: id,
      p_start_date: start_date || null,
      p_end_date: end_date || null
    });

    if (error) {
      console.error('Get labor summary error:', error);
      return res.status(500).json({ message: 'Failed to get labor summary' });
    }

    return res.status(200).json({ summary: data });

  } catch (err) {
    console.error('Get labor summary error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Get project cost breakdown by cost code
 * GET /api/projects/:id/cost-breakdown?start_date=2025-01-01&end_date=2025-01-31
 */
export async function getProjectCostBreakdown(req, res) {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;

    const { data, error } = await supabase.rpc('get_project_cost_breakdown', {
      p_project_id: id,
      p_start_date: start_date || null,
      p_end_date: end_date || null
    });

    if (error) {
      console.error('Get cost breakdown error:', error);
      return res.status(500).json({ message: 'Failed to get cost breakdown' });
    }

    return res.status(200).json({ breakdown: data });

  } catch (err) {
    console.error('Get cost breakdown error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}