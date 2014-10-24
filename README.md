# com.sci.iD3 #

Adding limited support for using d3.js commands directly in Illustrator. Cooler stuff will be layered on later.

### TODO:

#### High 
- Quick Sample Library tab
- Selection query tools
- Bindings tab/visualization (reuse part for Data tab preview)
- Influence tab
  - Position
  - Scale
  - Rotation
  - Color
    - Requires support for gradients
- Walk through HBO Example
  - Requires support for binding data to path points

#### Medium priority
- (separate project): Browser SVG+data channel extractor
- (separate project): Tools for quickly embedding back into a web page
- Support stroke properties (dashes, caps, etc.)
- Support text
- Support multiple artboards
- Ace editors for data, js, css
- Support embedding data (remember to add a special orphans.json file), js, css
- External specimen library...

#### Low priority
- It would be cool to convert between canvas elements / bitmaps... if so, maybe we could support processing.js code?
- Clean up the JS namespace, find some way to isolate scripts' reach to #dom svg
- Documentation

#### Very low priority
- Investigate what it would take to make an Inkscape clone

### Oddities for writing d3 code:
- An svg object matching the current Illustrator document will always exist, with its id matching the document name. Its
  immediate children are rect objects, representing each artboard, and group objects, representing each layer. Every element's
  id will be the same as the object's name in Illustrator's Layers widget (iD3 may modify these names to ensure that all ids are unique
  and compatible with HTML).
- Any data or class strings on top-level groups will be lost each cycle (I interpret top-level groups as Illustrator layers)
- All shapes should be cubic-interpolated paths. You definitely CAN use other primitives, but they will be converted each cycle.
- You can use .appendClone(id), .appendCircle(), .appendRect(), and .appendPath() - these will convert to cubic-interpolated paths immediately (before cycling)
- Colors are all converted to rgb(r,g,b) format each cycle
- Opacity is general across an entire shape; if you apply different opacities to stroke and fill, (TODO: what do I do with this?)
- Special global variables that you can:
  - access:
    - dataFiles - list of currently loaded files
    - dataFileLookup - dictionary for looking up the index of a file in dataFiles by the file name
  - manipulate:
    - selectedIDs - list of object names / DOM ids that are currently selected in the document (feel free to manipulate this)