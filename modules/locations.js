const req = require("./req");

module.exports = async function(env) {
  try {
    return await req.get('global/available-locations', env);
  } catch(err) {
    return err;
  }
};
