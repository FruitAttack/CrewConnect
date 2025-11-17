// MUST BE THE NODE BACKEND'S IP ADDRESS USUALLY YOUR MACHINES IP ADDRESS FOR TESTING
// mac terminal command: ipconfig getifaddr en0
const API_URL = "http://192.168.86.22:5001"

export async function apiCall(route, method = 'GET', body = null) {
  try {
    const options = { method, headers: { 'Content-Type': 'application/json' } }
    if (body) options.body = JSON.stringify(body)

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