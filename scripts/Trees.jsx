/**********************************************************

ADOBE SYSTEMS INCORPORATED 
Copyright 2005-2010 Adobe Systems Incorporated 
All Rights Reserved 

NOTICE:  Adobe permits you to use, modify, and 
distribute this file in accordance with the terms
of the Adobe license agreement accompanying it.  
If you have received this file from a source 
other than Adobe, then your use, modification,
or distribution of it requires the prior 
written permission of Adobe. 

*********************************************************/

/**********************************************************
 
Trees.jsx

DESCRIPTION

This sample creates a tree shape and draws a lot of trees
at different locations randomly with different colors.

**********************************************************/
var docRef = documents.add();
var piRef = activeDocument.pathItems;

// Make a 50 trees
for (i = 0; i != 50; ++i)
{
    // Create the tree shape
    var pathRef = piRef.add();

    // I got the list of these points by first drawing the tree in Illustrator
    // I then displayed all point coordinates of the path using a script
    pathRef.setEntirePath(new Array(
    new Array(266.4619140625, 370.3046875), new Array(269.5244140625, 370.3046875), new Array(268.9619140625, 377.138671875), new Array(278.607421875, 375.66015625), new Array(273.607421875, 381.53515625), new Array(278.607421875, 380.9921875), new Array(272.4619140625, 388.59765625), new Array(278.56640625, 386.91015625), new Array(272.94140625, 393.53515625), new Array(278.31640625, 391.91015625), new Array(272.94140625, 397.8671875), new Array(276.3369140625, 397.47265625), new Array(271.94140625, 403.53515625), new Array(274.607421875, 402.53515625), new Array(268.9619140625, 411.47265625), new Array(267.3369140625, 414.47265625), new Array(265.7119140625, 411.47265625), new Array(260.54541015625, 402.72265625), new Array(263.2119140625, 403.72265625), new Array(258.9619140625, 397.59765625), new Array(262.2119140625, 398.0546875), new Array(256.94091796875, 392.16015625), new Array(262.2119140625, 393.72265625), new Array(256.69091796875, 387.03515625), new Array(262.7119140625, 388.59765625), new Array(256.54541015625, 381.1796875), new Array(261.54541015625, 381.72265625), new Array(256.54541015625, 375.84765625), new Array(266.9619140625, 377.138671875)));

    // Move the tree to a random position
    var left = (Math.random() * 350) + 50;
    var top = (Math.random() * 200) + 520;
    pathRef.position = new Array(left, top);

    // scale the tree between 50% and 200%
    var scale = (Math.random() * 1.5) + 0.5;
    pathRef.height = scale * pathRef.height;
    pathRef.width = scale * pathRef.width;

    // No stroke
    pathRef.stroked = false;

    // create a random CMYK color and assign as the fill color
    var cmykColor = new CMYKColor();
    cmykColor.cyan = Math.random() * 100;
    cmykColor.yellow = Math.random() * 100;
    cmykColor.magenta = Math.random() * 100;
    pathRef.filled = true;
    pathRef.fillColor = cmykColor;

    // apply a random opacity
    pathRef.opacity = Math.random() * 100;
}