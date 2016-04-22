var cheerio = require('cheerio');
var rimraf = require('rimraf');
var uuid = require('node-uuid');
var build = require('magicbook/src/build');
var fs = require('fs');
var _ = require('lodash');
var path = require('path');

function triggerBuild(config) {
  var uid = uuid.v4().replace('-', "").substring(0, 10);
  _.defaults(config, {
    addPlugins: ["./src/codesplit"],
    files: ["book/content/codesplit.md"],
    destination: "tmp/"+uid+"/:build"
  });
  build(config);
  return uid;
}

beforeAll(function(done) {
  rimraf("tmp/*", function() {
    done();
  });
});

function expectCode($) {

  // we have four code-pair elements
  //expect($.children('.codesplit-pair').length).toBe(4);

  // The first should have the code and the comment
  var first = $.find('.codesplit-pair').first();
  expect(first.find('.codesplit-comment p').html()).toEqual('First we need to set up the variables to be used throughout the sketch.');
  expect(first.find('.codesplit-code pre code').html()).toEqual('var x = 100;\nvar y = 100;\n');

  // the second should have a class and an ID
  var second = $.find('.codesplit-pair').eq(1);
  expect(second.attr('class')).toEqual('codesplit-pair myClass myOtherClass');
  expect(second.attr('id')).toEqual('myId');

  // the third should have just one line of code
  var third = $.find('.codesplit-pair').eq(2);
  expect(third.find('.codesplit-comment p').html()).toEqual('This is a createCanvas function');
  expect(third.find('.codesplit-code pre code').html().trim()).toEqual('createCanvas(640, 360);');

  // The last should have just the final code
  var last = $.find('.codesplit-pair').last();
  expect(last.find('.codesplit-comment').length).toBe(0)
  expect(last.find('.codesplit-code pre code').html().trim()).toEqual('background(255);\n}')
}

describe("Codesplit plugin", function() {

  it("should split code and comments", function(done) {
    var uid = triggerBuild({
      builds: [{ format: "html" }],
      liquid : {
        includes: "book/examples"
      },
      codesplit: {
        includes: "book/examples"
      },
      finish: function() {
        var content = fs.readFileSync(path.join('tmp', uid, 'build1/codesplit.html')).toString();
        var $ = cheerio.load(content);
        expect($('.codesplit').length).toBe(2);
        expectCode($('.codesplit-content').eq(0));
        expectCode($('.codesplit-content').eq(1));
        done();
      }
    });
  });

});
