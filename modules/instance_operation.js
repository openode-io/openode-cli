const log = require('./log')
const instanceReq = require('./instanceRequest')

module.exports = async function (operation, env, options = {}) {
  try {
    switch (operation) {
      case 'status':
        return await instanceReq.getOp('', env.site_name, env)
      case 'stats':
        return await instanceReq.getOp('stats', env.site_name, env)
      case 'logs': {
        const result = await instanceReq.getOp('logs', env.site_name, env, options)
        log.prettyPrint(result.logs)
        return {}
      }
      case 'stop':
        return await instanceReq.postOp('stop', env.site_name, options, env)
      case 'plans':
        return await instanceReq.getOp('plans', env.site_name, env, options)
      case 'plan':
        return await instanceReq.getOp('plan', env.site_name, env, options)
      case 'set-plan':
        return await instanceReq.postOp('set-plan', env.site_name, options, env)
      case 'scm-clone':
        return await instanceReq.postOp('scm-clone', env.site_name, options, env)
      case 'restart': {
        let parentExecutionId

        if (options.withLatestDeployment) {
          const optionsLatestDeployment = { ...options, status: 'success' }
          const latestDeployments = await instanceReq.getOp('executions/list/Deployment',
            env.site_name,
            env, optionsLatestDeployment)

          if (latestDeployments && latestDeployments.length > 0) {
            parentExecutionId = latestDeployments[0].id
          }
        }

        options.parent_execution_id =
          parentExecutionId ? `${parentExecutionId}` : undefined

        return await instanceReq.postOp('restart', env.site_name, options, env)
      }
      case 'reload':
        return await instanceReq.postOp('reload', env.site_name, options, env)
      case 'deployPreBuilt':
        return await instanceReq.postOp('deploy-pre-built', env.site_name, options, env)
      case 'listAliases': {
        const statusResult = await instanceReq.getOp('', env.site_name, env)

        try {
          return statusResult.domains
        } catch (err) {
          console.error(err)
          return []
        }
      }

      case 'cmd':
        return await instanceReq.postOp('cmd', env.site_name, options, env)

      case 'addAlias':
        return await instanceReq.postOp('add-alias', env.site_name, options, env)
      case 'delAlias':
        return await instanceReq.postOp('del-alias', env.site_name, options, env)
      case 'eraseAll':
        return await instanceReq.postOp('erase-all', env.site_name, options, env)
      case 'addLocation':
        return await instanceReq.postOp('add-location', env.site_name, {
          location_str_id: options.location_str_id
        }, env)
      case 'removeLocation':
        return await instanceReq.postOp('remove-location', env.site_name, {
          location_str_id: options.location_str_id
        }, env)

      case 'decreaseStorage':
        return await instanceReq.postOp('decrease-storage', env.site_name, {
          location_str_id: options.location_str_id,
          amount_gb: options.amountGB
        }, env)

      case 'locations':
        return await instanceReq.getOp('locations', env.site_name, env)

      case 'setConfig':
        return await instanceReq.postOp('set-config', env.site_name, {
          location_str_id: options.location_str_id,
          variable: options.variable,
          value: options.value
        }, env)

      case 'getConfig':
        return await instanceReq.getOp('get-config', env.site_name, env, options)

      case 'env':
        return await instanceReq.getOp('env_variables', env.site_name, env, options)

      case 'setEnv':
        return await instanceReq.postOp(`env_variables/${options.variable}`,
          env.site_name,
          {
            location_str_id: options.location_str_id,
            value: options.value
          },
          env)

      case 'delEnv':
        return await instanceReq.delOp(`env_variables/${options.variable}`,
          env.site_name, '', env)
    }
  } catch (err) {
    return err
  }
}
