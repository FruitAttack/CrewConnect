import { supabase } from '../utils/supabase.js';

/**
 * Get all form submissions
 * GET /api/form-submissions?form_id=form_123&userId=user_456&startDate=2024-01-01
 */
export async function getAllFormSubmissions(req, res) {
  try {
    const { form_id, formId, userId, projectId, equipmentId, vehicleId, customerId, costCodeId, startDate, endDate } = req.query;
    
    // Accept both form_id and formId for compatibility
    const filterFormId = form_id || formId;

    let query = supabase
      .from('form_submissions')
      .select('*')
      .order('submitted_at', { ascending: false });

    // Filter by form
    if (filterFormId) {
      query = query.eq('form_id', filterFormId);
    }

    // Filter by submitter
    if (userId) {
      query = query.eq('submitted_by', userId);
    }

    // Filter by associations
    if (projectId) {
      query = query.eq('associated_project_id', projectId);
    }
    if (equipmentId) {
      query = query.eq('associated_equipment_id', equipmentId);
    }
    if (vehicleId) {
      query = query.eq('associated_vehicle_id', vehicleId);
    }
    if (customerId) {
      query = query.eq('associated_customer_id', customerId);
    }
    if (costCodeId) {
      query = query.eq('associated_cost_code_id', costCodeId);
    }

    // Filter by date range
    if (startDate) {
      query = query.gte('submitted_at', startDate);
    }
    if (endDate) {
      query = query.lte('submitted_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get form submissions error:', error);
      return res.status(500).json({ message: 'Failed to get form submissions' });
    }

    return res.status(200).json({ submissions: data });

  } catch (err) {
    console.error('Get form submissions error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Get single form submission by ID
 * GET /api/form-submissions/:id
 */
export async function getFormSubmission(req, res) {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Get form submission error:', error);
      if (error.code === 'PGRST116') {
        return res.status(404).json({ message: 'Form submission not found' });
      }
      return res.status(500).json({ message: 'Failed to get form submission' });
    }

    return res.status(200).json({ submission: data });

  } catch (err) {
    console.error('Get form submission error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Create new form submission
 * POST /api/form-submissions
 * Body: { 
 *   formId, 
 *   data (field responses),
 *   associatedProjectId,
 *   associatedEquipmentId,
 *   associatedUserId,
 *   associatedVehicleId,
 *   associatedCustomerId,
 *   associatedCostCodeId,
 *   company_id
 * }
 */
export async function createFormSubmission(req, res) {
  try {
    const {
      formId,
      data,
      associatedProjectId,
      associatedEquipmentId,
      associatedUserId,
      associatedVehicleId,
      associatedCustomerId,
      associatedCostCodeId,
      company_id
    } = req.body;

    // Validate required fields
    if (!formId || !data) {
      return res.status(400).json({ message: 'formId and data are required' });
    }

    const finalCompanyId = company_id || req.user?.default_company_id;
    if (!finalCompanyId) {
      return res.status(400).json({ message: 'company_id is required' });
    }

    // Fetch the form to validate submission data against form fields
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('id, fields')
      .eq('id', formId)
      .single();

    if (formError || !form) {
      console.error('Get form error:', formError);
      return res.status(404).json({ message: 'Form not found' });
    }

    // Parse form fields
    let formFields = [];
    try {
      formFields = typeof form.fields === 'string' ? JSON.parse(form.fields) : (form.fields || []);
    } catch (parseErr) {
      console.error('Error parsing form fields:', parseErr);
      formFields = [];
    }

    // Validate submission data against form fields
    const validationErrors = [];
    
    // Check for required fields
    formFields.forEach(field => {
      if (field.required && (!data[field.id] || (typeof data[field.id] === 'string' && data[field.id].trim() === ''))) {
        validationErrors.push(`Required field "${field.question}" (${field.id}) is missing`);
      }
    });

    // Check for invalid field IDs (fields submitted that don't exist in form)
    const validFieldIds = new Set(formFields.map(f => f.id));
    Object.keys(data).forEach(key => {
      if (!validFieldIds.has(key)) {
        validationErrors.push(`Unknown field "${key}" - not defined in form`);
      }
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        message: 'Form submission validation failed',
        errors: validationErrors
      });
    }

    const { data: submission, error } = await supabase
      .from('form_submissions')
      .insert([{
        company_id: finalCompanyId,
        form_id: formId,
        data: data,
        submitted_by: req.user?.id,
        submitted_at: new Date().toISOString(),
        associated_project_id: associatedProjectId || null,
        associated_equipment_id: associatedEquipmentId || null,
        associated_user_id: associatedUserId || null,
        associated_vehicle_id: associatedVehicleId || null,
        associated_customer_id: associatedCustomerId || null,
        associated_cost_code_id: associatedCostCodeId || null,
      }])
      .select()
      .single();

    if (error) {
      console.error('Create form submission error:', error);
      return res.status(500).json({ message: 'Failed to create form submission' });
    }

    return res.status(201).json({ submission });

  } catch (err) {
    console.error('Create form submission error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Update form submission
 * PUT /api/form-submissions/:id
 */
export async function updateFormSubmission(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Don't allow updating company_id, form_id, or submitted_at
    delete updates.company_id;
    delete updates.form_id;
    delete updates.submitted_at;
    delete updates.submitted_by;

    updates.updated_at = new Date().toISOString();
    updates.updated_by = req.user?.id;

    const { data, error } = await supabase
      .from('form_submissions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update form submission error:', error);
      if (error.code === 'PGRST116') {
        return res.status(404).json({ message: 'Form submission not found' });
      }
      return res.status(500).json({ message: 'Failed to update form submission' });
    }

    return res.status(200).json({ submission: data });

  } catch (err) {
    console.error('Update form submission error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Delete form submission
 * DELETE /api/form-submissions/:id
 */
export async function deleteFormSubmission(req, res) {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('form_submissions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete form submission error:', error);
      return res.status(500).json({ message: 'Failed to delete form submission' });
    }

    return res.status(200).json({ message: 'Form submission deleted successfully' });

  } catch (err) {
    console.error('Delete form submission error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Get all submissions for a specific form
 * GET /api/form-submissions/form/:formId
 */
export async function getFormSubmissionsByFormId(req, res) {
  try {
    const { formId } = req.params;
    const { startDate, endDate, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('form_submissions')
      .select('*', { count: 'exact' })
      .eq('form_id', formId)
      .order('submitted_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Filter by date range
    if (startDate) {
      query = query.gte('submitted_at', startDate);
    }
    if (endDate) {
      query = query.lte('submitted_at', endDate);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Get form submissions error:', error);
      return res.status(500).json({ message: 'Failed to get form submissions' });
    }

    return res.status(200).json({ submissions: data, total: count });

  } catch (err) {
    console.error('Get form submissions error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Get submission statistics by field
 * GET /api/form-submissions/form/:formId/field-stats/:fieldId
 */
export async function getFieldStatistics(req, res) {
  try {
    const { formId, fieldId } = req.params;

    const { data, error } = await supabase
      .from('form_submissions')
      .select('data')
      .eq('form_id', formId);

    if (error) {
      console.error('Get field statistics error:', error);
      return res.status(500).json({ message: 'Failed to get field statistics' });
    }

    // Extract field values and calculate statistics
    const fieldValues = data
      .map(submission => submission.data?.[fieldId])
      .filter(value => value !== undefined && value !== null);

    const stats = {
      totalResponses: fieldValues.length,
      uniqueValues: new Set(fieldValues).size,
      values: Array.from(new Set(fieldValues)),
    };

    // For numeric values, calculate additional stats
    const numericValues = fieldValues
      .map(v => parseFloat(v))
      .filter(v => !isNaN(v));

    if (numericValues.length > 0) {
      stats.average = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
      stats.min = Math.min(...numericValues);
      stats.max = Math.max(...numericValues);
    }

    return res.status(200).json({ fieldStats: stats });

  } catch (err) {
    console.error('Get field statistics error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}
/**
 * Seed form submissions with sample data (UNOFFICIAL/DEBUG ONLY)
 * POST /api/form-submissions/seed
 */
export async function seedFormSubmissions(req, res) {
  try {
    const userId = req.user?.id;
    const company_id = req.user?.default_company_id;

    if (!userId || !company_id) {
      return res.status(400).json({ message: "Missing user_id or company_id" });
    }

    // First, delete all existing form submissions for this company
    const { error: deleteError } = await supabase
      .from("form_submissions")
      .delete()
      .eq("company_id", company_id);

    if (deleteError) {
      console.error("Error deleting old submissions:", deleteError);
      return res.status(500).json({ message: "Failed to delete old submissions" });
    }

    const { SAMPLE_FORM_SUBMISSIONS } = await import("../data/sampleFormSubmissions.js");
    
    // Get all forms to match submissions to form IDs
    const { data: forms, error: formsError } = await supabase
      .from("forms")
      .select("id, title")
      .eq("company_id", company_id);

    if (formsError) {
      console.error("Error fetching forms:", formsError);
      return res.status(500).json({ message: "Failed to fetch forms" });
    }

    // Get all projects to associate with submissions
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("id, name")
      .eq("company_id", company_id)
      .limit(5);

    if (projectsError) {
      console.error("Error fetching projects:", projectsError);
    }

    // Create submissions, matching by form title and distributing across projects
    const submissionsToInsert = SAMPLE_FORM_SUBMISSIONS.map((submission, index) => {
      const form = forms.find(f => f.title === submission.formTitle);
      if (!form) return null;

      // Distribute submissions across available projects (if any)
      const project = projects && projects.length > 0 ? projects[index % projects.length] : null;

      return {
        form_id: form.id,
        company_id,
        submitted_by: userId,
        submitted_at: new Date().toISOString(),
        data: submission.data,
        associated_project_id: project?.id || null,
      };
    }).filter(Boolean); // Remove null entries if form not found

    if (submissionsToInsert.length === 0) {
      return res.status(400).json({ message: "No matching forms found for submissions" });
    }

    const { data, error } = await supabase
      .from("form_submissions")
      .insert(submissionsToInsert)
      .select();

    if (error) {
      console.error("Seed submissions error:", error);
      return res.status(500).json({ message: "Failed to seed submissions", error });
    }

    return res.status(201).json({
      message: `Successfully seeded ${data.length} form submissions (old submissions deleted)`,
      submissions: data,
    });
  } catch (err) {
    console.error("Seed submissions error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}