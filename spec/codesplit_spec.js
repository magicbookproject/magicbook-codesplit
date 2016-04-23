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

  // it("should split code and comments", function(done) {
  //   var uid = triggerBuild({
  //     builds: [{ format: "html" }],
  //     files: ["book/content/codesplit.md"],
  //     liquid : {
  //       includes: "book/examples"
  //     },
  //     codesplit: {
  //       includes: "book/examples"
  //     },
  //     finish: function() {
  //       var content = fs.readFileSync(path.join('tmp', uid, 'build1/codesplit.html')).toString();
  //       var $ = cheerio.load(content);
  //       expectCode($('.codesplit-content').eq(0));
  //       expectCode($('.codesplit-content').eq(1));
  //       done();
  //     }
  //   });
  // });

  it("should work on more advanced example", function(done) {
    var uid = triggerBuild({
      builds: [{ format: "html" }],
      files: ["book/content/advanced.md"],
      liquid : {
        includes: "book/examples"
      },
      codesplit: {
        includes: "book/examples"
      },
      finish: function() {
        var content = fs.readFileSync(path.join('tmp', uid, 'build1/advanced.html')).toString();
        var $ = cheerio.load(content);
        expect($('.codesplit-pair').eq(0).find('.codesplit-comment p').text()).toEqual('Variables for location and speed of ball.');
        expect($('.codesplit-pair').eq(0).find('.codesplit-code pre code').html()).toEqual('float x = 100;\nfloat y = 100;\nfloat xspeed = 1;\nfloat yspeed = 3.3;\n');
        expect($('.codesplit-pair').eq(1).find('.codesplit-comment p').text()).toEqual('Remember how Processing works?  setup() is executed once when the sketch starts and draw() loops forever and ever (until you quit).');
        expect($('.codesplit-pair').eq(1).find('.codesplit-code pre code').html()).toEqual('void setup() {\n  size(640,360);\n  background(255);\n}');
        expect($('.codesplit-pair').eq(2).find('.codesplit-comment').length).toBe(0);
        expect($('.codesplit-pair').eq(2).hasClass('codesplit-nocomment')).toBe(true);
        expect($('.codesplit-pair').eq(2).find('.codesplit-code pre code').html()).toEqual('\nvoid draw() {\n  background(255);\n');
        done();
      }
    });
  });

});
