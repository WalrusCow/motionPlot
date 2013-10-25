/* util.js
 * Bunch of random utilities for canvasing
 */

var util = function() {

  var DEFAULT_FILL = '#22cc22';
  var DEFAULT_BORDER = '#000000';
  var DEFAULT_RADIUS = 10;

  // Convert hsv colour format to rgb colour format
  function hsvToRgb(h, s, v) {
    // Given an object - unpack
    if(s == undefined) {
      s = h.s; v = h.v; h = h.h;
    }
    if(h == null) return { r : 0, g : 0, b : 0 };
    h /= 60;
    var c = v * s;
    var x = c * (1 - Math.abs((h % 2) - 1));
    if(h < 1) {
      var rgb = { r : c, g : x, b : 0 };
    } else if (h < 2) {
      var rgb = { r : x, g : c, b : 0 };
    } else if (h < 3) {
      var rgb = { r : 0, g : c, b : x };
    } else if (h < 4) {
      var rgb = { r : 0, g : x, b : c };
    } else if (h < 5) {
      var rgb = { r : x, g : 0, b : c };
    } else {
      var rgb = { r : c, g : 0, b : x };
    }
    for(k in rgb) {
      rgb[k] = Math.round(255 * (rgb[k] + v - c));
    }
    return rgb;
  }

  // Generate n unique colours of (r, g, b)
  function uniqueColours(n) {
    // Full saturation, 80% value
    var S = 1;
    var V = 0.8;
    var incr = 360 / n;
    var colours = [];
    var c;
    for(var h = 0; h < 360; h += incr) {
      colours.push(hsvToRgb(h, S, V));
    }
    return colours;
  }

  function lPadStr(str, width, pad) {
    while(str.length < width) {
      str = pad + str;
    }
    return str;
  }

  function rgbToString(r, g, b) {
    if(g == null) {
      g = r.g; b = r.b; r = r.r;
    }
    var rgb = [r, g, b];
    for(var i = 0; i < rgb.length; ++i) {
      rgb[i] = rgb[i].toString(16);
      rgb[i] = lPadStr(rgb[i], 2, '0');
    }
    // Convert to string #RRGGBB
    return '#' + rgb.join('');
  }

  // Draw a line from start to end
  function line(ctx, start, end, opt) {
    // Defaults
    opt = opt || {};
    opt.colour = opt.colour || opt.color || '#000000';
    opt.width = opt.width || 2;

    // Styling
    ctx.strokeStyle = opt.colour;
    ctx.lineWidth = opt.width;

    // Draw the line
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }

  // Draw a circle with a black border on the context
  function circle(ctx, pt, opt) {
    // Deal with optional things
    opt = opt || {};
    opt.radius = opt.radius || DEFAULT_RADIUS;
    opt.fill = opt.fill || DEFAULT_FILL;
    opt.border = opt.border || DEFAULT_BORDER;

    // Draw a circle
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, opt.radius, 0, 2*Math.PI, false);

    // Main colour
    ctx.fillStyle = opt.fill;
    ctx.fill();

    // Border
    ctx.lineWidth = 1;
    ctx.strokeStyle = opt.border;
    ctx.stroke();
  }

  // Render given text on the canvas at the given point
  function text(ctx, text, pt, opt) {
    opt = opt || {};
    ctx.font = opt.font;
    ctx.textAlign = opt.textAlign;
    ctx.textBaseline = opt.textBaseline || 'middle';
    ctx.fillText(text, pt.x, pt.y);
  }

  // Initialize a canvas with a given id
  function initCanvas(chart, chartParent, options, id) {
    var newCanvas = $('<canvas/>', { id : id, class : 'mp_chart' });
    newCanvas.attr({
      'z-index' : chart.allLayers.length,
      width : options.width,
      height : options.height
    });
    // Don't store jQuery object
    chart.allLayers.push(newCanvas[0]);
    chartParent.append(newCanvas);
    return newCanvas[0];
  }

  // Interpolate any missing data points for a data list between start and end
  function interpolateData(dataList, start, end) {
    // TODO
    return;
  }

  function clearCanvas(canvas) {
    // Given a list of canvases
    if (arguments.length > 1) { canvas = arguments; }
    if($.isArray(canvas)) {
      for(var i = 0; i < canvas.length; ++i) {
        clearCanvas(canvas[i]);
      }
    } else {
      var ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  // Draw ticks
  function drawTicks(ctx, tickConfig, axisStart, axisEnd, min, max, axis, one) {
    // Magical constants for text offset (not sure we need this)
    var TEXT_OFFSET_Y = 5;
    var TEXT_OFFSET_X = 10;

    // Line boundaries
    var lineStart = { x : axisStart.x, y : axisEnd.y };
    var lineEnd = { x : axisStart.x, y : axisEnd.y };
    var numTicks = (max - min) / tickConfig.minor.frequency;

    // Pixels per tick
    var pxPerTick = (axisEnd[axis] - axisStart[axis]) / numTicks;
    var thisTick;

    // Axis we are not drawing
    var otherAxis = (axis === 'x') ? 'y' : 'x';

    // Position to place the text at
    var textAnchor = { x : lineEnd.x, y : lineEnd.y };
    var textOffset = (axis === 'x') ? TEXT_OFFSET_X : TEXT_OFFSET_Y;
    // Text should be offset to not touch ticks
    textAnchor[otherAxis] +=  10 * one;
    var textFormat = {
      font : '10px sans-serif',
      textAlign : (axis === 'x') ? 'center' : 'right',
      textBaseline : (axis === 'x') ? 'top' : null
    };
    var textVal;

    for(var i = 0; i < numTicks; ++i) {
      thisTick = (i % tickConfig.major.frequency) ? tickConfig.minor : tickConfig.major;

      // Add or subtract as appropriate
      lineEnd[otherAxis] = lineStart[otherAxis] + one * thisTick.length;
      // Draw the line
      line(ctx, lineStart, lineEnd, { width : thisTick.width });

      // Add labels for major ticks
      if(thisTick === tickConfig.major) {
        // Value of current tick
        textVal = tickConfig.minor.frequency * i + min;
        textAnchor[axis] = lineEnd[axis];

        text(ctx, textVal, textAnchor, textFormat);
      }

      // Move the line
      lineStart[axis] += one * pxPerTick;
      lineEnd[axis] = lineStart[axis];
    }
  }

  // Module!
  return {
    drawTicks : drawTicks,
    hsvToRgb : hsvToRgb,
    clearCanvas : clearCanvas,
    interpolateData : interpolateData,
    initCanvas : initCanvas,
    circle : circle,
    text : text,
    line : line,
    rgbToString : rgbToString,
    uniqueColours : uniqueColours
  };

}();
