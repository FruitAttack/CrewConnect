import { supabase } from '../utils/supabase.js';
import { createUserClient } from '../utils/supabase.js';

export async function createCompany(req, res) {
    try {
        const {
           name
        } = req.body;

        // Validate the required fields
        if(!name) {
            return res.status(400).json({ message: 'name is required'});
        }

        const { data, error } = await supabase
            .from('companies')
            .insert([{ name }])
            .select()
            .single();

        if (error) {
        console.error('Supabase error:', error);
            return res.status(500).json({ message: error.message });
        }

        return res.status(201).json({
            message: 'Company created successfully',
            company: data,
        });      

    }
    catch (e) {
        console.error('Create company error:', e);
        return res.status(500).json({message: 'Server error' });
    }
}

export async function deleteCompany(req, res) {
    try {
        // Restrict deletion of companies to admin users
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const company_id = req.user.company_id

        // Validate the required fields
        if(!company_id) {
            return res.status(400).json({ message: 'company_id is required'});
        }

        const { data, error } = await supabase
            .from('companies')
            .delete()
            .eq('id', company_id)
            .select()
            .single();

        if (error) {
        console.error('Supabase error:', error);
            return res.status(500).json({ message: error.message });
        }

        return res.status(200).json({
            message: 'Company deleted successfully',
            company: data,
        });      

    }
    catch (e) {
        console.error('Delete company error:', e);
        return res.status(500).json({message: 'Server error' });
    }
}

export async function signUpWithCompany(req, res) {
  let userId = null;
  let companyId = null;

  try {
    const { email, password, companyName, fullName } = req.body;

    if (!email || !password || !companyName || !fullName) {
      return res.status(400).json({ message: 'email, password, companyName, and fullname are required' });
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return res.status(400).json({ message: authError.message });
    }

    userId = authData.user.id;

    const { data: company, error: companyError } = await supabase
      .schema('app')
      .from('companies')
      .insert([{ name: companyName }])
      .select()
      .single();

    if (companyError) throw new Error('Failed to create company: ' + companyError.message);

    companyId = company.id;

    const { error: userError } = await supabase
      .schema('app')
      .from('users')
      .insert({
        id: userId,
        email,
        full_name: fullName || null,
        default_company_id: companyId,
        is_active: true,
        can_view_rates: true,
      });

    if (userError) throw new Error('Failed to create user profile: ' + userError.message);

    const { error: roleError } = await supabase
      .schema('app')
      .from('user_roles')
      .insert({
        user_id: userId,
        company_id: companyId,
        role_key: 'admin',
      });

    if (roleError) throw new Error('Failed to assign admin role: ' + roleError.message);

    return res.status(201).json({
      message: 'Account and company created successfully',
      user: { id: userId, email, company_id: companyId, role: 'admin' },
      company,
    });

  } catch (err) {
    console.error('Signup with company error:', err);

    try {
      if (companyId && userId) {
        await supabase.schema('app').from('user_roles').delete().eq('user_id', userId).eq('company_id', companyId);
        await supabase.schema('app').from('users').delete().eq('id', userId);
        await supabase.schema('app').from('companies').delete().eq('id', companyId);
      } else if (companyId) {
        await supabase.schema('app').from('companies').delete().eq('id', companyId);
      }
      if (userId) {
        await supabase.auth.admin.deleteUser(userId);
      }
    } catch (rollbackErr) {
      console.error('Rollback error - manual cleanup may be needed:', rollbackErr);
    }

    return res.status(500).json({ message: err.message || 'Server error' });
  }
}