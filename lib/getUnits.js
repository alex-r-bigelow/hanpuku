// This code stolen from momo@http://stackoverflow.com/questions/4515406/convert-css-units

   (function(){

    // pass to string.replace for camel to hyphen
    var hyphenate = function(a, b, c){
        return b + "-" + c.toLowerCase();
    };

    // get computed style property
    var getStyle = function(target, prop){
        if(prop in target.style){  // if it's explicitly assigned, just grab that
            if(!!(target.style[prop]) || target.style[prop] === 0){
                return target.style[prop];
            }
        }
        if(window.getComputedStyle){ // gecko and webkit
            prop = prop.replace(/([a-z])([A-Z])/, hyphenate);  // requires hyphenated, not camel
            return window.getComputedStyle(target).getPropertyValue(prop);
        }
        if(target.currentStyle){ // ie
            return target.currentStyle[prop];
        }
        return null;
    };

    // get object with units
    var getUnits = function(target, prop, returnUnit, unitlessDefault){
        var baseline = 100;  // any number serves 
        var item;  // generic iterator

        var map = {  // list of all units and their identifying string
            pixel : "px",
            percent : "%",
            inch : "in",
            cm : "cm",
            mm : "mm",
            point : "pt",
            pica : "pc",
            em : "em",
            ex : "ex"
        };
        
        unitlessDefault = unitlessDefault === undefined ? 'px' : unitlessDefault;   // assume px

        var factors = {};  // holds ratios
        var units = {};  // holds calculated values

        var value = getStyle(target, prop);  // get the computed style value
        
        if (value === null) {
            return null;
        }
        
        var numeric = value.match(/\d+/);  // get the numeric component
        if(numeric === null) {  // if match returns null, throw error...  use === so 0 values are accepted
            throw "Invalid property value returned";
        }
        numeric = numeric[0];  // get the string

        var unit = value.match(/\D+$/);  // get the existing unit
        unit = (unit === null) ? unitlessDefault : unit[0]; // if its not set, assume - otherwise grab string

        var activeMap;  // a reference to the map key for the existing unit
        for(item in map){
            if(map[item] == unit){
                activeMap = item;
                break;
            }
        }
        if(!activeMap) { // if existing unit isn't in the map, throw an error
            throw "Unit not found in map";
        }

        var singleUnit = false;  // return object (all units) or string (one unit)?
        if(returnUnit && (typeof returnUnit === "string")) {  // if user wants only one unit returned, delete other maps
            for(item in map){
                if (map.hasOwnProperty(item)) {
                    if(map[item] === returnUnit){
                        singleUnit = item;
                        continue;
                    }
                    delete map[item];
                }
            }
        }

        var temp = document.createElement("div");  // create temporary element
        temp.style.overflow = "hidden";  // in case baseline is set too low
        temp.style.visibility = "hidden";  // no need to show it

        target.parentNode.appendChild(temp);    // insert it into the parent for em and ex  

        for(item in map){  // set the style for each unit, then calculate it's relative value against the baseline
            if (map.hasOwnProperty(item)) {
                temp.style.width = baseline + map[item];
                factors[item] = baseline / temp.offsetWidth;
            }
        }

        for(item in map){  // use the ratios figured in the above loop to determine converted values
            if (map.hasOwnProperty(item)) {
                units[item] = (numeric * (factors[item] * factors[activeMap])) + map[item];
            }
        }

        target.parentNode.removeChild(temp);  // clean up

        if(singleUnit !== false){  // if they just want one unit back
            return units[singleUnit];
        }

        return units;  // returns the object with converted unit values...

    };

    // expose           
    window.getUnits = this.getUnits = getUnits;

})();