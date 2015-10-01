# hanpuku #

Hanpuku is an interface between d3.js and Adobe Illustrator, enabling a more flexible
data visualization workflow. Data bindings no longer disappear when you edit a d3-generated
graphic in Illustrator; those bindings now survive custom edits, and even
get saved inside native .ai files.

On the flip side, your custom Illustrator edits
will also survive properly-written d3.js scripts: now, when your data changes after
you've done lots of hand-crafted awesomeness, you don't have to start over from scratch!

Another cool addition is that Illustrator and d3.js selections are merged; you can now
set attributes for stuff you have selected in Illustrator like a normal d3.js selection. You can
even filter the current Illustrator selection based on data, or perform complex selections right from
the code!

Download the latest bundled extension [here](http://www.cs.utah.edu/~abigelow/#hanpuku).

See it in action:
-----------------

<video width="320" height="240" controls>
<source src="http://www.cs.utah.edu/~abigelow/Downloads/hanpuku/hanpuku.mp4" type="video/mp4">
<source src="http://www.cs.utah.edu/~abigelow/Downloads/hanpuku/hanpuku.ogg" type="video/ogg">
Your browser does not support the video tag.
</video>

More videos:
------------

[Tweaking the geometry of a node](http://youtu.be/xuBMgR6ElR4)

[Importing an example from bl.ocks.org](http://youtu.be/41P-h6e8OcI)


Work in progress:
-----------------
#### Known bugs
- Text rotation / scale bugs
- Links to Swatch colors are lost (need to do a true diff model...?)
- Arc approximation irregularities
- Duplicate path endpoints
- Need to turn off perspective grid temporarily (if it's on) in domToDoc

#### High priority
- Better font support
- Bitmap support
- Gradient support
- Mask support
- Symbol support
- Stroke properties (dashes, caps, etc.)

#### Medium priority
- Replace textareas with ace editors
- Regex search/replace in text editors (esp. data)
- Circular data in the Data preview (visualize cycles)
- More examples
- Proper CMYK color
- Export as/to web page
- Add some kind of placeholder in each environment for unsupported items like blends/graphs, or videos/form elements?

#### Low priority
- Implement non-programmer UX
- Embed the Chrome debugging window as a view
- Embed data, js, css files inside the .ai file (preserve layer-level properties while I'm at it)
- Load multiple js, css files, distinguish between js libraries and scripts (run the former immediately)

#### Very low priority
- Investigate what it would take to make an Inkscape clone / make Hanpuku an independent application
- Test on Windows
- Tangelo integration / streaming data support