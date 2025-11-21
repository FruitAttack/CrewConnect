import { supabase } from '../utils/supabase.js';

/**
 * Get cost codes assigned to a specific project
 * GET /api/projects/:projectId/cost-codes
 */
export async function getProjectCostCodes(req, res) {
  try {
    const { projectId } = req.params;
    const { active_only = 'true' } = req.query;

    if (!projectId) {
      return res.status(400).json({ message: 'project_id is required' });
    }

    // Get cost codes with a manual join
    const { data, error } = await supabase
      .schema('app')
      .rpc('get_project_cost_codes', {
        p_project_id: projectId,
        p_active_only: active_only === 'true'
      });

    if (error) {
      console.error('Get project cost codes error:', error);
      return res.status(500).json({ message: 'Failed to get cost codes' });
    }

    return res.status(200).json({ cost_codes: data });

  } catch (err) {
    console.error('Get project cost codes error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Assign cost code to project
 * POST /api/projects/:projectId/cost-codes
 */
export async function assignCostCodeToProject(req, res) {
  try {
    const { projectId } = req.params;
    const { cost_code_id } = req.body;

    if (!projectId || !cost_code_id) {
      return res.status(400).json({ 
        message: 'project_id and cost_code_id are required' 
      });
    }

    const { data, error } = await supabase
      .schema('app')
      .from('project_cost_codes')
      .insert({
        project_id: projectId,
        cost_code_id: cost_code_id
      })
      .select();

    if (error) {
      console.error('Assign cost code error:', error);
      return res.status(400).json({ message: error.message });
    }

    return res.status(201).json({
      message: 'Cost code assigned successfully',
      assignment: data[0]
    });

  } catch (err) {
    console.error('Assign cost code error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Remove cost code from project
 * DELETE /api/projects/:projectId/cost-codes/:costCodeId
 */
export async function removeCostCodeFromProject(req, res) {
  try {
    const { projectId, costCodeId } = req.params;

    const { error } = await supabase
      .schema('app')
      .from('project_cost_codes')
      .delete()
      .eq('project_id', projectId)
      .eq('cost_code_id', costCodeId);

    if (error) {
      console.error('Remove cost code error:', error);
      return res.status(400).json({ message: error.message });
    }

    return res.status(200).json({
      message: 'Cost code removed from project successfully'
    });

  } catch (err) {
    console.error('Remove cost code error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}