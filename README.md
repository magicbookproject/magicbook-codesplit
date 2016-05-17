# Magicbook Codesplit

This is a plugin that allows you to write example code in `.js` files, and include them in your book. It will parse your JavaScript files into sections with code and comments, so you can lay out your example in a nice, intuitive way.

## Using the plugin

First install the NPM package, either in your `package.json` file in your book repo, or by running the following.

```
npm i magicbook-codesplit
```

Then add the plugin to your config file.

```json
{
  "addPlugins" : ["magicbook-codesplit"]
}
```

### Inline

Simply add the `.codesplit` class to any `<pre>` tag with code you want to split.

```html
<pre class="codesplit">// This is an example
var myName = "Rune Madsen";
</pre>
```

### Files

Codesplit can load a file (like a liquid include) and split it. First create this file in `examples/example.js`.

```js
// This is an example
var myName = "Rune Madsen";
```

Then add the following to your config file.

```json
{
  "codesplit" : {
    "includes" : "examples"
  }
}
```

Then in your content, use the `codesplit` tag.

```md
Now I want to show you an example.

{% codesplit example.js %}
```

For both of those examples, codesplit will output the following structure for you.

```html
<p>Now I want to show you an example</p>

<div class="codesplit">
  <div class="pairs">
    <div class="codesplit-pair">
      <div class="codesplit-comment">
        <p>This is an example</p>
      </div>
      <div class="codesplit-code">
        <pre><code>var myName = "Rune Madsen";</code></pre>
      </div>
    </div>
  </div>
</div>
```

You have to write your own CSS to style these DIV's. The markup allows you to show the layout in a horizontal and vertical way.

## Attributes

Inspired by Markdown Extra, you can use a special syntax to apply classes and other instructions to a code pair.

### Classes

To add a class to a codepair, use the following syntax.

```js
// This is my comment {.myClass}
var myName = "Rune Madsen"
```

This will add the `.myClass` class to the `.code-pair` output:

```html
<div class="codesplit-pair myClass">
  ...
</div>
```

This is helpful if you want to highlight a specific piece of code, etc.

### Ids

To add an id to a codepair, use the following syntax.

```js
// This is my comment {#myId}
var myName = "Rune Madsen"
```

This will add the `#MyId` id to the `.code-pair` output:

```html
<div class="codesplit-pair" id="myId">
  ...
</div>
```

### Max lines

By default, a new code pair will be created when the parser encounters a comment. However, you can control this grouping. Here's an example that makes one code pair holding the comment and the first line of code. The second line of code will be in a code pair by itself.

```js
// This is my name {!1}
var myName = "Rune Madsen"
var notMyName = "James Brown"
```

Using a `!` followed by a number simply allows you to specify how many lines of code should be grouped in the code pair.

You can of course mix all these attributes in a single comment.

```js
// This is my comment {!2 .myClass #myId .myOtherClass}
```

We found that we were using this attribute a lot to not include blank lines between pairs. So if the codesplitter encounters to pairs that both have comments, and the first ends with a blank line, it will automatically put that empty line in a pair by itself.

So this example...

```js
// This is my name
var myName = "Rune Madsen"

// This is not my name
var notMyName = "James Brown"
```

Will have this output automatically...

```html
<div class="codesplit">
  <div class="pairs">
    <div class="pair">
      <div class="comment"><p>This is my name</p></div>
      <div class="code"><pre><code>var myName = "Rune Madsen"
</code></pre></div>
    </div>
    <div class="pair no-comment">
      <div class="code"><pre><code>
</code></pre></div>
    </div>
    <div class="pair">
      <div class="comment"><p>This is not my name</p></div>
      <div class="code"><pre><code>var notMyName = "James Brown"
</code></pre></div>
    </div>
  </div>
</div>
```

## Pick specific line from example

Sometimes you want to have a full example to e.g. run in the browser, but just show a few lines of code from the example. You can use the `lines` setting for this. This example shows only line 2,3,6,7,8 from the `example.js` file.

```html
<pre class="codesplit" data-lines="2,3,6-8">
...
</pre>
```

You can use the same setting in the liquid tag.

```html
{% codesplit example.js lines:'2,3,6-8' %}
```

## Class

You can add a classname to the codesplit div via liquid like this:

```html
{% codesplit example.js class:'myclass' %}
```
