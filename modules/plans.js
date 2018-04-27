const req = require("./req");

module.exports = async function(operation, env, plan) {
  try {
    switch(operation) {
      case "list":
        return await req.get('instances/' + env.site_name + "/plans", env);
        break;
      case "plan":
        return await req.get('instances/' + env.site_name + "/plan", env);
        break;
      case "set":
        return await req.post('instances/' + env.site_name + "/set-plan",
          {"plan": plan}, env);
        break;
    }

  } catch(err) {
    return err;
  }
};
