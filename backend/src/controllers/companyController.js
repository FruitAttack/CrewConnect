import { supabase } from '../utils/supabase.js';
import jwt from 'jsonwebtoken';

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
  try {
    const { email, password, companyName } = req.body;

    if(!email || !password || !companyName) {
      return res.status(400).json({ message: 'email, password, and companyName are required' });
    }

    // First create an auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password
    });

    if (authError) {
      return res.status(400).json({ message: authError.message });
    }

    const userId = authData.user.id;

    // Then create the new company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert([{ name: companyName }])
      .select()
      .single();

    if (companyError) {
      return res.status(500).json({ message: companyError.message });
    }

    // Next we create the user profile
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        default_company_id: company.id,
        is_active: true
      });

    if (userError) {
      return res.status(500).json({ message: userError.message });
    }

    // And finally, we assign the user the admin role in the new company
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        company_id: company.id,
        role_key: 'admin'
      });

    if (roleError) {
      return res.status(500).json({ message: roleError.message });
    }

    const token = jwt.sign({
      user_id: userId,
      email,
      company_id: company.id,
      role: 'admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      message: 'Account and company created successfully',
      token,
      user: {
        id: userId,
        email,
        company_id: company.id,
        role: 'admin'
      },
      company
    });

  } catch (err) {
    console.error('Signup with company error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}