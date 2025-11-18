import { supabase } from '../utils/supabase.js';

/**
 * Get all customers for a company
 * GET /api/customers?company_id=xxx
 */
export async function getAllCustomers(req, res) {
  try {
    const { company_id } = req.query;

    if (!company_id) {
      return res.status(400).json({ message: 'company_id is required' });
    }

    const { data, error } = await supabase
      .from('customers')
      .select(`
        *,
        projects:projects(id, name, active)
      `)
      .eq('company_id', company_id)
      .order('name', { ascending: true });

    if (error) {
      console.error('Get customers error:', error);
      return res.status(500).json({ message: 'Failed to get customers' });
    }

    return res.status(200).json({ customers: data });

  } catch (err) {
    console.error('Get customers error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Get single customer by ID
 * GET /api/customers/:id
 */
export async function getCustomer(req, res) {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('customers')
      .select(`
        *,
        company:company_id(id, name),
        projects:projects(id, name, address, active)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Get customer error:', error);
      if (error.code === 'PGRST116') {
        return res.status(404).json({ message: 'Customer not found' });
      }
      return res.status(500).json({ message: 'Failed to get customer' });
    }

    return res.status(200).json({ customer: data });

  } catch (err) {
    console.error('Get customer error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Create new customer
 * POST /api/customers
 */
export async function createCustomer(req, res) {
  try {
    const {
      company_id,
      name,
      contact_name,
      contact_email,
      contact_phone,
      billing_address,
      notes
    } = req.body;

    // Validate required fields
    if (!company_id || !name) {
      return res.status(400).json({ 
        message: 'company_id and name are required' 
      });
    }

    const newCustomer = {
      company_id,
      name,
      contact_name: contact_name || null,
      contact_email: contact_email || null,
      contact_phone: contact_phone || null,
      billing_address: billing_address || null,
      notes: notes || null
    };

    const { data, error } = await supabase
      .from('customers')
      .insert(newCustomer)
      .select()
      .single();

    if (error) {
      console.error('Create customer error:', error);
      return res.status(400).json({ message: error.message });
    }

    return res.status(201).json({
      message: 'Customer created successfully',
      customer: data
    });

  } catch (err) {
    console.error('Create customer error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Update customer
 * PUT /api/customers/:id
 */
export async function updateCustomer(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated
    delete updates.id;
    delete updates.company_id;
    delete updates.created_at;

    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update customer error:', error);
      return res.status(400).json({ message: error.message });
    }

    return res.status(200).json({
      message: 'Customer updated successfully',
      customer: data
    });

  } catch (err) {
    console.error('Update customer error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Delete customer
 * DELETE /api/customers/:id
 */
export async function deleteCustomer(req, res) {
  try {
    const { id } = req.params;

    // Check if customer has active projects
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('customer_id', id)
      .eq('active', true);

    if (projectError) {
      console.error('Check projects error:', projectError);
      return res.status(500).json({ message: 'Failed to check customer projects' });
    }

    if (projects && projects.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete customer with active projects. Deactivate projects first.',
        active_projects_count: projects.length
      });
    }

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete customer error:', error);
      return res.status(400).json({ message: error.message });
    }

    return res.status(200).json({
      message: 'Customer deleted successfully'
    });

  } catch (err) {
    console.error('Delete customer error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Search customers
 * GET /api/customers/search?company_id=xxx&query=acme
 */
export async function searchCustomers(req, res) {
  try {
    const { company_id, query } = req.query;

    if (!company_id || !query) {
      return res.status(400).json({ 
        message: 'company_id and query are required' 
      });
    }

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('company_id', company_id)
      .or(`name.ilike.%${query}%,contact_name.ilike.%${query}%,contact_email.ilike.%${query}%`)
      .limit(20);

    if (error) {
      console.error('Search customers error:', error);
      return res.status(500).json({ message: 'Failed to search customers' });
    }

    return res.status(200).json({ results: data });

  } catch (err) {
    console.error('Search customers error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Get customer project summary
 * GET /api/customers/:id/projects-summary
 */
export async function getCustomerProjectsSummary(req, res) {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        active,
        time_entries(
          id,
          clock_in,
          clock_out
        )
      `)
      .eq('customer_id', id);

    if (error) {
      console.error('Get projects summary error:', error);
      return res.status(500).json({ message: 'Failed to get projects summary' });
    }

    // Calculate summary stats
    const summary = {
      total_projects: data.length,
      active_projects: data.filter(p => p.active).length,
      inactive_projects: data.filter(p => !p.active).length,
      projects: data.map(project => ({
        id: project.id,
        name: project.name,
        active: project.active,
        total_time_entries: project.time_entries.length
      }))
    };

    return res.status(200).json({ summary });

  } catch (err) {
    console.error('Get projects summary error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}
