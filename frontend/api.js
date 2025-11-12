// MUST BE THE NODE BACKEND'S IP ADDRESS USUALLY YOUR MACHINES IP ADDRESS FOR TESTING
// mac terminal command: ipconfig getifaddr en0
const API_URL = "http://192.168.86.22:5001"

export async function fetchData(route) {
    try {
        const response = await fetch(`${API_URL}/api/${route}`)
        const data = await response.json()
        return {
            sucess: true,
            message: "Sucesfully got data",
            data
        }
    } catch(error) {
        console.log("Error fetching data: ", error)
        return {
            sucess: false,
            message: "Error fetching data: " + error.message
        }
    }
}