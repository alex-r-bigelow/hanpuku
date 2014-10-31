# com.sci.iD3 #

Adding support for using d3.js code directly in Illustrator, with some nuances.

### Panels:
- Data
 - Tasks
  - Load, edit data
 - Views
  - Raw data editor + data list preview
- Connections
 - Tasks
  - Connect / disconnect data and graphic items
  - Connect / disconnect graphic items and data
  - Inspect which datum-graphic item connections exist
  - Duplicate existing graphic items based on the data
  - Modify the current selection based on connected data
 - Views
  - Selection list + dom preview (linked highlighting)
  - Selection list + data list preview (drawn links, linked highlighting)
  - Linked highlighting (Selection list + Dom preview), Drawn link (Selection list + data list preview) Overlay
  - Selection Query tools
- Influence
 - Tasks
  - Perform basic manipulations of graphic items' attributes with respect to their connected data
 - Views
  - Position, Scale, Rotation, Color, Shape influence tools + dom preview
- JS, CSS, Sample menu
 - Tasks
  - Reuse existing D3 visualization techniques / code ("Import")
  - Connect / disconnect data and graphic items in a more automated way
  - Perform advanced manipulations of graphic items' attributes (e.g. techniques that require interactivity, like a force-directed layout)
  - Reuse advanced connections / manipulations on the web ("Export")
 - Views
  - JS code editor + dom preview (+ Chrome debugging widget?)
  - CSS code editor + dom preview
  - Sample library (+ documentation?)

### TODO:

#### High priority
- Refactor to make views more modular
- Support connections to path points
- Implement all views listed above. Current status of each view:
 - Implemented views:
  - Raw data editor (could enhance w/Ace)
  - Data list preview
  - Selection list (about 90% finished)
  - Dom preview (need to add selection functionality?)
  - JS code editor (could enhance w/Ace)
  - CSS code editor (could enhance w/Ace)
  - Sample library menu (maybe should be its own tab w/Documentation?)
 - Views I need to implement:
  - Selection query tools
  - All influence tools
- Walk through HBO Example
- Bundle for user testing (start a release cycle?)

#### Medium priority
- (external project): Browser SVG+data channel extractor
- (external project): Tools for quickly embedding back into a web page
- Support text
- Embed data, js, css in .ai file
- Clean up the JS namespace, find some way to isolate scripts' reach to #dom svg
- Somehow embed the Chrome debugging window as a view inside the widget (iframe? users will need to enable remote debugging...)
- More samples, documentation

#### Low priority
- Replace textareas with ace editors
- Support stroke properties (dashes, cap, etc.)
- Support multiple artboards

#### Very low priority
- Investigate what it would take to make an Inkscape clone
- It would be cool to convert between canvas elements / bitmaps...
 - If so, maybe we could support processing.js code as well?
 - Or maybe that should be its own extension (maybe compatible with Photoshop instead)?
- Windows support

### Notes for when I write the code documentation (oddities for d3 code that are introduced by cycling in and out of an Illustrator document)
- An svg object matching the current Illustrator document will always exist in the DOM, with its id matching the document name. Its
  immediate children are rect objects, representing each artboard, and group objects, representing each layer. Every element's
  id will be the same as the object's name in Illustrator's Layers widget (iD3 may modify these names to ensure that all ids are unique
  and compatible with HTML).
- Any data or class strings on top-level groups will be lost each cycle (I interpret top-level groups as Illustrator layers)
- All shapes should be cubic-interpolated paths. You definitely CAN use other primitives, but they will be converted each cycle.
- You can use .appendCircle(), .appendRect(), and .appendPath()
 - these will convert to cubic-interpolated paths immediately (before cycling)
- I've also added .appendClone(), .setGlobalPosition(), and .setGlobalBBox(), to add some Illustrator-like functionality to d3.
 - these do NOT immediately convert everything to cubic-interpolated paths
- Colors are all converted to rgb(r,g,b) format each cycle
- Opacity is general across an entire shape; if you apply different opacities to stroke and fill, (TODO: what do I do with this?)
- Special global variables that you can manipulate:
 - selectedIDs - list of object names / DOM ids that are currently selected in the document (feel free to manipulate this; the dom is updated
   when running the script, and the actual document is updated when apply is clicked)