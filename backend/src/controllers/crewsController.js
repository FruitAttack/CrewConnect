import { supabase } from '../utils/supabase.js';

// Shared select query for crews with relations
const CREW_SELECT = `
  *,
  foreman:users!crews_foreman_id_fkey(id, full_name, email, phone, role_key),
  crew_members(
    id,
    role,
    assigned_at,
    user:users(id, full_name, email, phone, role_key, is_active)
  )
`;

/**
 * Get all crews for a company
 * GET /api/crews?company_id=xxx&active=true
 */
export async function getAllCrews(req, res) {
  try {
    const { active } = req.query;
    const company_id = req.query.company_id || req.user?.default_company_id;
    
    console.log('getAllCrews company_id:', company_id); // add this line

    if (!company_id) {
      return res.status(400).json({ message: 'company_id is required' });
    }

    let query = supabase
      .from('crews')
      .select(CREW_SELECT)
      .eq('company_id', company_id)
      .order('name', { ascending: true });

    if (active !== undefined) {
      query = query.eq('active', active === 'true');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get crews error:', error);
      return res.status(500).json({ message: 'Failed to get crews' });
    }

    return res.status(200).json({ crews: data });

  } catch (err) {
    console.error('Get crews error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Get single crew by ID
 * GET /api/crews/:id
 */
export async function getCrew(req, res) {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('crews')
      .select(CREW_SELECT)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Get crew error:', error);
      if (error.code === 'PGRST116') {
        return res.status(404).json({ message: 'Crew not found' });
      }
      return res.status(500).json({ message: 'Failed to get crew' });
    }

    return res.status(200).json({ crew: data });

  } catch (err) {
    console.error('Get crew error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Create new crew with optional members
 * POST /api/crews
 * Body: { company_id, name, foreman_id?, description?, member_ids?: string[] }
 */
export async function createCrew(req, res) {
  try {
    const { company_id, name, foreman_id, description, member_ids } = req.body;
    
    console.log('Creating crew with:', { company_id, name, foreman_id, description, member_ids }); // add this line

    if (!company_id || !name) {
      return res.status(400).json({ 
        message: 'company_id and name are required' 
      });
    }

    // Create the crew
    const { data: crew, error: crewError } = await supabase
      .from('crews')
      .insert({
        company_id,
        name,
        foreman_id: foreman_id || null,
        description: description || null,
        active: true
      })
      .select()
      .single();

    if (crewError) {
      console.error('Create crew error:', crewError);
      return res.status(400).json({ message: crewError.message });
    }

    // Add members if provided
    if (Array.isArray(member_ids) && member_ids.length > 0) {
      const members = member_ids.map(user_id => ({
        crew_id: crew.id,
        user_id,
        role: 'member'
      }));

      const { error: membersError } = await supabase
        .from('crew_members')
        .insert(members);

      if (membersError) {
        console.error('Add crew members error:', membersError);
        // Crew was created, but members failed — still return crew
        return res.status(201).json({
          message: 'Crew created but some members failed to add',
          crew
        });
      }
    }

    // Re-fetch with full relations
    const { data: fullCrew, error: fetchError } = await supabase
      .from('crews')
      .select(CREW_SELECT)
      .eq('id', crew.id)
      .single();

    if (fetchError) {
      console.error('Re-fetch crew error:', fetchError);
      return res.status(201).json({
        message: 'Crew created successfully',
        crew
      });
    }

    return res.status(201).json({
      message: 'Crew created successfully',
      crew: fullCrew
    });

  } catch (err) {
    console.error('Create crew error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Update crew details and/or members
 * PUT /api/crews/:id
 * Body: { name?, foreman_id?, description?, active?, member_ids?: string[] }
 */
export async function updateCrew(req, res) {
  try {
    const { id } = req.params;
    const { member_ids, ...fields } = req.body;

    // Remove fields that shouldn't be updated
    delete fields.id;
    delete fields.company_id;
    delete fields.created_at;

    // Build update payload
    const updates = { ...fields, updated_at: new Date().toISOString() };

    const { error: updateError } = await supabase
      .from('crews')
      .update(updates)
      .eq('id', id);

    if (updateError) {
      console.error('Update crew error:', updateError);
      return res.status(400).json({ message: updateError.message });
    }

    // Sync members if provided (full replace)
    if (member_ids !== undefined) {
      // Remove existing members
      const { error: delError } = await supabase
        .from('crew_members')
        .delete()
        .eq('crew_id', id);

      if (delError) {
        console.error('Delete crew members error:', delError);
        return res.status(400).json({ message: delError.message });
      }

      // Add new members
      if (Array.isArray(member_ids) && member_ids.length > 0) {
        const members = member_ids.map(user_id => ({
          crew_id: id,
          user_id,
          role: 'member'
        }));

        const { error: insError } = await supabase
          .from('crew_members')
          .insert(members);

        if (insError) {
          console.error('Insert crew members error:', insError);
          return res.status(400).json({ message: insError.message });
        }
      }
    }

    // Re-fetch with full relations
    const { data: fullCrew, error: fetchError } = await supabase
      .from('crews')
      .select(CREW_SELECT)
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Re-fetch crew error:', fetchError);
      return res.status(200).json({ message: 'Crew updated successfully' });
    }

    return res.status(200).json({
      message: 'Crew updated successfully',
      crew: fullCrew
    });

  } catch (err) {
    console.error('Update crew error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Delete crew (soft or hard)
 * DELETE /api/crews/:id?hard_delete=true
 */
export async function deleteCrew(req, res) {
  try {
    const { id } = req.params;
    const { hard_delete } = req.query;

    if (hard_delete === 'true') {
      // crew_members cascade-deletes via FK
      const { error } = await supabase
        .from('crews')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete crew error:', error);
        return res.status(400).json({ message: error.message });
      }

      return res.status(200).json({
        message: 'Crew permanently deleted'
      });

    } else {
      // Soft delete (set active = false)
      const { data, error } = await supabase
        .from('crews')
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Deactivate crew error:', error);
        return res.status(400).json({ message: error.message });
      }

      return res.status(200).json({
        message: 'Crew deactivated successfully',
        crew: data
      });
    }

  } catch (err) {
    console.error('Delete crew error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Reactivate crew
 * PATCH /api/crews/:id/activate
 */
export async function activateCrew(req, res) {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('crews')
      .update({ active: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Activate crew error:', error);
      return res.status(400).json({ message: error.message });
    }

    return res.status(200).json({
      message: 'Crew activated successfully',
      crew: data
    });

  } catch (err) {
    console.error('Activate crew error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Add a single member to a crew
 * POST /api/crews/:id/members
 * Body: { user_id, role? }
 */
export async function addCrewMember(req, res) {
  try {
    const { id } = req.params;
    const { user_id, role } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: 'user_id is required' });
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('crew_members')
      .select('id')
      .eq('crew_id', id)
      .eq('user_id', user_id)
      .single();

    if (existing) {
      return res.status(400).json({ 
        message: 'User is already a member of this crew' 
      });
    }

    const { data, error } = await supabase
      .from('crew_members')
      .insert({
        crew_id: id,
        user_id,
        role: role || 'member'
      })
      .select(`
        id,
        role,
        assigned_at,
        user:users(id, full_name, email, phone, role_key, is_active)
      `)
      .single();

    if (error) {
      console.error('Add crew member error:', error);
      return res.status(400).json({ message: error.message });
    }

    return res.status(201).json({
      message: 'Member added successfully',
      member: data
    });

  } catch (err) {
    console.error('Add crew member error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Remove a member from a crew
 * DELETE /api/crews/:id/members/:user_id
 */
export async function removeCrewMember(req, res) {
  try {
    const { id, user_id } = req.params;

    const { error } = await supabase
      .from('crew_members')
      .delete()
      .eq('crew_id', id)
      .eq('user_id', user_id);

    if (error) {
      console.error('Remove crew member error:', error);
      return res.status(400).json({ message: error.message });
    }

    return res.status(200).json({
      message: 'Member removed successfully'
    });

  } catch (err) {
    console.error('Remove crew member error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Get all crews a specific user belongs to
 * GET /api/crews/user/:user_id
 */
export async function getUserCrews(req, res) {
  try {
    const { user_id } = req.params;

    const { data, error } = await supabase
      .from('crew_members')
      .select(`
        role,
        assigned_at,
        crew:crews(
          id,
          name,
          description,
          active,
          foreman:users!crews_foreman_id_fkey(id, full_name, email)
        )
      `)
      .eq('user_id', user_id);

    if (error) {
      console.error('Get user crews error:', error);
      return res.status(500).json({ message: 'Failed to get user crews' });
    }

    return res.status(200).json({
      crews: data.map(item => ({
        ...item.crew,
        member_role: item.role,
        assigned_at: item.assigned_at
      }))
    });

  } catch (err) {
    console.error('Get user crews error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}
