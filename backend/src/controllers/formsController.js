/**
 * Delete a form by ID
 * DELETE /api/forms/:id
 */
export async function deleteForm(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Form ID is required" });
    }

    const { error } = await supabase.from("forms").delete().eq("id", id);

    if (error) {
      console.error("Delete form error:", error);
      return res.status(500).json({ message: "Failed to delete form" });
    }

    return res.status(204).send();
  } catch (err) {
    console.error("Delete form error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
import { supabase } from "../utils/supabase.js";

/**
 * Get all forms for user's company
 * GET /api/forms?category=Safety&archived=false
 */
export async function getAllForms(req, res) {
  try {
    const { category, archived, search } = req.query;

    // Use query param if provided, otherwise use user's default company
    const company_id = req.query.company_id || req.user?.default_company_id;

    if (!company_id) {
      return res.status(400).json({ message: "company_id is required" });
    }

    let query = supabase
      .from("forms")
      .select("*")
      .eq("company_id", company_id)
      .order("created_at", { ascending: false });

    // Filter by category
    if (category) {
      query = query.eq("category", category);
    }

    // Filter by archived status
    if (archived !== undefined) {
      query = query.eq("archived", archived === "true");
    }

    // Search by title or description
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Get forms error:", error);
      return res.status(500).json({ message: "Failed to get forms" });
    }

    return res.status(200).json({ forms: data });
  } catch (err) {
    console.error("Get forms error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * Get single form by ID
 * GET /api/forms/:id
 */
export async function getForm(req, res) {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("forms")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Get form error:", error);
      if (error.code === "PGRST116") {
        return res.status(404).json({ message: "Form not found" });
      }
      return res.status(500).json({ message: "Failed to get form" });
    }

    return res.status(200).json({ form: data });
  } catch (err) {
    console.error("Get form error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * Create new form
 * POST /api/forms
 * Body: { title, description, category, icon, fields, company_id }
 */
export async function createForm(req, res) {
  try {
    const { title, description, category, icon, fields, company_id } = req.body;

    // Validate required fields
    if (!title || !category) {
      return res
        .status(400)
        .json({ message: "Title and category are required" });
    }

    const finalCompanyId = company_id || req.user?.default_company_id;
    if (!finalCompanyId) {
      return res.status(400).json({ message: "company_id is required" });
    }

    const { data, error } = await supabase
      .from("forms")
      .insert([
        {
          company_id: finalCompanyId,
          title: title.trim(),
          description: description || "",
          category: category || "General",
          icon: icon || "📄",
          // associations removed
          fields: fields || [],
          created_by: req.user?.id,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Create form error:", error);
      return res.status(500).json({ message: "Failed to create form" });
    }

    return res.status(201).json({ form: data });
  } catch (err) {
    console.error("Create form error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * Update form
 * PUT /api/forms/:id
 */
export async function updateForm(req, res) {
  try {
    const {
      title,
      description,
      category,
      icon,
      fields,
      company_id,
      project_enabled,
      project_question,
      equipment_enabled,
      equipment_question,
      user_enabled,
      user_question,
      cost_code_enabled,
      cost_code_question,
    } = req.body;

    // Validate required fields
    if (!title || !category) {
      return res
        .status(400)
        .json({ message: "Title and category are required" });
    }

    const finalCompanyId = company_id || req.user?.default_company_id;
    if (!finalCompanyId) {
      return res.status(400).json({ message: "company_id is required" });
    }

    const { data, error } = await supabase
      .from("forms")
      .update([
        {
          company_id: finalCompanyId,
          title: title.trim(),
          description: description || "",
          category: category || "General",
          icon: icon || "📄",
          fields: fields || [],
          created_by: req.user?.id,
          created_at: new Date().toISOString(),
          project_enabled: project_enabled ?? false,
          project_question: project_question || null,
          equipment_enabled: equipment_enabled ?? false,
          equipment_question: equipment_question || null,
          user_enabled: user_enabled ?? false,
          user_question: user_question || null,
          cost_code_enabled: cost_code_enabled ?? false,
          cost_code_question: cost_code_question || null,
        },
      ])
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) {
      console.error("Create form error:", error);
      return res.status(500).json({ message: "Failed to create form" });
    }

    return res.status(201).json({ form: data });
  } catch (err) {
    console.error("Create form error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function archiveForm(req, res) {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("forms")
      .update({ archived: true, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Archive form error:", error);
      return res.status(500).json({ message: "Failed to archive form" });
    }

    return res.status(200).json({ form: data });
  } catch (err) {
    console.error("Archive form error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * Get form submission statistics
 * GET /api/forms/:id/stats
 */
export async function getFormStats(req, res) {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    let query = supabase
      .from("form_submissions")
      .select("id, submitted_at, submitted_by")
      .eq("form_id", id);

    // Filter by date range if provided
    if (startDate) {
      query = query.gte("submitted_at", startDate);
    }
    if (endDate) {
      query = query.lte("submitted_at", endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Get form stats error:", error);
      return res.status(500).json({ message: "Failed to get form stats" });
    }

    // Calculate statistics
    const totalSubmissions = data.length;
    const uniqueSubmitters = new Set(data.map((s) => s.submitted_by)).size;
    const lastSubmission =
      data.length > 0
        ? data.sort(
            (a, b) => new Date(b.submitted_at) - new Date(a.submitted_at),
          )[0].submitted_at
        : null;

    return res.status(200).json({
      stats: {
        totalSubmissions,
        uniqueSubmitters,
        lastSubmission,
      },
    });
  } catch (err) {
    console.error("Get form stats error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
/**
 * Seed forms with sample data (UNOFFICIAL/DEBUG ONLY)
 * POST /api/forms/seed
 */
export async function seedForms(req, res) {
  try {
    const company_id = req.user?.default_company_id;
    if (!company_id) {
      return res.status(400).json({ message: "No company_id" });
    }

    const { SAMPLE_FORMS } = await import("../data/sampleForms.js");
    
    // Add company_id and stringify fields for each form
    const formsToInsert = SAMPLE_FORMS.map(form => ({
      ...form,
      company_id,
      fields: JSON.stringify(form.fields),
    }));

    const { data, error } = await supabase.from("forms").insert(formsToInsert).select();

    if (error) {
      console.error("Seed forms error:", error);
      return res.status(500).json({ message: "Failed to seed forms", error });
    }

    return res.status(201).json({ 
      message: `Successfully seeded ${data.length} forms`, 
      forms: data 
    });
  } catch (err) {
    console.error("Seed forms error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}