# com.sci.iD3 #

Adding limited support for using d3.js commands directly in Illustrator. Cooler stuff will be layered on later.

### TODO:
- It would be cool to support canvas elements / bitmaps
- Support gradients, stroke properties (dashes, caps, etc.)
- More demos!
- Need to support more artboards...
- Need to support transforms (only from SVG to Illustrator - positions are native, at least at the group level)

### Odd rules for writing d3 code:
- Any data or class strings on top-level groups will be lost each cycle (I interpret top-level groups as Illustrator layers)
- All transforms are applied each cycle - these tags will NOT remain on DOM elements
- All shapes should be cubic-interpolated paths. You definitely CAN use other primitives, but they will be converted
- You can use .appendClone(id), .appendCircle(), .appendRect(), and .appendPath() - these will convert to cubic-interpolated paths immediately (before cycling)
- Colors are all converted to rgb(r,g,b) format each cycle
- Opacity is general across an entire shape; 