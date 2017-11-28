const expect = require('expect.js');
const instanceModule = require("../modules/instance_operation.js");
const nock = require("nock");
const cliConfs = require("../modules/cliConfs");

describe('Instance Operation', function() {

  describe('status', function() {
    it("should return status with valid instance", function(done) {
      nock(cliConfs.API_URL)
        .get('/instances/mysite/?')
        .reply(200, {
          "site_name": "mysite",
          "valid": true
         });

      instanceModule("status", {"site_name": "mysite", "token": "asfd"}).then((result) => {
        expect(result.site_name).to.equal("mysite");
        expect(result.valid).to.equal(true);
        done();
      }).catch(err => {
        done(err);
      });
    });

  });

  describe('stop', function() {
    it("should return status with valid instance", function(done) {
      nock(cliConfs.API_URL)
        .get('/instances/mysite/stop?')
        .reply(200, {
          "result": "success"
         });

      instanceModule("stop", {"site_name": "mysite", "token": "asfd"}).then((result) => {
        expect(result.result).to.equal("success");
        done();
      }).catch(err => {
        done(err);
      });
    });

    it("should return 500 with invalid response", function(done) {
      nock(cliConfs.API_URL)
        .get('/instances/mysite/stop?')
        .reply(500, {
          "error": {}
         });

      instanceModule("stop", {"site_name": "mysite", "token": "asfd"}).then((result) => {
        expect(JSON.stringify(result.error)).to.equal("{}")
        done();
      }).catch(err => {
        done("invalid");
      });
    });
  });

  describe('restart', function() {
    it("should return status with valid instance", function(done) {
      nock(cliConfs.API_URL)
        .get('/instances/mysite/restart?')
        .reply(200, {
          "result": "success"
         });

      instanceModule("restart", {"site_name": "mysite", "token": "asfd"}).then((result) => {
        expect(result.result).to.equal("success");
        done();
      }).catch(err => {
        done(err);
      });
    });

    it("should return 500 with invalid response", function(done) {
      nock(cliConfs.API_URL)
        .get('/instances/mysite/restart?')
        .reply(500, {
          "error": {}
         });

      instanceModule("restart", {"site_name": "mysite", "token": "asfd"}).then((result) => {
        expect(JSON.stringify(result.error)).to.equal("{}")
        done();
      }).catch(err => {
        done("invalid");
      });
    });
  });

  describe('locations', function() {
    it("should return locations with valid instance", function(done) {
      nock(cliConfs.API_URL)
        .get('/instances/mysite/locations?')
        .reply(200, {
          "result": "success"
         });

      instanceModule("locations", {"site_name": "mysite", "token": "asfd"}).then((result) => {
        expect(result.result).to.equal("success");
        done();
      }).catch(err => {
        done(err);
      });
    });

    it("should call proper api when adding location", function(done) {
      nock(cliConfs.API_URL)
        .post('/instances/mysite/add-location')
        .reply(200, {
          "result": "success"
         });

      instanceModule("addLocation", {"site_name": "mysite", "token": "asfd"}).then((result) => {
        expect(result.result).to.equal("success");
        done();
      }).catch(err => {
        done(err);
      });
    });

    it("should call proper api when removing location", function(done) {
      nock(cliConfs.API_URL)
        .post('/instances/mysite/remove-location')
        .reply(200, {
          "result": "success"
         });

      instanceModule("removeLocation", {"site_name": "mysite", "token": "asfd"}).then((result) => {
        expect(result.result).to.equal("success");
        done();
      }).catch(err => {
        done(err);
      });
    });
  });

  describe('list-aliases', function() {
    it("should return status with valid instance", function(done) {
      nock(cliConfs.API_URL)
        .get('/instances/my.site/?')
        .reply(200, {
          "domains": "[]"
         });

      instanceModule("listAliases", {"site_name": "my.site", "token": "asfd"}).then((result) => {
        expect(JSON.stringify(result)).to.equal("[]");
        done();
      }).catch(err => {
        done(err);
      });
    });
  });

  describe('add-alias', function() {
    it("should add alias", function(done) {
      nock(cliConfs.API_URL)
        .post('/instances/my.site/add-alias')
        .reply(200, {
          "result": "success"
         });

      instanceModule("addAlias", {"site_name": "my.site", "token": "asfd"}).then((result) => {
        expect(result.result).to.equal("success");
        done();
      }).catch(err => {
        done(err);
      });
    });
  });

  describe('del-alias', function() {
    it("should del alias", function(done) {
      nock(cliConfs.API_URL)
        .post('/instances/my.site/del-alias')
        .reply(200, {
          "result": "success"
         });

      instanceModule("delAlias", {"site_name": "my.site", "token": "asfd"}).then((result) => {
        expect(result.result).to.equal("success");
        done();
      }).catch(err => {
        done(err);
      });
    });
  });


});
