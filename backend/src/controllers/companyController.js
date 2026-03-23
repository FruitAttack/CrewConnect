import { supabase } from '../utils/supabase.js';

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
            .eq('company_id', company_id)
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