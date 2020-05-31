const env = require('./env')

module.exports = function (token, site_name) { // eslint-disable-line
  const configs = {
    token,
    site_name
  }

  env.set(configs)
}
