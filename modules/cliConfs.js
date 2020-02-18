const closestHttpEndpoint = require("closest-http-endpoint")({ timeoutRequest: 3 });

const API_ENDPOINTS = [
  "http://localhost:3000/global/test/",
  // "https://apitest.openode.io/global/test/"
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
