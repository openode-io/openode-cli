const apiRequest = require('./req')

module.exports = async function (operation, env, storageArea) {
  try {
    switch (operation) {
      case 'list':
        return await apiRequest.get(`instances/${env.site_name}/storage-areas`, env)

      case 'add':
        return await apiRequest.post(`instances/${env.site_name}/add-storage-area`,
          { storage_area: storageArea }, env)

      case 'del':
        return await apiRequest.post(`instances/${env.site_name}/del-storage-area`,
          { storage_area: storageArea }, env)
    }
  } catch (err) {
    return err
  }
}
