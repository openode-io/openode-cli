
const API_ENDPOINTS = [
  // 'http://localhost:3000/global/test/'
  'https://api.openode.io/global/test/'
]

function normalizeApiUrl (url) {
  return url.replace('/global/test/', '/')
}

const confs = {
  API_URL: normalizeApiUrl(API_ENDPOINTS[0]),
  WS_ADDR: 'wss://api.openode.io/streams'
  // WS_ADDR: 'ws://localhost:3000/streams'
}

async function determineClosestEndpoint () {
  confs.API_URL = normalizeApiUrl(API_ENDPOINTS[0])
}

function getApiUrl () {
  return confs.API_URL
}

module.exports = {
  API_URL: confs.API_URL,
  WS_ADDR: confs.WS_ADDR,
  getApiUrl,
  determineClosestEndpoint
}
