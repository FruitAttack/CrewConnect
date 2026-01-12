
export async function apiCall(token, route, method = 'GET', body = null) {
  // Create AbortController for timeout (React Native compatible)
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