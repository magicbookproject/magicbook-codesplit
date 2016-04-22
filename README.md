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

### Splitting inline

Simply add the `.codesplit` class to any `<pre>` tag with code you want to split.

```html
<pre class="codesplit">// This is an example
var myName = "Rune Madsen";
</pre>
```

### Splitting includes

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
  <div class="codesplit-content">
    <div class="codesplit-comment">
      <p>This is an example</p>
    </div>
    <div class="codesplit-code">
      <pre><code>var myName = "Rune Madsen";</code></pre>
    </div>
  </div>
</div>
```

You have to write your own CSS to style these DIV's. The markup allows you to show the layout in a horizontal and vertical way.
