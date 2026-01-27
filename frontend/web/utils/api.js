// MUST BE THE NODE BACKEND'S IP ADDRESS USUALLY YOUR MACHINES IP ADDRESS FOR TESTING
// mac terminal command: ipconfig getifaddr en0
// windows command: ipconfig (look for IPv4 Address)
const API_URL = "http://localhost:5001"
import { SAMPLE_FORMS } from "./sampleForms"
//const API_URL = "http://192.168.86.22:5001"

/**
 * Make API call with optional authentication
 * @param {string} route - API route (without /api/ prefix)
 * @param {string} token - JWT token for authentication (optional)
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE, PATCH)
 * @param {object} body - Request body for POST/PUT requests
 */
export async function apiCall(route, token = null, method = 'GET', body = null) {
  try {
    const options = { 
      method, 
      headers: { 'Content-Type': 'application/json' } 
    }
    
    // Add auth token if provided
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`
    }
    
    if (body) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(`${API_URL}/api/${route}`, options)

    // Try to parse the JSON body even if response is not OK
    let data = {}
    try {
      data = await response.json()
    } catch (err) {
      // Ignore JSON parse errors
    }

    if (!response.ok) {
      return {
        success: false,
        message: data.message || `HTTP error ${response.status}: ${response.statusText}`
      }
    }

    return { success: true, message: "Successfully got data", data }

  } catch (error) {
    return { success: false, message: "Error fetching data: " + error.message }
  }
}

// ============================================
// PROJECTS
// ============================================
export async function getProjects(token, companyId, filters = {}) {
  const params = new URLSearchParams({ company_id: companyId, ...filters })
  return apiCall(`projects?${params}`, token)
}

export async function getProject(token, projectId) {
  return apiCall(`projects/${projectId}`, token)
}

export async function createProject(token, projectData) {
  return apiCall('projects', token, 'POST', projectData)
}

export async function updateProject(token, projectId, updates) {
  return apiCall(`projects/${projectId}`, token, 'PUT', updates)
}

export async function deleteProject(token, projectId, hardDelete = false) {
  const params = hardDelete ? '?hard_delete=true' : ''
  return apiCall(`projects/${projectId}${params}`, token, 'DELETE')
}

export async function activateProject(token, projectId) {
  return apiCall(`projects/${projectId}/activate`, token, 'PATCH')
}

export async function getProjectLaborSummary(token, projectId, startDate, endDate) {
  const params = new URLSearchParams()
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)
  return apiCall(`projects/${projectId}/labor-summary?${params}`, token)
}

export async function getProjectCostBreakdown(token, projectId, startDate, endDate) {
  const params = new URLSearchParams()
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)
  return apiCall(`projects/${projectId}/cost-breakdown?${params}`, token)
}

// ============================================
// USERS
// ============================================
export async function getUsers(token, companyId) {
  return apiCall(`users?company_id=${companyId}`, token)
}

export async function getUser(token, userId) {
  return apiCall(`users/${userId}`, token)
}

export async function getUserProfile(token) {
  return apiCall('users/me', token)
}

export async function updateUser(token, userId, updates) {
  return apiCall(`users/${userId}`, token, 'PUT', updates)
}

export async function updateUserEmployment(token, userId, data) {
  return apiCall(`users/${userId}/employment`, token, 'POST', data)
}

export async function getClockedInUsers(token, companyId) {
  return apiCall(`users/clocked-in?company_id=${companyId}`, token)
}

// Create a new user (Admin only)
export async function createUser(token, userData) {
  return apiCall('users', token, 'POST', userData)
}

// Soft delete user (sets is_active = false)
export async function deleteUser(token, userId, hardDelete = false) {
  const params = hardDelete ? '?hard_delete=true' : ''
  return apiCall(`users/${userId}${params}`, token, 'DELETE')
}

// Reactivate a deactivated user
export async function activateUser(token, userId) {
  return apiCall(`users/${userId}/activate`, token, 'PATCH')
}

// Alias for getAllUsers (matches what employees.jsx expects)
export async function getAllUsers(token, params = {}) {
  const query = new URLSearchParams(params).toString()
  return apiCall(`users${query ? `?${query}` : ''}`, token)
}

// ============================================
// TIME ENTRIES
// ============================================
export async function getTimeEntries(token, companyId, filters = {}) {
  const params = new URLSearchParams({ company_id: companyId, ...filters })
  return apiCall(`time-entries?${params}`, token)
}

export async function getCurrentTimeEntry(token) {
  return apiCall('time-entries/current', token)
}

export async function clockIn(token, data) {
  return apiCall('time-entries/clock-in', token, 'POST', data)
}

export async function clockOut(token, data) {
  return apiCall('time-entries/clock-out', token, 'POST', data)
}

export async function getTimeEntry(token, entryId) {
  return apiCall(`time-entries/${entryId}`, token)
}

export async function updateTimeEntry(token, entryId, updates) {
  return apiCall(`time-entries/${entryId}`, token, 'PUT', updates)
}

export async function deleteTimeEntry(token, entryId) {
  return apiCall(`time-entries/${entryId}`, token, 'DELETE')
}

// ============================================
// FOREMAN/ADMIN MANAGEMENT
// ============================================

// Get full roster (all employees with their clock status)
export async function getActiveRoster(token, companyId) {
  return apiCall(`time-entries/manage/active?company_id=${companyId}`, token)
}

export async function clockInForUser(token, userId, data) {
  return apiCall(`time-entries/manage/${userId}/clock-in`, token, 'POST', data)
}

export async function clockOutForUser(token, userId, data) {
  return apiCall(`time-entries/manage/${userId}/clock-out`, token, 'POST', data)
}

export async function switchTaskForUser(token, userId, data) {
  return apiCall(`time-entries/manage/${userId}/switch-task`, token, 'POST', data)
}

// Start break for an employee (foreman/admin)
export async function startBreakForUser(token, userId, data = {}) {
  return apiCall(`time-entries/manage/${userId}/break/start`, token, 'POST', data)
}

// End break for an employee (foreman/admin)
export async function endBreakForUser(token, userId, data = {}) {
  return apiCall(`time-entries/manage/${userId}/break/end`, token, 'POST', data)
}

// ============================================
// REPORTS
// ============================================
export async function getDashboard(token, companyId, date) {
  const params = new URLSearchParams({ company_id: companyId })
  if (date) params.append('date', date)
  return apiCall(`reports/dashboard?${params}`, token)
}

export async function getDailyCrew(token, companyId, date) {
  const params = new URLSearchParams({ company_id: companyId })
  if (date) params.append('date', date)
  return apiCall(`reports/daily-crew?${params}`, token)
}

export async function getTimecard(token, userId, startDate, endDate) {
  const params = new URLSearchParams({
    user_id: userId,
    start_date: startDate,
    end_date: endDate,
  })
  return apiCall(`reports/timecard?${params}`, token)
}

export async function getBudgetVsActual(token, projectId, costCodeId) {
  const params = new URLSearchParams()
  if (projectId) params.append('project_id', projectId)
  if (costCodeId) params.append('cost_code_id', costCodeId)
  return apiCall(`reports/budget-vs-actual?${params}`, token)
}

export async function getLaborCostReport(token, projectId, startDate, endDate) {
  const params = new URLSearchParams()
  if (projectId) params.append('project_id', projectId)
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)
  return apiCall(`reports/labor-cost?${params}`, token)
}

export async function getProductionReport(token, projectId, startDate, endDate) {
  const params = new URLSearchParams()
  if (projectId) params.append('project_id', projectId)
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)
  return apiCall(`reports/production?${params}`, token)
}

export async function getEquipmentUtilization(token, companyId, startDate, endDate) {
  const params = new URLSearchParams({
    company_id: companyId,
    start_date: startDate,
    end_date: endDate,
  })
  return apiCall(`reports/equipment-utilization?${params}`, token)
}

// ============================================
// CUSTOMERS
// ============================================
export async function getCustomers(token, companyId) {
  return apiCall(`customers?company_id=${companyId}`, token)
}

export async function getCustomer(token, customerId) {
  return apiCall(`customers/${customerId}`, token)
}

export async function createCustomer(token, customerData) {
  return apiCall('customers', token, 'POST', customerData)
}

// ============================================
// FORMS (dummy data from sampleForms)
// ============================================
export async function getForms(token, companyId) {
  // return dummy data structure consistent with API callers
  return {
    success: true,
    message: "OK",
    data: { forms: SAMPLE_FORMS },
  }
}

export async function getForm(token, formId) {
  const form = SAMPLE_FORMS.find(f => f.id === formId)
  if (!form) {
    return { success: false, message: "Form not found" }
  }
  return { success: true, message: "OK", data: { form } }
}

export async function submitForm(token, formId, payload) {
  // echo submission for now
  return {
    success: true,
    message: "Submission received",
    data: { formId, payload },
  }
}

export async function updateCustomer(token, customerId, updates) {
  return apiCall(`customers/${customerId}`, token, 'PUT', updates)
}

export async function deleteCustomer(token, customerId) {
  return apiCall(`customers/${customerId}`, token, 'DELETE')
}

// ============================================
// EQUIPMENT
// ============================================
export async function getEquipment(token, companyId) {
  return apiCall(`equipment?company_id=${companyId}`, token)
}

export async function getEquipmentById(token, equipmentId) {
  return apiCall(`equipment/${equipmentId}`, token)
}

export async function createEquipment(token, equipmentData) {
  return apiCall('equipment', token, 'POST', equipmentData)
}

export async function updateEquipment(token, equipmentId, updates) {
  return apiCall(`equipment/${equipmentId}`, token, 'PUT', updates)
}

export async function deleteEquipment(token, equipmentId) {
  return apiCall(`equipment/${equipmentId}`, token, 'DELETE')
}

// ============================================
// COST CODES
// ============================================
export async function getCostCodes(token) {
  return apiCall('cost-codes', token)
}

export async function getCostCode(token, costCodeId) {
  return apiCall(`cost-codes/${costCodeId}`, token)
}

export async function createCostCode(token, costCodeData) {
  return apiCall('cost-codes', token, 'POST', costCodeData)
}

export async function updateCostCode(token, costCodeId, updates) {
  return apiCall(`cost-codes/${costCodeId}`, token, 'PUT', updates)
}

export async function deleteCostCode(token, costCodeId) {
  return apiCall(`cost-codes/${costCodeId}`, token, 'DELETE')
}

// ============================================
// PROJECT COST CODES
// ============================================

// Get cost codes assigned to a specific project
// Returns the join table with nested cost_code objects
export async function getProjectCostCodes(token, projectId) {
  return apiCall(`projects/${projectId}/cost-codes`, token)
}

// Gets both active and inactive cost codes
export async function getAllProjectCostCodes(token, projectId) {
  return apiCall(`projects/${projectId}/cost-codes?active_only=false`, token);
}

export async function assignCostCodeToProject(token, projectId, data) {
  return apiCall(`projects/${projectId}/cost-codes`, token, 'POST', data)
}

export async function removeCostCodeFromProject(token, projectId, costCodeId) {
  return apiCall(`projects/${projectId}/cost-codes/${costCodeId}`, token, 'DELETE')
}

export async function updateProjectCostCodeBudget(token, projectId, costCodeId, updates) {
  return apiCall(`projects/${projectId}/cost-codes/${costCodeId}/budget`, token, 'PUT', updates)
}

export async function getProjectBudgetSummary(token, projectId) {
  return apiCall(`projects/${projectId}/budget-summary`, token)
}

// ============================================
// EMPLOYEE ASSIGNMENTS
// ============================================
export async function getProjectAssignments(token, projectId) {
  return apiCall(`employee-assignments?project_id=${projectId}`, token)
}

export async function getUserAssignments(token, userId) {
  return apiCall(`employee-assignments?user_id=${userId}`, token)
}

export async function assignEmployee(token, data) {
  return apiCall('employee-assignments', token, 'POST', data)
}

export async function removeAssignment(token, assignmentId) {
  return apiCall(`employee-assignments/${assignmentId}`, token, 'DELETE')
}

// ============================================
// DAILY PRODUCTION
// ============================================
export async function getDailyProduction(token, companyId, filters = {}) {
  const params = new URLSearchParams({ company_id: companyId, ...filters })
  return apiCall(`daily-production?${params}`, token)
}

export async function createDailyProhduction(token, data) {
  return apiCall('daily-production', token, 'POST', data)
}

export async function updateDailyProduction(token, id, updates) {
  return apiCall(`daily-production/${id}`, token, 'PUT', updates)
}

export async function deleteDailyProduction(token, id) {
  return apiCall(`daily-production/${id}`, token, 'DELETE')
}