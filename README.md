# com.sci.iD3 #

Adding limited support for using d3.js commands directly in Illustrator. Cooler stuff will be layered on later.

### TODO:
- It would be cool to support canvas elements / bitmaps
- Support gradients, stroke properties (dashes, caps, etc.)
- More demos!
- Need to support more artboards...
- Need to support transforms (only from SVG to Illustrator - positions are native, at least at the group level)

### Odd rules for writing d3 code:
- Don't put any data on top-level groups (I interpret top-level groups as layers)
- All transforms are applied immediately - these tags will NOT remain on DOM elements
- All shapes should be cubic-interpolated paths. You definitely CAN use other primitives, but they will be converted
- You can use .appendClone(id)