const expect = require('expect.js');
const deployModule = require("../modules/deploy.js");
const nock = require("nock");
const cliConfs = require("../modules/cliConfs");
const proc = require('child_process');
const envModule = require("../modules/env");
const fs = require("fs");

function findFiles(files, fPath) {
  return files.filter(f => f.path == fPath);
}

describe('Deploy', function() {
  describe('find local files', function() {
    it("basic repo", function() {
      let files = deployModule.localFilesListing("./test/localRepos/basic");
      expect(files[0].path).to.equal("./test/localRepos/basic/test.js");
      expect(files[0].type).to.equal("F");
    });

    it("repo with folders", function() {
      let files = deployModule.localFilesListing("./test/localRepos/withFolders");

      expect(findFiles(files, "./test/localRepos/withFolders/test1.js")[0].path)
        .to.equal("./test/localRepos/withFolders/test1.js");
      expect(findFiles(files, "./test/localRepos/withFolders/test1.js")[0].type)
        .to.equal("F");

      expect(findFiles(files, "./test/localRepos/withFolders/f1")[0].path)
        .to.equal("./test/localRepos/withFolders/f1");
      expect(findFiles(files, "./test/localRepos/withFolders/f1")[0].type)
        .to.equal("D");

      expect(findFiles(files, "./test/localRepos/withFolders/f2")[0].path)
        .to.equal("./test/localRepos/withFolders/f2");
      expect(findFiles(files, "./test/localRepos/withFolders/f2")[0].type)
        .to.equal("D");

      expect(findFiles(files, "./test/localRepos/withFolders/f1/test2.js")[0].path)
        .to.equal("./test/localRepos/withFolders/f1/test2.js");
      expect(findFiles(files, "./test/localRepos/withFolders/f1/test2.js")[0].type)
        .to.equal("F");

      expect(findFiles(files, "./test/localRepos/withFolders/f2/test3.js")[0].path)
        .to.equal("./test/localRepos/withFolders/f2/test3.js");
      expect(findFiles(files, "./test/localRepos/withFolders/f2/test3.js")[0].type)
        .to.equal("F");
    });

    it("repo with ignored files", function() {
      let files = deployModule.localFilesListing("./test/localRepos/withIgnoredFiles",
        envModule.extractFiles2Ignore(), true);

      console.log("filesss -> ");
      console.log(files);

      expect(files.length).to.equal(1);

      expect(findFiles(files, "./test/localRepos/withIgnoredFiles/test.js")[0].path)
        .to.equal("./test/localRepos/withIgnoredFiles/test.js");
      expect(findFiles(files, "./test/localRepos/withIgnoredFiles/test.js")[0].type)
        .to.equal("F");
    });
  });

  describe('send files', function() {
    it("single file", function(done) {
      let files = [];

      nock(cliConfs.API_URL)
        .post('/instances/mysite/sendCompressedFile')
        .reply(200, {
         });

      deployModule.sendFiles(files, {"token": "12354asdfasdfasdf", "site_name": "mysite"}).then((result) => {
        done();
      }).catch(err => {
        done(err);
      });
    });

    afterEach(function() {
      try {
        fs.unlinkSync("./12354asdfasdfasdf.zip", function(err) {
          if (err) {
            console.error("issue deleting test zip");
          }
        })
      } catch(err) {
        console.log(err)
      }
    });
  });
});
