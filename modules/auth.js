const fetch = require("./req");
const log = require("./log");
const prompt = require("prompt");
const promptUtil = require("./promptUtil")

function tokenValid(token) {
  return fetch.get('instances/', {
    token: token
  },null, true)
}

function authenticate(email, password) {
  return fetch.post('account/getToken', {
    email,
    password
  }, {
    token: ''
  })
}

function signupApi(email, password, password_confirmation, newsletter) {
  return fetch.post('account/register',{
    account: {
      email,
      password,
      password_confirmation,
      newsletter
    }
  }, { token: '' } )
}

function login() {
  return new Promise((resolve, reject) => {
    const schema = {
      properties: {
        email: {
          required: true
        },
        password: {
          hidden: true
        }
      }
    };

    prompt.start();

    prompt.get(schema, function (err, result) {
      if (err) {
        reject(err);
      } else {
        authenticate(result.email, result.password).then((token) => {
          resolve(token);
        }).catch(err => {
          reject(err);
        });
      }
    });
  });
}

function wantsNewsletter() {
  return new Promise((resolve, reject) => {
    const schema = {
      properties: {
        wantsNewsletter: {
          description: 'Subscribe to the newsletter ([y]es or [n]o) ?',
          pattern: /^[y,n]$/,
          message: 'Invalid input, please enter either Y or N.',
          required: true,
          default: "y"
        }
      }
    };

    prompt.start();

    prompt.get(schema, function (err, result) {
      if (err || !result) {
        return reject(err);
      } else {
        resolve(result.wantsNewsletter);
      }
    });
  });
}

async function signup() {
  const schema = {
    properties: {
      email: {
        required: true
      },
      password: {
        hidden: true
      },
      password_confirmation: {
        hidden: true
      }
    }
  };

  let user = null;

  while (user == null) {

    try {
      let result = await promptUtil.promisifyPrompt(schema);
      let newsletter = (await wantsNewsletter()) === 'y';
      user = await signupApi(result.email, result.password, result.password_confirmation, newsletter);

      if (user) {
        return user.token;
      }
    } catch (err) {
      log.err(err);
      user = null;

      if (!err.error) {
        return null;
      }
    }
  }

  return user.token;
}

function loginOrSignup() {
  return new Promise((resolve, reject) => {
    const schema = {
      properties: {
        loginOrSignup: {
          description: 'Would you like to [l]ogin or [r]egister a new account?',
          pattern: /^[l,r]$/,
          message: 'Invalid input, please enter either l to [l]ogin or r to [r]egister.',
          required: true,
          default: "r"
        }
      }
    };

    prompt.start();

    prompt.get(schema, function (err, result) {

      if (err || !result) {
        return reject(err);
      }

      if (result.loginOrSignup == "l") {
        login().then((token) => {
          resolve(token);
        }).catch((err) => {
          console.log(err);
          reject(err)
        });
      } else if (result.loginOrSignup == "r") {
        signup().then((token) => {
          resolve(token);
        }).catch((err) => {
          console.log(err);
          reject(err)
        });

      } else {

      }
    });
  });
}

module.exports = function (env) {
  return new Promise((resolve, reject) => {
    tokenValid(env.token).then((isValid) => {
      if (isValid) {
        log.out("[+] Authentication valid.")
        resolve(env.token);
      } else {
        loginOrSignup().then((token) => {
          log.out("[+] Authentication valid.")
          resolve(token);
        }).catch(err => {
          reject(err);
        });
      }
    }).catch((err) => {
      console.log(err);
      reject(err);
    });
  });
};