var _ = require('lodash');
var path = require('path');
var fs = require('fs');
var cheerio = require('cheerio');
var tinyliquid = require('tinyliquid');
var through = require('through2');

var Plugin = function(registry) {
  this.cache = {};
  registry.before('load', 'codesplit:liquid', _.bind(this.parseLiquid, this));
  registry.after('markdown:convert', 'codesplit:inline', _.bind(this.parseInline, this));
};

Plugin.prototype = {

  parseExample: function(code, attrs) {

    attrs = attrs || {};

    var klass = "codesplit";
    if(attrs.class) {
      klass += ' ' + attrs.class;
    }
    var div = cheerio.load('<div class="'+klass+'"><div class="pairs"></div></div>');
    var box = div('.pairs');
    var split = code.split('\n');
    var opt = {} // no op for now

    // If we want to pick out just a few lines, let's do that.
    if(attrs.lines) {

      var newSplit = [];

      // convert the numbers into single numbers or array of ranges
      var nums = _.each(attrs.lines.split(','), function(num) {
        num = num.trim();

        // if is range
        if(num.match(/\-/)) {
          var range = num.split('-');
          var start = parseInt(range[0]);
          var stop = parseInt(range[1]);
          for(var i = start-1; i < stop; i++) {
            newSplit.push(split[i]);
          }
        }
        // if number
        else {
          newSplit.push(split[parseInt(num)-1]);
        }
      });

      split = newSplit;
    }

    // When picking values, we often pick lines that are indented. For those
    // lines not to have extra space on the left, let's remove the amount of
    // whitespace from all lines based on the whitespace from the first line.
    var padnum = split[0].search(/\S|$/);
    var regex = new RegExp("^\\s{"+padnum+"}");
    if(padnum > 0) {
      split = _.map(split, function(line) {
        return line.replace(regex, '');
      });
    }

    // if the first line was a linebreak, let's get rid of it.
    // allows people to not have <pre> and code on same line.
    if(split[0] == '') split.shift();

    // Loop through every line and create pair objects with
    // .code and .comment arrays holding the lines.
    var pairs = [];
    var lastType;
    for(var i = 0; i < split.length; i++) {

      // what type of line is this?
      var type = split[i].match(/^\s*\/\//) ? "comment" : "code";
      var pair = pairs[pairs.length-1];

      // should we create a new pair?
      if(!pair || (lastType == "code" && type == "comment") || (pair.maxLines && pair.code.length >= pair.maxLines)) {
        pair = { code:[], comment:[], klass:[] };
        pairs.push(pair);
      }

      // Parse attributes if comment
      if(type == "comment") {
        var regex = /\{(.+)\}/;
        var match = regex.exec(split[i]);
        if(match) {
          var vals = match[1].trim().split(' ');
          _.each(vals, function(val) {
            if(val.charAt(0) === '#') pair.id = val.substring(1);
            if(val.charAt(0) === '.') pair.klass.push(val.substring(1));
            if(val.charAt(0) === '!') pair.maxLines = parseInt(val.substring(1));
          });
          split[i] = split[i].replace(regex, '');
        }
      }

      lastType = type;

      pair[type].push(split[i]);
    }

    // Find pairs where code has an empty line. If that pair has a comment
    // and the next pair has a comment, make that line a separate pair,
    // so we get a nice spacing.
    for(var i = pairs.length-2; i >= 0; i--) {
      var cur = pairs[i];
      var nex = pairs[i+1];
      if(cur.comment.length > 0 && nex.comment.length > 0 && cur.code[cur.code.length-1] == '') {
        cur.code.pop();
        pairs.splice(i+1, 0, { code:[''], comment:[], klass:[] })
      }
    }

    // Loop through every pair
    for(var i = 0; i < pairs.length; i++) {

      var pair = pairs[i];

      // Create a new pair element
      box.append('<div class="pair"></div>');
      var jpair = box.find('.pair').last();

      // Add attributes from object
      if(pair.id)                  jpair.attr('id', pair.id);
      if(pair.klass.length > 0)    jpair.addClass(pair.klass.join(' '));
      if(pair.comment.length == 0) jpair.addClass('no-comment');

      // Create comments
      if(pair.comment.length > 0) {
        var para = _.map(pair.comment, function(line) {
          return line.replace('//', '').trim();
        }).join(' ');
        jpair.append('<div class="comment"><p>'+para+'</p></div>');
      }

      // Create code
      var codes = pair.code.join('\n') + '\n';
      // It's important that pre starts on new line, as the markdown spec treats it
      // differently.
      jpair.append('<div class="code">\n\n<pre><code>' + codes + '</code></pre></div>');

    }
    return div.html();
  },

  getExample: function(examplePath, attrs) {

    // only load if not in cache
    if(!this.cache[examplePath]) {
      this.cache[examplePath] = fs.readFileSync(examplePath).toString();
    }

    // parse example
    return this.parseExample(this.cache[examplePath], attrs);
  },

  // Plugin functions
  // ---------------------------------------------

  parseLiquid: function(config, extras, callback) {
    var that = this;
    _.set(config, 'liquid.customTags.codesplit', function(context, tag, input) {

      if(!_.get(config, 'codesplit.includes')) {
        return console.log('WARNING: No codesplit include folder set')
      }

      // Get name of example file to load
      var example = input.split(' ')[0];
      var examplePath = path.join(config.codesplit.includes, example);

      // Get the attributes if any
      var attrs = {};
      var pattern = new RegExp('([a-zA-Z]+)\:[\"\']([^\"\']+)[\"\']', 'g');
      var match = null;
      while (match = pattern.exec(input)) { attrs[match[1]] = match[2]; }

      var ast = tinyliquid.parse(that.getExample(examplePath, attrs))
      context.astStack.push(ast);
    });
    callback(null, config, extras);
  },

  parseInline: function(config, stream, extras, callback) {

    var that = this;

    // loop through all files and find codesplit classes
    // that haven't yet been parsed.
    stream = stream.pipe(through.obj(function(file, enc, cb) {

      var changed = false;
      file.$el = file.$el || cheerio.load(file.contents.toString());

      file.$el('.codesplit').each(function() {
        var jel = file.$el(this);
        if(jel.find('.pairs').length == 0) {
          changed = true;
          var attrs = {};
          var lines = jel.attr('data-lines');
          if(lines) {
            attrs.lines = lines;
          }
          jel.replaceWith(that.parseExample(jel.html(), attrs));
        }
      });

      if(changed) file.contents = new Buffer(file.$el.html());

      cb(null, file);
    }));

    callback(null, config, stream, extras);
  }

}

module.exports = Plugin;
