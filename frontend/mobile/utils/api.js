
export async function apiCall(token, route, method = 'GET', body = null) {
  // Create AbortController for timeout 
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
  
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
    
    const url = `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/${route}`
    console.log(`API Call: ${method} ${url}`)
    
    const response = await fetch(url, options)
    
    // Clear timeout on successful response
    clearTimeout(timeoutId)
    
    // Attempt JSON parse always
    let data = {}
    try {
      data = await response.json()
    } catch (parseError) {
      console.warn('Failed to parse JSON response:', parseError)
    }
    
    if (!response.ok) {
      console.error(`API Error: ${response.status} - ${response.statusText}`, data)
      return {
        success: false,
        message:
          data.message ||
          `HTTP error ${response.status}: ${response.statusText}`
      }
    }
    
    return {
      success: true,
      message: 'Successfully got data',
      data
    }
  } catch (error) {
    // Clear timeout on error
    clearTimeout(timeoutId)
    
    console.error('API Call Error:', error)
    
    // Handle abort/timeout specifically
    if (error.name === 'AbortError') {
      return {
        success: false,
        message: 'Request timed out. Please check your connection and try again.'
      }
    }
    
    return {
      success: false,
      message: 'Error fetching data: ' + error.message
    }
  }
}


// ============================================
// FORMS (dummy data from sampleForms)
// ============================================

// Get all forms from backend
export async function getForms(token, filters = {}) {
  const params = new URLSearchParams(filters).toString();
  return apiCall(token, `forms${params ? `?${params}` : ''}`);
}

// Create a new form
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
  if (formId) {
    queryParams.form_id = formId;
  }
  const params = new URLSearchParams(queryParams).toString();
  return apiCall(token, `form-submissions${params ? `?${params}` : ''}`);
}

export async function submitForm(token, formId, payload) {
  const dataPayload = payload?.data ?? payload;
  return apiCall(token, 'form-submissions', 'POST', {
    formId: formId,
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
  return apiCall(token, `customers/${customerId}`, 'PUT', updates)
}

export async function deleteCustomer(token, customerId) {
  return apiCall(token, `customers/${customerId}`, 'DELETE')
}
