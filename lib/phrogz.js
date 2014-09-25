// Stolen from http://phrogz.net/fewer-lambdas-in-d3-js

// Create a function that returns a particular property of its parameter.
// If that property is a function, invoke it (and pass optional params).
function phrogz(name){ 
  var v,params=Array.prototype.slice.call(arguments,1);
  return function(o){
    return (typeof (v=o[name])==='function' ? v.apply(o,params) : v );
  };
}
 
// Return the first argument passed in
function I(d){ return d } 

var Ä = phrogz; // I added both for editors that choke on unicode