const assert = require('assert')
const WebSocket = require('ws')
const log = require('./log')
const _ = require('lodash')
const cliConfs = require('./cliConfs')

function listenOnOpen (ws, params) {
  ws.on('open', function open () {
    const msgToEstablish = { command: 'subscribe', identifier: JSON.stringify(params) }
    ws.send(JSON.stringify(msgToEstablish))
  })
}

function listenMessages (ws, callback) {
  assert.ok(callback)

  ws.on('message', (msg, isBinary) => {
    let input = null

    try {
      const message = isBinary ? msg : msg.toString()
      input = (typeof message === 'string') ? JSON.parse(message) : message
    } catch (err) {
      console.error(err)
      return null
    }

    if (input && ['ping', 'welcome'].includes(input.type)) {
      return
    }

    if (!input.message) {
      return
    }

    callback(input.message)
  })
}

function initiate (initParams, opts = {}) {
  const ws = new WebSocket(cliConfs.WS_ADDR, {
    headers: { token: opts.token }
  })

  listenOnOpen(ws, initParams)
  listenMessages(ws, opts.onMessage)

  return ws
}

function deploymentStream (result, token) {
  return new Promise((resolve) => {
    const MAX_MINUTES_DURATION = 10

    setTimeout(() => {
      log.prettyPrint(`timeout of ${MAX_MINUTES_DURATION} minutes reached... terminating`)
      process.exit(1)
    }, 1000 * 60 * MAX_MINUTES_DURATION)

    const deploymentId = _.get(result, '[0].result.deploymentId')

    if (!deploymentId) {
      log.prettyPrint(result)
      log.prettyPrint('No deployment attached... exiting')
      process.exit(1)
    }

    initiate({ channel: 'DeploymentsChannel', deployment_id: deploymentId }, {
      token,
      onMessage: function onMessage (msg) {
        if ((typeof msg.update) === 'string') {
          log.prettyPrint(`[${msg.level}] ${msg.update}`)
        } else if ((typeof msg.update) === 'object') {
          log.prettyPrint(msg.update)
        }

        if (['success', 'failed'].includes(msg.status) && msg.update === '...finalized.') {
          const exitCode = msg.status === 'failed' ? 1 : 0
          process.exit(exitCode)
        }
      }
    })
  })
}

module.exports = {
  initiate,
  deploymentStream
}
