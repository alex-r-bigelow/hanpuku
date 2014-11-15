# iD3 #

iD3 is an interface between d3.js and Adobe Illustrator, enabling a more flexible
data visualization workflow. Data bindings no longer disappear when you edit a d3-generated
graphic in Illustrator; those bindings now survive custom edits, and even
get saved inside native .ai files.

On the flip side, your custom Illustrator edits
will also survive properly-written d3.js scripts: now, when your data changes after
you've done lots of hand-crafted awesomeness, you don't have to start over from scratch!

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
- Fix Isolation Mode bug
- Support text
- More iD3-specific Examples
- Import directly from Examples tab

#### Medium priority
- Regex search/replace in text editors (esp. data)
- Replace textareas with ace editors
- Embed the Chrome debugging window as a view
- Export as/to web page tool
- Embed data, js, css files inside the .ai file (preserve layer-level properties while I'm at it)
- Load multiple js, css files, distinguish between js libraries and scripts (run the former immediately)
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