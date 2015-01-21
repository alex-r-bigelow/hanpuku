
### Panels (existing and planned):
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
- Circular data in the Data preview...? This probably needs a redesign, especially if we
  want to deal with embedding data files inside documents later...
- Fix Selection overlay bug
- Inconsistent z-index sorting bug
- Support arc, disjoint, and shortcut paths (also fix Q / T inaccuracies)
- Regex search/replace in text editors (esp. data)
- Better text support (lots of bugs! I think a Chrome bug prevents using the x coordinate on text elements that have tspan in them...)
- More examples

#### Medium priority
- Replace textareas with ace editors
- Embed the Chrome debugging window as a view
- Export as/to web page tool
- Embed data, js, css files inside the .ai file (preserve layer-level properties while I'm at it)
- Load multiple js, css files, distinguish between js libraries and scripts (run the former immediately)
- Support SVG Polygon, Polyline
- Support Gradients, CMYK color, stroke properties (dashes, cap, etc.), Masks

#### Low priority (probably next paper)
- Fix bug associated with single paths too long for Illustrator
- Bindings tab
- Selection query tools
- Dom preview selection functionality
- Influence tab
- Add some kind of placeholder for unsupported items like blends or graphs?
- Support binding to path points (you can get around this by being creative
  with your data abstraction!)
- Walk through HBO Example

#### Very low priority
- Support converting HTML outside the SVG?
- Investigate what it would take to make an Inkscape clone
- It would be cool to convert between canvas elements / bitmaps...
- Test on Windows
- Tangelo integration / streaming support