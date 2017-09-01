const env = require('./env');

module.exports = function (token, site_name) {
  const configs = {
    token,
    site_name
  };

  env.set(configs);
}
