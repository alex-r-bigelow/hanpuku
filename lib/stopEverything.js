(function () {
    "use strict";
    var allTimeouts = [],
        allIntervals = [],
        allAnimationFrames = [],
        oldSetTimeout = window.setTimeout,
        oldSetInterval = window.setInterval,
        oldRequestAnimationFrame = window.requestAnimationFrame;
    
    window.setTimeout = function () {
        allTimeouts.push(oldSetTimeout.apply(null, arguments));
        return allTimeouts[allTimeouts.length - 1];
    };
    window.setInterval = function () {
        allIntervals.push(oldSetInterval.apply(null, arguments));
        return allIntervals[allIntervals.length - 1];
    };
    window.requestAnimationFrame = function () {
        allAnimationFrames.push(oldRequestAnimationFrame.apply(null, arguments));
        return allAnimationFrames[allAnimationFrames.length - 1];
    };
    
    window.stopEverything = function () {
        var i;
        console.log(allAnimationFrames, allTimeouts, allIntervals);
        for (i = 0; i < allTimeouts.length; i += 1) {
            window.clearTimeout(allTimeouts[i]);
        }
        allTimeouts = [];
        for (i = 0; i < allIntervals.length; i += 1) {
            window.clearInterval(allIntervals[i]);
        }
        allIntervals = [];
        for (i = 0; i < allAnimationFrames.length; i += 1) {
            window.cancelAnimationFrame(allAnimationFrames[i]);
        }
        allAnimationFrames = [];
    };
}());