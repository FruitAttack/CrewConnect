import { supabase } from '../utils/supabase.js';

/**
 * Assign employee to foreman
 * POST /api/employee-assignments
 */
export async function assignEmployee(req, res) {
  try {
    const { foreman_id, employee_id } = req.body;

    // Validate required fields
    if (!foreman_id || !employee_id) {
      return res.status(400).json({ 
        message: 'foreman_id and employee_id are required' 
      });
    }

    // Prevent self-assignment
    if (foreman_id === employee_id) {
      return res.status(400).json({ 
        message: 'Cannot assign employee to themselves' 
      });
    }

    // Verify foreman role
    const { data: foremanRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role_key')
      .eq('user_id', foreman_id)
      .single();

    if (roleError || !foremanRole || foremanRole.role_key !== 'foreman') {
      return res.status(400).json({ 
        message: 'User is not a foreman' 
      });
    }

    // Check if assignment already exists
    const { data: existing } = await supabase
      .from('employee_assignments')
      .select('*')
      .eq('foreman_id', foreman_id)
      .eq('employee_id', employee_id)
      .single();

    if (existing) {
      return res.status(400).json({ 
        message: 'Employee is already assigned to this foreman' 
      });
    }

    // Create assignment
    const { data, error } = await supabase
      .from('employee_assignments')
      .insert({
        foreman_id,
        employee_id
      })
      .select(`
        *,
        foreman:foreman_id(id, full_name, email),
        employee:employee_id(id, full_name, email, phone)
      `)
      .single();

    if (error) {
      console.error('Assign employee error:', error);
      return res.status(400).json({ message: error.message });
    }

    return res.status(201).json({
      message: 'Employee assigned successfully',
      assignment: data
    });

  } catch (err) {
    console.error('Assign employee error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Remove employee from foreman
 * DELETE /api/employee-assignments/:foreman_id/:employee_id
 */
export async function unassignEmployee(req, res) {
  try {
    const { foreman_id, employee_id } = req.params;

    const { error } = await supabase
      .from('employee_assignments')
      .delete()
      .eq('foreman_id', foreman_id)
      .eq('employee_id', employee_id);

    if (error) {
      console.error('Unassign employee error:', error);
      return res.status(400).json({ message: error.message });
    }

    return res.status(200).json({
      message: 'Employee unassigned successfully'
    });

  } catch (err) {
    console.error('Unassign employee error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Get foreman's crew (all assigned employees)
 * GET /api/employee-assignments/foreman/:foreman_id
 */
export async function getForemanCrew(req, res) {
  try {
    const { foreman_id } = req.params;

    const { data, error } = await supabase
      .from('employee_assignments')
      .select(`
        assigned_at,
        employee:employee_id(
          id,
          full_name,
          email,
          phone,
          is_active,
          user_roles(role_key, roles(label))
        )
      `)
      .eq('foreman_id', foreman_id)
      .order('assigned_at', { ascending: false });

    if (error) {
      console.error('Get foreman crew error:', error);
      return res.status(500).json({ message: 'Failed to get foreman crew' });
    }

    return res.status(200).json({ 
      crew: data.map(item => ({
        ...item.employee,
        assigned_at: item.assigned_at
      }))
    });

  } catch (err) {
    console.error('Get foreman crew error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Get employee's foreman
 * GET /api/employee-assignments/employee/:employee_id
 */
export async function getEmployeeForeman(req, res) {
  try {
    const { employee_id } = req.params;

    const { data, error } = await supabase
      .from('employee_assignments')
      .select(`
        assigned_at,
        foreman:foreman_id(
          id,
          full_name,
          email,
          phone,
          is_active,
          user_roles(role_key, roles(label))
        )
      `)
      .eq('employee_id', employee_id)
      .single();

    if (error) {
      // No foreman assigned is not an error
      if (error.code === 'PGRST116') {
        return res.status(200).json({ 
          foreman: null,
          message: 'No foreman assigned'
        });
      }
      console.error('Get employee foreman error:', error);
      return res.status(500).json({ message: 'Failed to get employee foreman' });
    }

    return res.status(200).json({ 
      foreman: {
        ...data.foreman,
        assigned_at: data.assigned_at
      }
    });

  } catch (err) {
    console.error('Get employee foreman error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Get all assignments for a company
 * GET /api/employee-assignments?company_id=xxx
 */
export async function getAllAssignments(req, res) {
  try {
    const { company_id } = req.query;

    if (!company_id) {
      return res.status(400).json({ message: 'company_id is required' });
    }

    // Get all foremen for the company
    const { data: foremen, error: foremenError } = await supabase
      .from('user_roles')
      .select('user_id, users!inner(id, full_name, email)')
      .eq('company_id', company_id)
      .eq('role_key', 'foreman');

    if (foremenError) {
      console.error('Get foremen error:', foremenError);
      return res.status(500).json({ message: 'Failed to get assignments' });
    }

    // Get assignments for each foreman
    const assignments = await Promise.all(
      foremen.map(async (foreman) => {
        const { data: crew } = await supabase
          .from('employee_assignments')
          .select(`
            assigned_at,
            employee:employee_id(id, full_name, email, is_active)
          `)
          .eq('foreman_id', foreman.user_id);

        return {
          foreman: foreman.users,
          crew: crew?.map(c => ({
            ...c.employee,
            assigned_at: c.assigned_at
          })) || []
        };
      })
    );

    return res.status(200).json({ assignments });

  } catch (err) {
    console.error('Get all assignments error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Bulk assign employees to foreman
 * POST /api/employee-assignments/bulk
 */
export async function bulkAssignEmployees(req, res) {
  try {
    const { foreman_id, employee_ids } = req.body;

    if (!foreman_id || !Array.isArray(employee_ids) || employee_ids.length === 0) {
      return res.status(400).json({ 
        message: 'foreman_id and employee_ids array are required' 
      });
    }

    // Verify foreman role
    const { data: foremanRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role_key')
      .eq('user_id', foreman_id)
      .single();

    if (roleError || !foremanRole || foremanRole.role_key !== 'foreman') {
      return res.status(400).json({ 
        message: 'User is not a foreman' 
      });
    }

    // Remove self from list
    const validEmployeeIds = employee_ids.filter(id => id !== foreman_id);

    if (validEmployeeIds.length === 0) {
      return res.status(400).json({ 
        message: 'No valid employee IDs to assign' 
      });
    }

    // Create assignments (upsert to handle duplicates gracefully)
    const assignments = validEmployeeIds.map(employee_id => ({
      foreman_id,
      employee_id
    }));

    const { data, error } = await supabase
      .from('employee_assignments')
      .upsert(assignments, { 
        onConflict: 'foreman_id,employee_id',
        ignoreDuplicates: true 
      })
      .select();

    if (error) {
      console.error('Bulk assign error:', error);
      return res.status(400).json({ message: error.message });
    }

    return res.status(201).json({
      message: `Successfully assigned ${data.length} employees`,
      assignments: data
    });

  } catch (err) {
    console.error('Bulk assign error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Reassign employee from one foreman to another
 * PUT /api/employee-assignments/reassign
 */
export async function reassignEmployee(req, res) {
  try {
    const { employee_id, old_foreman_id, new_foreman_id } = req.body;

    if (!employee_id || !old_foreman_id || !new_foreman_id) {
      return res.status(400).json({ 
        message: 'employee_id, old_foreman_id, and new_foreman_id are required' 
      });
    }

    // Verify new foreman role
    const { data: foremanRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role_key')
      .eq('user_id', new_foreman_id)
      .single();

    if (roleError || !foremanRole || foremanRole.role_key !== 'foreman') {
      return res.status(400).json({ 
        message: 'New user is not a foreman' 
      });
    }

    // Delete old assignment
    await supabase
      .from('employee_assignments')
      .delete()
      .eq('foreman_id', old_foreman_id)
      .eq('employee_id', employee_id);

    // Create new assignment
    const { data, error } = await supabase
      .from('employee_assignments')
      .insert({
        foreman_id: new_foreman_id,
        employee_id
      })
      .select(`
        *,
        foreman:foreman_id(id, full_name, email),
        employee:employee_id(id, full_name, email)
      `)
      .single();

    if (error) {
      console.error('Reassign employee error:', error);
      return res.status(400).json({ message: error.message });
    }

    return res.status(200).json({
      message: 'Employee reassigned successfully',
      assignment: data
    });

  } catch (err) {
    console.error('Reassign employee error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}