/*
 * MotionPlot
 *
 * A motion chart deals with data in several ways:
 *  - Size of point
 *  - Colour of point
 *  - z axis (motion-controller)
 *  - x axis
 *  - y axis
 *
 *  For now, all data but that associated with colour must be numbers
 *
 *  We need to organize data first into separate items (for multiple circles)
 *  then each of those must be organized by z-index.
 */

var Chart = function(chartParent, options) {
  // Return object
  var chart = {};

  // Constants used for various things
  var BG_ID = 'mp_bg';
  var AXES_ID = 'mp_axes';
  var CONTENT_ID = 'mp_content';

  // Deal with default options
  options = options || {};
  options.width = options.width || 600;
  options.height = options.height || 350;

  // In case it's not a jQuery object
  chartParent = $(chartParent);

  // Array of all the layers
  chart.allLayers = [];
  chart.data = {};
  chart.colours = {};

  // Default values of things
  chart.bgColour = '#F0F0F0';

  // Default selectors
  chart.axes = { x : 'x', y : 'y', z : 'z' };
  chart.groupBy = 'id';

  // Set up default ticks
  // Length and width are in pixels; frequency in units
  // Major frequency is in ticks
  chart.ticks = {
    x : {
      major : {
        frequency : 4,
        length : 8,
        width : 2
      },
      minor : {
        frequency : 1,
        length : 4,
        width : 1
      }
    },
    y : {
      major : {
        frequency : 4,
        length : 8,
        width : 2
      },
      minor : {
        frequency : 1,
        length : 4,
        width : 1
      }
    }
  };

  // Default z step size
  chart.zStep = 1;
  chart.axesWidth = { x : 40, y : 50 };

  chart.axesLabels = { x : 'Horizontal Axis', y : 'Vertical Axis' };

  // Make the canvases (TODO : Remove this and just register canvas)
  chart.bgLayer = util.initCanvas(chart, chartParent, options, BG_ID);
  chart.axesLayer = util.initCanvas(chart, chartParent, options, AXES_ID);
  chart.contentLayer = util.initCanvas(chart, chartParent, options, CONTENT_ID);

  // Add a data point to the data set
  chart.addData = function(data) {
    if($.isArray(data)) {
      for(var i = 0; i < data.length; ++i) {
        this.addData(data[i]);
      }
    } else {
      // Push appropriately
      var id = data[this.groupBy];
      if(!this.data[id]) {
        this.data[id] = [];
      }
      this.data[id].push(data);
    }
  };

  // Initialize the data for use in the chart
  chart.initData = function() {
    var self = this;
    var dataList;
    // Reset boundaries
    this.zMin = 0;
    this.zMax = 0;

    // Sort all data points
    for(var id in this.data) {
      dataList = this.data[id];
      dataList.sort(function(a, b) {
        return a[self.axes.z] - b[self.axes.z];
      });

      // Set min & max z values
      this.zMin = Math.min(this.zMin, dataList[0][this.axes.z]);
      this.zMax = Math.max(this.zMax, dataList[dataList.length - 1][this.axes.z]);
    }

    // Interpolate missing data points
    for(var id in this.data) {
      util.interpolateData(this.data[id], this.zMin, this.zMax);
    }

    // Set the initial zIndex
    this.zIndex = this.zMin;

    // Generate and assign unique colours to IDs
    var colours = util.uniqueColours(Object.keys(this.data).length);
    var i = 0;
    for(var id in this.data) {
      this.colours[id] = colours[i];
      i += 1;
    }

    // TODO Sort points by size if used
  };

  // Show the data for the next z index
  chart.showNextData = function () {
    // Next index
    if(this.incrementIndex(1)) {
      this.showData();
      return true;
    } else {
      return false;
    }
  };

  // Show the data for the previous z index
  chart.showPrevData = function() {
    // Previous index
    if(this.incrementIndex(-1)) {
      this.showData();
      return true;
    } else {
      return false;
    }
  };

  // Increment the index and change slider value
  chart.incrementIndex = function(n) {
    this.zIndex += n * this.zStep;
    if(this.zIndex > this.zMax || this.zIndex < this.zMin) {
      this.zIndex -= n * this.zStep;
      return false;
    }
    this.slider.val(this.zIndex);
    return true;
  };

  // Initialize the slider
  chart.initControls = function() {
    var self = this;
    // Initialize Slider
    if (this.slider) {
      // Set min, max, step for the slider
      this.slider.attr({
        min : this.zMin,
        max : this.zMax - ((this.zMax - this.zMin) % this.zStep),
        step : this.zStep
      });
      // Set initial slider value
      this.slider.val(this.zIndex);
      // Register listener to change value
      this.slider.change(function(e) {
        self.zIndex = parseInt(self.slider.val());
        self.showData();
      });
    }

    // Initialize next button
    if(this.nextButton) {
      // Register listener for click
      this.nextButton.click(function(e) {
        self.showNextData();
      });
    }

    // Initialize prev button
    if(this.prevButton) {
      // Register listener for click
      this.prevButton.click(function(e) {
        self.showPrevData();
      });
    }

    // Initialize play button
    if(this.playButton) {
      // Register listener for click
      this.playButton.click(function(e) {
        self.play();
      });
    }
  };

  // Initially render the chart
  chart.init = function() {
    // Sort the data by z axis
    this.initData();
    this.initControls();
    // Render the chart entirely
    this.clearAll();
    this.showBackground();
    this.showAxes();
    // Show data for the current zIndex
    this.showData();
  };

  // Show the data for the current z index
  chart.showData = function() {
    var dataPoint;
    var xOffset, yOffset;

    // Clear content
    util.clearCanvas(this.contentLayer);

    var cvs = this.contentLayer;
    var ctx = cvs.getContext('2d');


    // Find the offset in pixels that this value should have
    function computeOffset(minVal, maxVal, px, val) {
      var pxPerUnit = px / (maxVal - minVal);
      return pxPerUnit * (val - minVal);
    }

    var px;
    var fill;
    var opt;

    for(var id in this.data) {
      dataPoint = this.data[id][this.zIndex];

      px = cvs.width - this.axesWidth.y;
      // Offsets in pixels from the axes
      xOffset = computeOffset(this.xMin, this.xMax, px, dataPoint[this.axes.x]);
      px = cvs.height - this.axesWidth.x
      yOffset = computeOffset(this.yMin, this.yMax, px, dataPoint[this.axes.y]);

      // Coordinates to display this point at
      coords = { x : xOffset + this.axesWidth.y, y : px - yOffset };
      // Get colour for this id
      fill = util.rgbToString(this.colours[id]);
      opt = { fill : fill };
      // TODO : Use other options?
      util.circle(ctx, coords, opt);
    }
  };

  // Draw axes on the screen
  chart.showAxes = function() {

    var ctx = this.axesLayer.getContext('2d');
    var canvasHeight = this.axesLayer.height;
    var canvasWidth = this.axesLayer.width;

    // Beginning coordinates for both axes
    var axisStart = { x : this.axesWidth.y, y : canvasHeight - this.axesWidth.x };

    // Draw the x axis
    var axisEnd = { x : canvasWidth, y : axisStart.y };
    util.line(ctx, axisStart, axisEnd);

    // Draw ticks for the x axis
    util.drawTicks(ctx, this.ticks.x, axisStart, axisEnd, this.xMin, this.xMax, 'x', 1);

    // Draw the y axis
    axisEnd = { x : axisStart.x, y : 0 }
    util.line(ctx, axisStart, axisEnd);

    // Draw ticks for the y axis
    util.drawTicks(ctx, this.ticks.y, axisEnd, axisStart, this.yMin, this.yMax, 'y', -1);

    // Add labels
    var labelFormat = {
      font : 'bold 16px sans-serif',
      textAlign : 'center',
      textBaseline : 'bottom'
    };

    // Save context (we must rotate it to write the y-axis label)
    ctx.save();
    ctx.rotate(-Math.PI / 2);
    util.text(ctx, this.axesLabels.y, { x : -150, y : 20 }, labelFormat);
    // Un-rotate the context
    ctx.restore();

    util.text(ctx, this.axesLabels.x, { x : 300, y : 350 }, labelFormat);

  };

  // Clear all canvases
  chart.clearAll = function() {
    util.clearCanvas(this.allLayers);
  };

  // Render the background (TODO : fancify ?)
  chart.showBackground = function() {
    var ctx = this.bgLayer.getContext('2d');
    ctx.fillStyle = this.bgColour;
    ctx.fillRect(0, 0, this.bgLayer.width, this.bgLayer.height);
  };

  // Button to go to next z index
  chart.registerNextBtn = function(btn) {
    this.nextButton = $(btn);
  };

  // Button to go to previous z index
  chart.registerPrevBtn = function(btn) {
    this.prevButton = $(btn);
  };

  // Register a slider to use to select the z indices
  chart.registerSlider = function(slider) {
    this.slider = $(slider);
  };

  chart.registerPlayBtn = function(btn) {
    this.playButton = $(btn);
  };

  // Play the animation from now until the end
  chart.play = function() {
    if (this.playInterval) {
      window.clearInterval(this.playInterval);
      this.playInterval = null;
    } else {
      var self = this;
      this.playInterval = window.setInterval(function() {
        console.log('hi');
        // Stop playing if there is no more data
        if(!self.showNextData()) self.play();
      }, 500);
    }
  };

  return chart;
};
