export async function apiCall(token, route, method = 'GET', body = null) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const headers = { 'Content-Type': 'application/json' }
    
    // Add Authorization header only if token provided
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    const options = { 
      method, 
      headers,
      signal: controller.signal
    }
    
    if (body) {
      options.body = JSON.stringify(body)
    }
    
    // Use relative URL in production (when deployed as web app), localhost in development
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? '' 
      : (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001');
    const url = `${baseUrl}/api/${route}`
    console.log(`API Call: ${method} ${url}`)
    
    const response = await fetch(url, options)
    
    // Clear timeout on successful response
    clearTimeout(timeoutId)
    
    // Attempt JSON parse always
    let data = {}
    try {
      data = await response.json();
    } catch (parseError) {
      console.warn('Failed to parse JSON response:', parseError);
    }

    if (!response.ok) {
      console.error(`API Error: ${response.status} - ${response.statusText}`, data);
      return {
        success: false,
        message:
          data.error ||
          data.message ||
          `HTTP error ${response.status}: ${response.statusText}`,
      };
    }

    return { success: true, message: 'Successfully got data', data };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('API Call Error:', error);
    if (error.name === 'AbortError') {
      return { success: false, message: 'Request timed out. Please check your connection and try again.' };
    }
    return { success: false, message: 'Error fetching data: ' + error.message };
  }
}

// ============================================
// FORMS
// ============================================
export async function getForms(token, filters = {}) {
  const params = new URLSearchParams(filters).toString();
  return apiCall(token, `forms${params ? `?${params}` : ''}`);
}
export async function createForm(token, formData) {
  return apiCall(token, 'forms', 'POST', formData);
}
export async function updateForm(token, formId, updates) {
  return apiCall(token, `forms/${formId}`, 'PUT', updates);
}
export async function deleteForm(token, formId) {
  return apiCall(token, `forms/${formId}`, 'DELETE');
}
export async function getForm(token, formId) {
  return apiCall(token, `forms/${formId}`);
}

// ============================================
// FORM SUBMISSIONS
// ============================================
export async function getFormSubmissions(token, formId = null, filters = {}) {
  const queryParams = { ...filters };
  if (formId) queryParams.form_id = formId;
  const params = new URLSearchParams(queryParams).toString();
  return apiCall(token, `form-submissions${params ? `?${params}` : ''}`);
}
export async function submitForm(token, formId, payload) {
  const dataPayload = payload?.data ?? payload;
  return apiCall(token, 'form-submissions', 'POST', {
    formId,
    form_id: formId,
    data: dataPayload,
    associatedProjectId: payload?.associatedProjectId,
    associatedEquipmentId: payload?.associatedEquipmentId,
    associatedUserId: payload?.associatedUserId,
    associatedCostCodeId: payload?.associatedCostCodeId,
  });
}
export async function updateFormSubmission(token, submissionId, updates) {
  return apiCall(token, `form-submissions/${submissionId}`, 'PUT', updates);
}
export async function deleteFormSubmission(token, submissionId) {
  return apiCall(token, `form-submissions/${submissionId}`, 'DELETE');
}
export async function updateCustomer(token, customerId, updates) {
  return apiCall(token, `customers/${customerId}`, 'PUT', updates);
}
export async function deleteCustomer(token, customerId) {
  return apiCall(token, `customers/${customerId}`, 'DELETE');
}

// ============================================
// USERS
// ============================================
export async function getUserProfile(token) {
  return apiCall(token, 'users/me');
}
export async function getAllUsers(token, filters = {}) {
  const params = new URLSearchParams(filters).toString();
  return apiCall(token, `users${params ? `?${params}` : ''}`);
}

// ============================================
// CREWS
// ============================================
export async function getCrews(token, companyId) {
  return apiCall(token, `crews?company_id=${companyId}`);
}

// ============================================
// TIME ENTRIES
// ============================================
export async function getTimeEntries(token, filters = {}) {
  const params = new URLSearchParams(filters).toString();
  return apiCall(token, `time-entries${params ? `?${params}` : ''}`);
}

// ============================================
// TIMECARD APPROVALS
// ============================================
export async function getTimecardApprovals(token, filters = {}) {
  const params = new URLSearchParams(filters).toString();
  return apiCall(token, `timecard-approvals${params ? `?${params}` : ''}`);
}

/**
 * Upsert a single timecard approval.
 * Employee submitting:  { company_id, user_id, week_start, week_end, status: 'pending' }
 * Foreman approving:    { company_id, user_id, week_start, week_end, status: 'approved', notes? }
 * Foreman rejecting:    { company_id, user_id, week_start, week_end, status: 'rejected', notes? }
 */
export async function upsertTimecardApproval(token, body) {
  return apiCall(token, 'timecard-approvals', 'POST', body);
}

/**
 * Bulk approve/reject multiple employees at once.
 * { company_id, week_start, week_end, user_ids: [], status, notes? }
 */
export async function bulkUpdateTimecardApprovals(token, body) {
  return apiCall(token, 'timecard-approvals/bulk', 'POST', body);
}

// ============================================
// TIME OFF
// ============================================
export async function getTimeOffAll(token, filters = {}) {
  const params = new URLSearchParams(filters).toString();
  return apiCall(token, `time-off/all${params ? `?${params}` : ''}`);
}
export async function approveTimeOff(token, requestId) {
  return apiCall(token, `time-off/${requestId}/approve`, 'PATCH');
}
export async function denyTimeOff(token, requestId, reason) {
  return apiCall(token, `time-off/${requestId}/deny`, 'PATCH', { notes: reason });
}

// ============================================
// OFFLINE TIME ENTRY SYNCRONIZATION
// ============================================
export async function offlineClockIn(token, body) {
  return apiCall(token, "offline-time-entries/clock-in", "POST", body);
}

export async function offlineClockOut(token, body) {
  return apiCall(token, "offline-time-entries/clock-out", "POST", body);
}

export async function offlineStartBreak(token, body) {
  return apiCall(token, "offline-time-entries/break/start", "POST", body);
}

export async function offlineEndBreak(token, body) {
  return apiCall(token, "offline-time-entries/break/end", "POST", body);
}
