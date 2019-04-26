
const API_ENDPOINTS = [
  "https://api.openode.io/",
  "https://apifr.openode.io/"
]

const confs = {
  // "API_URL": "http://localhost:3180/"
  "API_URL": API_ENDPOINTS[0]
};

async function determineClosestEndpoint() {

}

module.exports = {
  API_URL: confs.API_URL,
  determineClosestEndpoint
}
