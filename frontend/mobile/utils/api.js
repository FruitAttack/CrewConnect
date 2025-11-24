// MUST BE THE NODE BACKEND'S IP ADDRESS USUALLY YOUR MACHINES IP ADDRESS FOR TESTING
// mac terminal command: ipconfig getifaddr en0
const API_URL = "http://172.20.10.6:5001"

export async function apiCall(token, route, method = 'GET', body = null) {
  try {
    const headers = { 'Content-Type': 'application/json' }

    // Add Authorization header only if token provided
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const options = { method, headers }
    if (body) options.body = JSON.stringify(body)

    const response = await fetch(`${API_URL}/api/${route}`, options)

    // Attempt JSON parse always
    let data = {}
    try {
      data = await response.json()
    } catch {}

    if (!response.ok) {
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
    return {
      success: false,
      message: 'Error fetching data: ' + error.message
    }
  }
}