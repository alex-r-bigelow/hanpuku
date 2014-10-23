# com.sci.iD3 #

Adding limited support for using d3.js commands directly in Illustrator. Cooler stuff will be layered on later.

### TODO:

#### High priority
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
- Clean up the JS namespace, find some way to isolate scripts' reach to #dom svg
- Improve documentation

### Odd rules for writing d3 code:
- An svg object matching the current Illustrator document will always exist, with its id matching the document name. Its
  immediate children are rect objects, representing each artboard, and group objects, representing each layer. Every element's
  id will be the same as the object's name in Illustrator (these names may be modified to ensure that all ids are unique
  and compatible with HTML).
- Any data or class strings on top-level groups will be lost each cycle (I interpret top-level groups as Illustrator layers)
- All shapes should be cubic-interpolated paths. You definitely CAN use other primitives, but they will be converted each cycle.
- You can use .appendClone(id), .appendCircle(), .appendRect(), and .appendPath() - these will convert to cubic-interpolated paths immediately (before cycling)
- Colors are all converted to rgb(r,g,b) format each cycle
- Opacity is general across an entire shape; if you apply different opacities to stroke and fill, (TODO: what do I do with this?)