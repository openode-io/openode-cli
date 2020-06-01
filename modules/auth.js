const apiRequest = require('./req')
const log = require('./log')
const inquirer = require('inquirer')

// TODO: use a faster route to verify the token
function tokenValid (token) {
  return apiRequest.get('instances/', {
    token
  }, {
    skipResponseProcessing: true
  })
}

function authenticate (email, password) {
  return apiRequest.post('account/getToken', {
    email,
    password
  }, {
    token: ''
  })
}

function signupApi (email, password, passwordConfirmation, newsletter) {
  return apiRequest.post('account/register', {
    account: {
      email,
      password,
      password_confirmation: passwordConfirmation,
      newsletter
    }
  }, {
    token: ''
  })
}

async function login () {
  const schema = [{
    type: 'input',
    message: 'email:',
    name: 'email'
  },
  {
    type: 'password',
    message: 'Password:',
    name: 'password'
  }
  ]
  const result = await inquirer.prompt(schema)
  return new Promise((resolve, reject) => {
    authenticate(result.email, result.password).then((token) => {
      resolve(token)
    }).catch(err => {
      reject(err)
    })
  })
}

async function wantsNewsletter () {
  const schema = [{
    type: 'input',
    message: 'Subscribe to the newsletter ([y]es or [n]o) ?',
    name: 'wantsNewsletter',
    choices: ['y', 'n'],
    default: 'y'
  }]
  const result = await inquirer.prompt(schema)
  return result.wantsNewsletter === 'y' ? 1 : 0
}

async function signup () {
  const schema = [{
    type: 'input',
    message: 'email:',
    name: 'email'
  },
  {
    type: 'password',
    message: 'Password:',
    name: 'password'
  },
  {
    type: 'password',
    message: 'Repeat Password:',
    name: 'password_confirmation'
  }
  ]

  let user = null

  while (user === null) {
    try {
      const result = await inquirer.prompt(schema)
      const newsletter = await wantsNewsletter()
      user = await signupApi(result.email, result.password, result.password_confirmation, newsletter)

      if (user) {
        return user.token
      }
    } catch (err) {
      log.err(err)
      user = null
      if (!err.error) {
        return null
      }
    }
  }

  return user.token
}

async function loginOrSignup () {
  const schema = [{
    type: 'input',
    message: 'Would you like to [l]ogin or [r]egister a new account?',
    name: 'loginOrSignup',
    choices: ['l', 'r'],
    default: 'r'
  }]
  const result = await inquirer.prompt(schema)
  return await new Promise((resolve, reject) => {
    switch (result.loginOrSignup) {
      case 'l':
        login().then((token) => {
          resolve(token)
        }).catch((err) => {
          reject(err)
        })
        break
      case 'r':
        signup().then((token) => {
          resolve(token)
        }).catch((err) => {
          reject(err)
        })
        break
      default:
        resolve({ error: 'invalid input: [r]egister or [l]ogin only' })
        break
    }
  })
}

module.exports = function (env) {
  return new Promise((resolve, reject) => {
    tokenValid(env.token).then((isValid) => {
      if (isValid) {
        log.out('[+] Authentication valid.')
        resolve(env.token)
      } else {
        loginOrSignup().then((token) => {
          log.out('[+] Authentication valid.')
          resolve(token)
        }).catch(err => {
          reject(err)
        })
      }
    }).catch((err) => {
      console.log(err)
      reject(err)
    })
  })
}
