(function () {
    var DPI,
        e = document.body.appendChild(document.createElement('DIV'));
    e.style.width= '1in';
    e.style.padding = '0';
    DPI = e.offsetWidth;
    e.parentNode.removeChild(e);
    
    // TODO: support more units
    var LENGTH = 'px',
        ANGLE = 'deg';
    var UNIT_TYPES = {
        'px' : LENGTH,
        'pt' : LENGTH,
        'in' : LENGTH,
        'cm' : LENGTH,
        'mm' : LENGTH,
        'pc' : LENGTH,
        'em' : LENGTH,
        '%' : LENGTH,
        'deg' : ANGLE,
        'rad' : ANGLE
    };
    var TO_PX = {
        'px' : 1,
        'pt' : DPI/72,
        'in' : DPI,
        'cm' : DPI/2.54,
        'mm' : DPI/25.4,
        'pc' : DPI/6
    };
    console.log(DPI);
    var TO_DEG = {
        'deg' : 1,
        'rad' : 180/Math.PI
    };
    function convertUnits(element, value, targetUnit, parentPercentAttribute) {
        var sourceUnit = value.match(/\D+$/),
            eStyle,
            pStyle;
        
        if (sourceUnit !== null) {
            sourceUnit = sourceUnit[0].toLowerCase();
        } else {
            sourceUnit = UNIT_TYPES[targetUnit];    // get the default unit of the same type
        }
        if (sourceUnit === targetUnit) {
            return value;
        }
        
        value = parseFloat(value);
        
        // Check for bad inputs
        if (UNIT_TYPES.hasOwnProperty(sourceUnit) === false ||
            UNIT_TYPES.hasOwnProperty(targetUnit) === false ||
            UNIT_TYPES[sourceUnit] !== UNIT_TYPES[targetUnit] ||
            isNaN(value)) {
            throw new Error('Can\'t convert between ' + sourceUnit + ' and ' + targetUnit);
        }
        
        // Only get the element's computed style or parent's computed style if we need to
        if (sourceUnit === 'em' || targetUnit === 'em') {
            eStyle = window.getComputedStyle(element);
        }
        if (sourceUnit === '%' || targetUnit === '%') {
            pStyle = window.getComputedStyle(element.parentNode);
            if (pStyle.hasOwnProperty(parentPercentAttribute) === false) {
                throw new Error('Don\'t know which attribute % is relative to (the element\'s parent does not have attribute ' +
                                parentPercentAttribute + ')');
            }
        }
        
        // Do the conversion
        if (UNIT_TYPES[sourceUnit] === LENGTH) {
            var px;
            // convert to pixels
            if (sourceUnit === '%') {
                px = parseFloat(pStyle[parentPercentAttribute])*value;
            } else if (sourceUnit === 'em') {
                px = parseFloat(eStyle.fontSize)*value;
            } else {
                px = TO_PX[sourceUnit]*value;
            }
            // convert from pixels
            if (targetUnit === '%') {
                return px/parseFloat(pStyle[parentPercentAttribute]) + targetUnit;
            } else if (targetUnit === 'em') {
                return px/parseFloat(eStyle.fontSize) + targetUnit;
            } else {
                return px/TO_PX[targetUnit] + targetUnit;
            }
        } else {    //if (UNIT_TYPES[sourceUnit] === ANGLE) {
            return TO_DEG[sourceUnit]*value/TO_DEG[targetUnit] + targetUnit;
        }
    }
    window.convertUnits = convertUnits;
})();