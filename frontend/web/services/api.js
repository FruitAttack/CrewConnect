/**
 * CrewConnect API Service
 * Centralized API calls with proper error handling
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

// Helper to get auth headers
const getHeaders = (token) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Generic fetch wrapper with error handling
const fetchApi = async (endpoint, options = {}, token = null) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getHeaders(token),
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new ApiError(
        data.message || data.error || 'Request failed',
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error.message || 'Network error', 0, null);
  }
};

// ============================================
// AUTH
// ============================================
export const authApi = {
  login: (email, password) =>
    fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (data) =>
    fetchApi('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  refreshToken: (token) =>
    fetchApi('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
};

// ============================================
// PROJECTS
// ============================================
export const projectsApi = {
  getAll: (token, companyId, filters = {}) => {
    const params = new URLSearchParams({ company_id: companyId, ...filters });
    return fetchApi(`/projects?${params}`, {}, token);
  },

  getById: (token, id) =>
    fetchApi(`/projects/${id}`, {}, token),

  create: (token, data) =>
    fetchApi('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token),

  update: (token, id, data) =>
    fetchApi(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, token),

  delete: (token, id) =>
    fetchApi(`/projects/${id}`, { method: 'DELETE' }, token),

  activate: (token, id) =>
    fetchApi(`/projects/${id}/activate`, { method: 'PATCH' }, token),

  getLaborSummary: (token, id, startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return fetchApi(`/projects/${id}/labor-summary?${params}`, {}, token);
  },

  getCostBreakdown: (token, id, startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return fetchApi(`/projects/${id}/cost-breakdown?${params}`, {}, token);
  },
};

// ============================================
// TIME ENTRIES
// ============================================
export const timeEntriesApi = {
  clockIn: (token, data) =>
    fetchApi('/time-entries/clock-in', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token),

  clockOut: (token, data = {}) =>
    fetchApi('/time-entries/clock-out', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token),

  getCurrent: (token) =>
    fetchApi('/time-entries/current', {}, token),

  getAll: (token, filters = {}) => {
    const params = new URLSearchParams(filters);
    return fetchApi(`/time-entries?${params}`, {}, token);
  },

  getById: (token, id) =>
    fetchApi(`/time-entries/${id}`, {}, token),

  update: (token, id, data) =>
    fetchApi(`/time-entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, token),

  delete: (token, id) =>
    fetchApi(`/time-entries/${id}`, { method: 'DELETE' }, token),

  // Time summaries
  getSecondsToday: (token) =>
    fetchApi('/time-entries/seconds-today', {}, token),

  getSecondsShift: (token) =>
    fetchApi('/time-entries/seconds-shift', {}, token),

  getSecondsWeek: (token) =>
    fetchApi('/time-entries/seconds-week', {}, token),

  getSecondsMonth: (token) =>
    fetchApi('/time-entries/seconds-month', {}, token),

  getSecondsYear: (token) =>
    fetchApi('/time-entries/seconds-year', {}, token),

  // Breaks
  startBreak: (token, breakType = 'standard') =>
    fetchApi('/time-entries/break/start', {
      method: 'POST',
      body: JSON.stringify({ break_type: breakType }),
    }, token),

  endBreak: (token) =>
    fetchApi('/time-entries/break/end', { method: 'POST' }, token),

  getCurrentBreak: (token) =>
    fetchApi('/time-entries/break/current', {}, token),

  // Cost code update
  updateCostCode: (token, costCodeId) =>
    fetchApi('/time-entries/cost-code', {
      method: 'PUT',
      body: JSON.stringify({ cost_code_id: costCodeId }),
    }, token),

  // Geofence
  validateGeofence: (token, projectId, lat, lng) =>
    fetchApi('/time-entries/validate-geofence', {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId, lat, lng }),
    }, token),

  getNearbyProjects: (token, lat, lng, maxDistanceKm = 50) => {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      max_distance_km: maxDistanceKm.toString(),
    });
    return fetchApi(`/time-entries/nearby-projects?${params}`, {}, token);
  },
};

// ============================================
// USERS
// ============================================
export const usersApi = {
  getAll: (token, companyId, filters = {}) => {
    const params = new URLSearchParams({ company_id: companyId, ...filters });
    return fetchApi(`/users?${params}`, {}, token);
  },

  getById: (token, id) =>
    fetchApi(`/users/${id}`, {}, token),

  create: (token, data) =>
    fetchApi('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token),

  update: (token, id, data) =>
    fetchApi(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, token),

  delete: (token, id) =>
    fetchApi(`/users/${id}`, { method: 'DELETE' }, token),

  activate: (token, id) =>
    fetchApi(`/users/${id}/activate`, { method: 'PATCH' }, token),

  search: (token, query, companyId) => {
    const params = new URLSearchParams({ query, company_id: companyId });
    return fetchApi(`/users/search?${params}`, {}, token);
  },

  assignToCompany: (token, userId, companyId, roleKey) =>
    fetchApi(`/users/${userId}/assign-company`, {
      method: 'POST',
      body: JSON.stringify({ company_id: companyId, role_key: roleKey }),
    }, token),

  updateEmployment: (token, userId, data) =>
    fetchApi(`/users/${userId}/employment`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, token),
};

// ============================================
// EQUIPMENT
// ============================================
export const equipmentApi = {
  getAll: (token, companyId, filters = {}) => {
    const params = new URLSearchParams({ company_id: companyId, ...filters });
    return fetchApi(`/equipment?${params}`, {}, token);
  },

  getById: (token, id) =>
    fetchApi(`/equipment/${id}`, {}, token),

  create: (token, data) =>
    fetchApi('/equipment', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token),

  update: (token, id, data) =>
    fetchApi(`/equipment/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, token),

  delete: (token, id) =>
    fetchApi(`/equipment/${id}`, { method: 'DELETE' }, token),

  activate: (token, id) =>
    fetchApi(`/equipment/${id}/activate`, { method: 'PATCH' }, token),

  getTypes: (token, companyId) =>
    fetchApi(`/equipment/types?company_id=${companyId}`, {}, token),

  getUsage: (token, id, startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return fetchApi(`/equipment/${id}/usage?${params}`, {}, token);
  },
};

// ============================================
// COST CODES
// ============================================
export const costCodesApi = {
  getAll: (token, filters = {}) => {
    const params = new URLSearchParams(filters);
    return fetchApi(`/cost-codes?${params}`, {}, token);
  },

  getById: (token, id) =>
    fetchApi(`/cost-codes/${id}`, {}, token),

  create: (token, data) =>
    fetchApi('/cost-codes', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token),

  update: (token, id, data) =>
    fetchApi(`/cost-codes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, token),

  delete: (token, id) =>
    fetchApi(`/cost-codes/${id}`, { method: 'DELETE' }, token),

  activate: (token, id, active) =>
    fetchApi(`/cost-codes/${id}/activate`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    }, token),

  search: (token, query, activeOnly = true) => {
    const params = new URLSearchParams({ q: query, active_only: activeOnly.toString() });
    return fetchApi(`/cost-codes/search?${params}`, {}, token);
  },
};

// ============================================
// PROJECT COST CODES (Budget)
// ============================================
export const projectCostCodesApi = {
  getForProject: (token, projectId, activeOnly = true) => {
    const params = new URLSearchParams({ active_only: activeOnly.toString() });
    return fetchApi(`/project-cost-codes/${projectId}/cost-codes?${params}`, {}, token);
  },

  assign: (token, projectId, data) =>
    fetchApi(`/project-cost-codes/${projectId}/cost-codes`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, token),

  updateBudget: (token, projectId, costCodeId, data) =>
    fetchApi(`/project-cost-codes/${projectId}/cost-codes/${costCodeId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, token),

  remove: (token, projectId, costCodeId) =>
    fetchApi(`/project-cost-codes/${projectId}/cost-codes/${costCodeId}`, {
      method: 'DELETE',
    }, token),

  getBudgetSummary: (token, projectId) =>
    fetchApi(`/project-cost-codes/${projectId}/budget-summary`, {}, token),
};

// ============================================
// CUSTOMERS
// ============================================
export const customersApi = {
  getAll: (token, companyId) =>
    fetchApi(`/customers?company_id=${companyId}`, {}, token),

  getById: (token, id) =>
    fetchApi(`/customers/${id}`, {}, token),

  create: (token, data) =>
    fetchApi('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token),

  update: (token, id, data) =>
    fetchApi(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, token),

  delete: (token, id) =>
    fetchApi(`/customers/${id}`, { method: 'DELETE' }, token),

  search: (token, companyId, query) => {
    const params = new URLSearchParams({ company_id: companyId, query });
    return fetchApi(`/customers/search?${params}`, {}, token);
  },

  getProjectsSummary: (token, id) =>
    fetchApi(`/customers/${id}/projects-summary`, {}, token),
};

// ============================================
// REPORTS
// ============================================
export const reportsApi = {
  getDashboard: (token, companyId, date) => {
    const params = new URLSearchParams({ company_id: companyId });
    if (date) params.append('date', date);
    return fetchApi(`/reports/dashboard?${params}`, {}, token);
  },

  getDailyCrew: (token, companyId, date) => {
    const params = new URLSearchParams({ company_id: companyId });
    if (date) params.append('date', date);
    return fetchApi(`/reports/daily-crew?${params}`, {}, token);
  },

  getEquipmentUtilization: (token, companyId, startDate, endDate) => {
    const params = new URLSearchParams({
      company_id: companyId,
      start_date: startDate,
      end_date: endDate,
    });
    return fetchApi(`/reports/equipment-utilization?${params}`, {}, token);
  },

  getUserTimecard: (token, userId, startDate, endDate) => {
    const params = new URLSearchParams({
      user_id: userId,
      start_date: startDate,
      end_date: endDate,
    });
    return fetchApi(`/reports/timecard?${params}`, {}, token);
  },

  getBudgetVsActual: (token, filters = {}) => {
    const params = new URLSearchParams(filters);
    return fetchApi(`/reports/budget-vs-actual?${params}`, {}, token);
  },

  getProductionReport: (token, filters = {}) => {
    const params = new URLSearchParams(filters);
    return fetchApi(`/reports/production?${params}`, {}, token);
  },

  getLaborCostReport: (token, filters = {}) => {
    const params = new URLSearchParams(filters);
    return fetchApi(`/reports/labor-cost?${params}`, {}, token);
  },
};

// ============================================
// EMPLOYEE ASSIGNMENTS
// ============================================
export const employeeAssignmentsApi = {
  assign: (token, foremanId, employeeId) =>
    fetchApi('/employee-assignments', {
      method: 'POST',
      body: JSON.stringify({ foreman_id: foremanId, employee_id: employeeId }),
    }, token),

  unassign: (token, foremanId, employeeId) =>
    fetchApi(`/employee-assignments/${foremanId}/${employeeId}`, {
      method: 'DELETE',
    }, token),

  getForemanCrew: (token, foremanId) =>
    fetchApi(`/employee-assignments/foreman/${foremanId}`, {}, token),

  getEmployeeForeman: (token, employeeId) =>
    fetchApi(`/employee-assignments/employee/${employeeId}`, {}, token),

  getAll: (token, companyId) =>
    fetchApi(`/employee-assignments?company_id=${companyId}`, {}, token),

  bulkAssign: (token, foremanId, employeeIds) =>
    fetchApi('/employee-assignments/bulk', {
      method: 'POST',
      body: JSON.stringify({ foreman_id: foremanId, employee_ids: employeeIds }),
    }, token),

  reassign: (token, employeeId, oldForemanId, newForemanId) =>
    fetchApi('/employee-assignments/reassign', {
      method: 'PUT',
      body: JSON.stringify({
        employee_id: employeeId,
        old_foreman_id: oldForemanId,
        new_foreman_id: newForemanId,
      }),
    }, token),
};

// ============================================
// DAILY PRODUCTION
// ============================================
export const dailyProductionApi = {
  getAll: (token, filters = {}) => {
    const params = new URLSearchParams(filters);
    return fetchApi(`/daily-production?${params}`, {}, token);
  },

  getById: (token, id) =>
    fetchApi(`/daily-production/${id}`, {}, token),

  create: (token, data) =>
    fetchApi('/daily-production', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token),

  update: (token, id, data) =>
    fetchApi(`/daily-production/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, token),

  delete: (token, id) =>
    fetchApi(`/daily-production/${id}`, { method: 'DELETE' }, token),

  getByProject: (token, projectId, startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return fetchApi(`/daily-production/project/${projectId}?${params}`, {}, token);
  },

  getByDate: (token, date, projectId) => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (projectId) params.append('project_id', projectId);
    return fetchApi(`/daily-production/by-date?${params}`, {}, token);
  },

  getSummary: (token, projectId) => {
    const params = new URLSearchParams();
    if (projectId) params.append('project_id', projectId);
    return fetchApi(`/daily-production/summary?${params}`, {}, token);
  },

  approve: (token, id) =>
    fetchApi(`/daily-production/${id}/approve`, { method: 'POST' }, token),
};

export default {
  auth: authApi,
  projects: projectsApi,
  timeEntries: timeEntriesApi,
  users: usersApi,
  equipment: equipmentApi,
  costCodes: costCodesApi,
  projectCostCodes: projectCostCodesApi,
  customers: customersApi,
  reports: reportsApi,
  employeeAssignments: employeeAssignmentsApi,
  dailyProduction: dailyProductionApi,
};
