import { supabase } from '../utils/supabase.js';

/**
 * Create a new user (Admin only)
 * POST /api/users
 */
export async function createUser(req, res) {
  try {
    const {
      email,
      password,
      full_name,
      phone,
      company_id,
      role_key,
      is_active,
      can_view_rates,
      // Employment fields — stored in user_employment, not users
      pay_type,
      hourly_rate,
      salary_annual,
      ot_after_hours_per_day,
      ot_multiplier
    } = req.body;

    // Validate required fields
    if (!email || !password || !company_id) {
      return res.status(400).json({ 
        message: 'email, password, and company_id are required' 
      });
    }

    // Create auth user first
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || null,
        phone: phone || null
      }
    });

    if (authError) {
      console.error('Create auth user error:', authError);
      return res.status(400).json({ message: authError.message });
    }

    const userId = authData.user.id;

    // Create profile in app.users
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        full_name: full_name || null,
        phone: phone || null,
        default_company_id: company_id,
        role_key: role_key || null,
        is_active: is_active !== undefined ? is_active : true,
        can_view_rates: can_view_rates || false
      })
      .select()
      .single();

    if (profileError) {
      console.error('Create profile error:', profileError);
      // Cleanup: delete the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(userId);
      return res.status(400).json({ message: profileError.message });
    }

    // Assign user role for company
    if (role_key) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          company_id: company_id,
          role_key: role_key
        });

      if (roleError) {
        console.error('Assign role error:', roleError);
        // Continue anyway, role can be assigned later
      }
    }

    // Create user_employment record if pay info provided
    let employmentData = null;
    if (pay_type) {
      const { data: empData, error: empError } = await supabase
        .from('user_employment')
        .insert({
          user_id: userId,
          company_id,
          pay_type,
          hourly_rate: pay_type === 'hourly' ? (hourly_rate || null) : null,
          salary_annual: pay_type === 'salary' ? (salary_annual || null) : null,
          ot_after_hours_per_day: ot_after_hours_per_day || 8.0,
          ot_multiplier: ot_multiplier || 1.5,
          effective_from: new Date().toISOString().split('T')[0],
          is_active: true
        })
        .select()
        .single();

      if (empError) {
        console.error('Create employment error:', empError);
        // Non-fatal — user was created, employment can be set later via POST /users/:id/employment
      } else {
        employmentData = empData;
      }
    }

    return res.status(201).json({
      message: 'User created successfully',
      user: profileData,
      employment: employmentData
    });

  } catch (err) {
    console.error('Create user error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Get all users for a company
 * GET /api/users?company_id=xxx&active=true&role_key=employee
 */
export async function getAllUsers(req, res) {
  try {
    const { company_id, active, role_key, search } = req.query;

    // Build query without the problematic user_roles join
    let query = supabase
      .from('users')
      .select(`
        *,
        default_company:default_company_id(id, name)
      `)
      .order('full_name', { ascending: true });

    // Filter by company through default_company_id
    if (company_id) {
      query = query.eq('default_company_id', company_id);
    }

    // Filter by active status
    if (active !== undefined) {
      query = query.eq('is_active', active === 'true');
    }

    // Filter by role (using role_key on users table)
    if (role_key) {
      query = query.eq('role_key', role_key);
    }

    // Search by name or email
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get users error:', error);
      return res.status(500).json({ message: 'Failed to get users' });
    }

    // If we need roles from user_roles table, fetch them separately
    if (data && data.length > 0 && company_id) {
      const userIds = data.map(u => u.id);
      
      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role_key')
        .eq('company_id', company_id)
        .in('user_id', userIds);

      if (!rolesError && rolesData) {
        // Create a map of user_id -> role_key
        const roleMap = new Map(rolesData.map(r => [r.user_id, r.role_key]));
        
        // Merge role_key into user data (prefer user_roles over users.role_key)
        data.forEach(user => {
          user.role_key = roleMap.get(user.id) || user.role_key || null;
        });
      }

      // Fetch employment data
      const { data: employmentData, error: employmentError } = await supabase
        .from('user_employment')
        .select('user_id, pay_type, hourly_rate, salary_annual, is_active')
        .eq('company_id', company_id)
        .eq('is_active', true)
        .in('user_id', userIds);

      if (!employmentError && employmentData) {
        // Create a map of user_id -> employment records
        const employmentMap = new Map();
        employmentData.forEach(emp => {
          if (!employmentMap.has(emp.user_id)) {
            employmentMap.set(emp.user_id, []);
          }
          employmentMap.get(emp.user_id).push(emp);
        });
        
        // Merge employment into user data
        data.forEach(user => {
          user.user_employment = employmentMap.get(user.id) || [];
        });
      }
    }

    return res.status(200).json({ users: data });

  } catch (err) {
    console.error('Get users error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Get single user by ID
 * GET /api/users/:id
 */
export async function getUser(req, res) {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        default_company:default_company_id(id, name),
        user_addresses(
          id,
          label,
          line1,
          line2,
          city,
          region,
          postal_code,
          country
        ),
        user_devices(
          id,
          device_name,
          device_type,
          last_active
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Get user error:', error);
      if (error.code === 'PGRST116') {
        return res.status(404).json({ message: 'User not found' });
      }
      return res.status(500).json({ message: 'Failed to get user' });
    }

    // Fetch roles separately
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role_key, company_id')
      .eq('user_id', id);

    if (rolesData) {
      data.user_roles = rolesData;
      // Set role_key from first role or from users table
      data.role_key = rolesData[0]?.role_key || data.role_key || null;
    }

    // Fetch employment separately
    const { data: employmentData } = await supabase
      .from('user_employment')
      .select('id, pay_type, hourly_rate, salary_annual, ot_after_hours_per_day, ot_multiplier, effective_from, effective_to, is_active')
      .eq('user_id', id)
      .eq('is_active', true);

    if (employmentData) {
      data.user_employment = employmentData;
    }

    return res.status(200).json({ user: data });

  } catch (err) {
    console.error('Get user error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Get current authenticated user's profile
 * GET /api/users/me
 */
export async function getMe(req, res) {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Fetch full user data with company relationship
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        default_company:default_company_id(id, name)
      `)
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Get me error:', error);
      return res.status(500).json({ message: 'Failed to get user profile' });
    }

    // Fetch roles separately
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role_key, company_id')
      .eq('user_id', userId);

    if (rolesData) {
      data.roles = rolesData;
      // Set role_key from first role or from users table
      data.role_key = rolesData[0]?.role_key || data.role_key || null;
    }

    return res.status(200).json({ user: data });
  } catch (err) {
    console.error('Get me error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Update user profile
 * PUT /api/users/:id
 */
export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;
    const company_id = req.user?.default_company_id;

    // Extract role_key if present - this goes to user_roles table, not users
    const newRoleKey = updates.role_key;
    delete updates.role_key;

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.created_at;
    delete updates.email; // Email changes should go through Supabase Auth

    // Update users table (if there are any updates left)
    let userData = null;
    if (Object.keys(updates).length > 0) {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Update user error:', error);
        return res.status(400).json({ message: error.message });
      }
      userData = data;
    }

    // Update role in user_roles table if role_key was provided
    if (newRoleKey && company_id) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: id,
          company_id: company_id,
          role_key: newRoleKey
        }, {
          onConflict: 'user_id,company_id'
        });

      if (roleError) {
        console.error('Update user role error:', roleError);
        return res.status(400).json({ message: roleError.message });
      }
    }

    return res.status(200).json({
      message: 'User updated successfully',
      user: userData || { id }
    });

  } catch (err) {
    console.error('Update user error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Soft delete user (set is_active = false)
 * DELETE /api/users/:id
 */
export async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    const { hard_delete } = req.query;

    if (hard_delete === 'true') {
      // Hard delete (Admin only - should add auth check)
      // Delete from auth first
      const { error: authError } = await supabase.auth.admin.deleteUser(id);
      
      if (authError) {
        console.error('Delete auth user error:', authError);
        return res.status(400).json({ message: authError.message });
      }

      // Profile will be deleted automatically via foreign key cascade
      return res.status(200).json({
        message: 'User permanently deleted'
      });

    } else {
      // Soft delete (set is_active = false)
      const { data, error } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Deactivate user error:', error);
        return res.status(400).json({ message: error.message });
      }

      return res.status(200).json({
        message: 'User deactivated successfully',
        user: data
      });
    }

  } catch (err) {
    console.error('Delete user error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Reactivate user
 * PATCH /api/users/:id/activate
 */
export async function activateUser(req, res) {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('users')
      .update({ is_active: true })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Activate user error:', error);
      return res.status(400).json({ message: error.message });
    }

    return res.status(200).json({
      message: 'User activated successfully',
      user: data
    });

  } catch (err) {
    console.error('Activate user error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Assign user to company with role
 * POST /api/users/:id/assign-company
 */
export async function assignUserToCompany(req, res) {
  try {
    const { id } = req.params;
    const { company_id, role_key } = req.body;

    if (!company_id || !role_key) {
      return res.status(400).json({ 
        message: 'company_id and role_key are required' 
      });
    }

    const { data, error } = await supabase
      .from('user_roles')
      .upsert({
        user_id: id,
        company_id: company_id,
        role_key: role_key
      })
      .select();

    if (error) {
      console.error('Assign company error:', error);
      return res.status(400).json({ message: error.message });
    }

    return res.status(200).json({
      message: 'User assigned to company successfully',
      assignment: data[0]
    });

  } catch (err) {
    console.error('Assign company error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Update user employment info
 * POST /api/users/:id/employment
 */
export async function updateUserEmployment(req, res) {
  try {
    const { id } = req.params;
    const {
      company_id,
      pay_type,
      hourly_rate,
      salary_annual,
      ot_after_hours_per_day,
      ot_multiplier,
      effective_from
    } = req.body;

    if (!company_id || !pay_type) {
      return res.status(400).json({ 
        message: 'company_id and pay_type are required' 
      });
    }

    // Deactivate current employment records
    await supabase
      .from('user_employment')
      .update({ is_active: false, effective_to: new Date().toISOString().split('T')[0] })
      .eq('user_id', id)
      .eq('company_id', company_id)
      .eq('is_active', true);

    // Create new employment record
    const newEmployment = {
      user_id: id,
      company_id: company_id,
      pay_type: pay_type,
      hourly_rate: pay_type === 'hourly' ? hourly_rate : null,
      salary_annual: pay_type === 'salary' ? salary_annual : null,
      ot_after_hours_per_day: ot_after_hours_per_day || 8.0,
      ot_multiplier: ot_multiplier || 1.5,
      effective_from: effective_from || new Date().toISOString().split('T')[0],
      is_active: true
    };

    const { data, error } = await supabase
      .from('user_employment')
      .insert(newEmployment)
      .select()
      .single();

    if (error) {
      console.error('Update employment error:', error);
      return res.status(400).json({ message: error.message });
    }

    return res.status(201).json({
      message: 'Employment info updated successfully',
      employment: data
    });

  } catch (err) {
    console.error('Update employment error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Search users (full-text search)
 * GET /api/users/search?query=john&company_id=xxx
 */
export async function searchUsers(req, res) {
  try {
    const { query, company_id } = req.query;

    if (!query) {
      return res.status(400).json({ 
        message: 'query is required' 
      });
    }

    // Search without embedded user_roles join
    let searchQuery = supabase
      .from('users')
      .select('*')
      .eq('is_active', true)
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(20);

    // Filter by company via default_company_id
    if (company_id) {
      searchQuery = searchQuery.eq('default_company_id', company_id);
    }

    const { data, error } = await searchQuery;

    if (error) {
      console.error('Search users error:', error);
      return res.status(500).json({ message: 'Failed to search users' });
    }

    // Fetch roles separately if needed
    if (data && data.length > 0 && company_id) {
      const userIds = data.map(u => u.id);
      
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role_key')
        .eq('company_id', company_id)
        .in('user_id', userIds);

      if (rolesData) {
        const roleMap = new Map(rolesData.map(r => [r.user_id, r.role_key]));
        data.forEach(user => {
          user.role_key = roleMap.get(user.id) || user.role_key || null;
        });
      }
    }

    return res.status(200).json({ results: data });

  } catch (err) {
    console.error('Search users error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}