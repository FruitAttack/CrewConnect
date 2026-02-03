/**
 * Map Controller - CrewConnect
 * Provides real-time location data for projects, employees, and equipment
 */

import { supabase } from '../utils/supabase.js';

/**
 * GET /api/map/overview
 * Returns all map data: projects, active employees, and equipment with locations
 */
export const getMapOverview = async (req, res) => {
  try {
    const { company_id } = req.query;
    
    if (!company_id) {
      return res.status(400).json({ error: 'company_id is required' });
    }

    // 1. Get all projects with coordinates
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, address, lat, lng, geofence_m, active')
      .eq('company_id', company_id)
      .not('lat', 'is', null)
      .not('lng', 'is', null);

    if (projectsError) {
      console.error('Projects query error:', projectsError);
      throw projectsError;
    }

    // 2. Get active (clocked-in) time entries with user and project info
    const { data: activeEntries, error: entriesError } = await supabase
      .from('time_entries')
      .select(`
        id,
        clock_in,
        clock_in_lat,
        clock_in_lng,
        user_id,
        project_id,
        equipment_id
      `)
      .eq('company_id', company_id)
      .is('clock_out', null);

    if (entriesError) {
      console.error('Time entries query error:', entriesError);
      throw entriesError;
    }

    // Get user details for active entries
    const userIds = [...new Set(activeEntries.map(e => e.user_id))];
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name, email')
      .in('id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000']);

    const usersMap = new Map(users?.map(u => [u.id, u]) || []);

    // Get project details for active entries
    const projectIds = [...new Set(activeEntries.map(e => e.project_id).filter(Boolean))];
    const { data: entryProjects } = await supabase
      .from('projects')
      .select('id, name')
      .in('id', projectIds.length > 0 ? projectIds : ['00000000-0000-0000-0000-000000000000']);

    const projectsMap = new Map(entryProjects?.map(p => [p.id, p]) || []);

    // Get equipment details for active entries
    const equipmentIds = [...new Set(activeEntries.map(e => e.equipment_id).filter(Boolean))];
    const { data: entryEquipment } = await supabase
      .from('equipment')
      .select('id, type, label')
      .in('id', equipmentIds.length > 0 ? equipmentIds : ['00000000-0000-0000-0000-000000000000']);

    const equipmentMap = new Map(entryEquipment?.map(e => [e.id, e]) || []);

    // Check for active breaks
    const entryIds = activeEntries.map(e => e.id);
    const { data: activeBreaks } = await supabase
      .from('breaks')
      .select('time_entry_id')
      .in('time_entry_id', entryIds.length > 0 ? entryIds : ['00000000-0000-0000-0000-000000000000'])
      .is('break_end', null);

    const onBreakEntryIds = new Set(activeBreaks?.map(b => b.time_entry_id) || []);

    // 3. Get equipment with location data
    const { data: equipment, error: equipmentError } = await supabase
      .from('equipment')
      .select(`
        id, 
        type, 
        label, 
        last_lat, 
        last_lng, 
        last_location_at,
        active
      `)
      .eq('company_id', company_id)
      .eq('active', true);

    if (equipmentError) {
      console.error('Equipment query error:', equipmentError);
      throw equipmentError;
    }

    // Build set of equipment IDs currently in use (from active time entries)
    const equipmentInUseIds = new Set(activeEntries.map(e => e.equipment_id).filter(Boolean));

    // Count active employees per project
    const activeCountByProject = activeEntries.reduce((acc, entry) => {
      if (entry.project_id) {
        acc[entry.project_id] = (acc[entry.project_id] || 0) + 1;
      }
      return acc;
    }, {});

    // Format response
    const response = {
      projects: projects.map(p => ({
        id: p.id,
        name: p.name,
        address: p.address,
        lat: p.lat,
        lng: p.lng,
        geofenceRadius: p.geofence_m,
        active: p.active,
        activeEmployeeCount: activeCountByProject[p.id] || 0,
      })),

      activeEmployees: activeEntries
        .filter(e => e.clock_in_lat && e.clock_in_lng)
        .map(e => {
          const user = usersMap.get(e.user_id);
          const project = projectsMap.get(e.project_id);
          const equip = equipmentMap.get(e.equipment_id);
          
          return {
            id: e.id,
            userId: e.user_id,
            name: user?.full_name || user?.email || 'Unknown',
            lat: e.clock_in_lat,
            lng: e.clock_in_lng,
            clockInTime: e.clock_in,
            projectId: e.project_id,
            projectName: project?.name || null,
            equipmentId: e.equipment_id,
            equipmentName: equip ? `${equip.type} - ${equip.label}` : null,
            onBreak: onBreakEntryIds.has(e.id),
          };
        }),

      equipment: equipment
        .filter(eq => eq.last_lat && eq.last_lng)
        .map(eq => ({
          id: eq.id,
          name: `${eq.type} - ${eq.label}`,
          lat: eq.last_lat,
          lng: eq.last_lng,
          lastLocationAt: eq.last_location_at,
          inUse: equipmentInUseIds.has(eq.id),
        })),
    };

    res.json(response);
  } catch (error) {
    console.error('Map overview error:', error);
    res.status(500).json({ error: 'Failed to fetch map data' });
  }
};

/**
 * GET /api/map/project/:id
 * Returns detailed map data for a specific project
 */
export const getProjectMap = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.query;

    if (!company_id) {
      return res.status(400).json({ error: 'company_id is required' });
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, address, lat, lng, geofence_m, active')
      .eq('id', id)
      .eq('company_id', company_id)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get active employees at this project
    const { data: activeEntries } = await supabase
      .from('time_entries')
      .select(`
        id,
        clock_in,
        clock_in_lat,
        clock_in_lng,
        user_id,
        equipment_id
      `)
      .eq('company_id', company_id)
      .eq('project_id', id)
      .is('clock_out', null);

    // Get user details
    const userIds = [...new Set(activeEntries?.map(e => e.user_id) || [])];
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name, email')
      .in('id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000']);

    const usersMap = new Map(users?.map(u => [u.id, u]) || []);

    // Get equipment details
    const equipmentIds = [...new Set(activeEntries?.map(e => e.equipment_id).filter(Boolean) || [])];
    const { data: equipment } = await supabase
      .from('equipment')
      .select('id, type, label')
      .in('id', equipmentIds.length > 0 ? equipmentIds : ['00000000-0000-0000-0000-000000000000']);

    const equipmentMap = new Map(equipment?.map(e => [e.id, e]) || []);

    const response = {
      project: {
        id: project.id,
        name: project.name,
        address: project.address,
        lat: project.lat,
        lng: project.lng,
        geofenceRadius: project.geofence_m,
        active: project.active,
      },
      activeEmployees: (activeEntries || [])
        .filter(e => e.clock_in_lat && e.clock_in_lng)
        .map(e => {
          const user = usersMap.get(e.user_id);
          const equip = equipmentMap.get(e.equipment_id);
          return {
            id: e.id,
            name: user?.full_name || user?.email || 'Unknown',
            lat: e.clock_in_lat,
            lng: e.clock_in_lng,
            clockInTime: e.clock_in,
            equipmentName: equip ? `${equip.type} - ${equip.label}` : null,
          };
        }),
    };

    res.json(response);
  } catch (error) {
    console.error('Project map error:', error);
    res.status(500).json({ error: 'Failed to fetch project map data' });
  }
};