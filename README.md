# com.sci.iD3 #

Adding limited support for using d3.js commands directly in Illustrator. Cooler stuff will be layered on later.

### TODO:

#### High priority
- Consistent mark-data bindings
- More modular scripts:
  - Break scatterplot into separate cloning, layout, color, axes? tools
  - Glyph updater (master-slave paradigm...)
- (separate project): Browser SVG+data channel extractor
- Support HBO Example

#### Medium priority
- GUI front-end
- Support gradients, stroke properties (dashes, caps, etc.)
- Support text
- Support multiple artboards

#### Low priority
- It would be cool to support canvas elements / bitmaps

### Odd rules for writing d3 code:
- Any data or class strings on top-level groups will be lost each cycle (I interpret top-level groups as Illustrator layers)
- All transforms are applied each cycle - these tags will NOT remain on DOM elements
- All shapes should be cubic-interpolated paths. You definitely CAN use other primitives, but they will be converted
- You can use .appendClone(id), .appendCircle(), .appendRect(), and .appendPath() - these will convert to cubic-interpolated paths immediately (before cycling)
- Colors are all converted to rgb(r,g,b) format each cycle
- Opacity is general across an entire shape; 