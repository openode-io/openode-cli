const expect = require('expect.js')
const fs = require("fs")
const auth = require("../modules/auth")
const cliConfs = require("../modules/cliConfs")
const nock = require("nock")

describe('auth', function() {
  describe('tokenValid', function() {
    it("happy path", async function() {
      nock(cliConfs.getApiUrl(), {
        reqheaders: {
          'x-auth-token': '1234'
        }
      })
      .get('/account/me')
      .reply(200, {
        id: 123456
       });

      const result = await auth.tokenValid('1234')
      expect(result).to.equal(true)
    })

    it("non 200 status", async function() {
      nock(cliConfs.getApiUrl(), {
        reqheaders: {
          'x-auth-token': '1234'
        }
      })
      .get('/account/me')
      .reply(400, {
        id: 123456
       });

      const result = await auth.tokenValid('1234')
      expect(result).to.equal(false)
    })
  })
})
