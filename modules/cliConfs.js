const closestHttpEndpoint = require("closest-http-endpoint")({ timeoutRequest: 3 });

const API_ENDPOINTS = [
  // "http://localhost:3180/global/test/"
  "https://api.openode.io/global/test/",
  "https://api2.openode.io/global/test/"
]

function normalizeApiUrl(url) {
  return url.replace("/global/test/", "/");
}

const confs = {
  "API_URL": normalizeApiUrl(API_ENDPOINTS[0])
};

async function determineClosestEndpoint() {
  confs.API_URL = normalizeApiUrl(await closestHttpEndpoint(API_ENDPOINTS));
}

function getApiUrl() {
  return confs.API_URL;
}

module.exports = {
  API_URL: confs.API_URL,
  getApiUrl,
  determineClosestEndpoint
}
