const axios = require('axios');
async function dbConfigurations(C_APP_URL) { 
    try {
        let apiUrl = [
            C_APP_URL,
            "/api/config-db",
        ].join("");
    
        const response = await axios.get(apiUrl);

        return response.data;
    } catch (err) { console.log(err); return [];}
}

module.exports = {
    dbConfigurations,
}