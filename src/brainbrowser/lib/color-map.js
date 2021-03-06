/*
* BrainBrowser: Web-based Neurological Visualization Tools
* (https://brainbrowser.cbrain.mcgill.ca)
*
* Copyright (C) 2011
* The Royal Institution for the Advancement of Learning
* McGill University
*
* This program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Affero General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License
* along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/*
* Author: Nicolas Kassis
* Author: Tarek Sherif <tsherif@gmail.com> (http://tareksherif.ca/)
*/

(function() {
  "use strict";

  /**
  * @doc function
  * @name BrainBrowser.static methods:createColorMap
  * @param {string} data The color map data as a string.
  * @param {object} options Options for the color map.
  * Options include the following:
  *
  * * **clamp** {boolean} Should values be clamped to range?
  * * **flip** {boolean} Invert mapping?
  * * **scale** {number} Scale to use (usually 1 or 255).
  * * **contrast** {number} Color contrast.
  * * **brightness** {number} Extra intensity for colors.
  *
  * @returns {object} Color map object.
  *
  * @description
  * Factory function to produce color map object from a string of data. A given
  * color map is a set of colors to which intensity data can be mapped for display.
  * ```js
  * BrainBrowser.createColorMap(data);
  * ```
  */
  BrainBrowser.createColorMap = function(data, options) {
    options = options || {};
    var margin = options.margin !== undefined ? options.margin : 0;
    var clamp      = options.clamp === undefined ? true : options.clamp;
    var flip       = options.flip       || false;
    var scale      = options.scale      || 1;
    var contrast   = options.contrast   || 1;
    var brightness = options.brightness || 0;

    var color_map_colors;
    var lines, line_count, line_length;
    var i, j, ic;
    var color;

    if (data) {
      lines = data.trim().split(/\n/);
      color_map_colors = [];
      ic = 0;

      for (i = 0, line_count = lines.length; i < line_count; i++) {
        color = lines[i].trim().split(/\s+/).slice(0, 5);
        line_length = color.length;

        if (line_length < 3) continue;

        if (line_length > 4) {
          /* Sparse colour map. The first column gives the
           * label to associate with the colour, the remaining
           * 4 columns give the RGBA values to associate with
           * the label.
           */
          ic = parseInt(color[0], 10);
          ic *= 4;
          line_length = 4;
          color = color.slice(1, 5);
        }

        for (j = 0; j < line_length; j++) {
          color_map_colors[ic + j] = parseFloat(color[j]);
        }

        if (line_length < 4) {
          color_map_colors[ic + 3] = 1;
        }

        ic += 4;
      }
    }

    /**
    * @doc object
    * @name color_map
    *
    * @description
    * Object representing the currently loaded color map.
    */
    var color_map = {
      colors: color_map_colors,
      clamp: clamp,
      flip: flip,
      scale: scale,
      contrast: contrast,
      brightness: brightness,

      /**
      * @doc function
      * @name color_map.color_map:mapColors
      * @param {array} values Original intensity values.
      * @param {object} options Options for the color mapping.
      * Options include the following:
      *
      * * **min** {number} Minimum intensity value.
      * * **max** {number} Maximum intensity value.
      * * **clamp** {boolean} Should values be clamped to range (overrides color map default)?
      * * **flip** {boolean} Invert mapping (overrides color map default)?
      * * **scale** {number} Scale to use (usually 1 or 255, overrides color map default).
      * * **contrast** {number} Color contrast (overrides color map default).
      * * **brightness** {number} Extra intensity for colors (overrides color map default).
      * * **default_colors** {array} Colors to use if value is out of range.
      * * **destination** {array} Array to write the colors to (instead of creating
      *   a new array).
      *
      * @returns {array} Colors modified based on options.
      *
      * @description
      * Create a color map of the input values modified based on the options given.
      * ```js
      * color_map.mapColors(data, {
      *   min: 0,
      *   max: 7.0
      * }, filterColorCb);
      * ```
      */
      mapColors: function(intensity_values, options, filterColorCb) {
        options = options || {};
        var min = options.min === undefined ? 0 : options.min;
        var max = options.max === undefined ? 255 : options.max;
        var maxSpectrum = options.maxSpectrum || 4;

        intensity_values = intensity_values.map(value => {
          var nVal = value > max && value <= maxSpectrum ? max - 0.0001 : value;
          
            return nVal;
        })

        var default_colors = options.default_colors || [0, 0, 0, 1];
        var destination = options.destination || new Float32Array(intensity_values.length * 4);

        var color_map_colors = filterColorCb ? filterColorCb(color_map.colors) : color_map.colors;

        if (!color_map_colors) return;
        
        var color_map_length = color_map_colors.length / 4;

        var scale = options.scale === undefined ? color_map.scale : options.scale;
        var clamp = options.clamp === undefined ? color_map.clamp : options.clamp;
        var flip = options.flip === undefined ? color_map.flip : options.flip;
        var brightness = options.brightness === undefined ? color_map.brightness : options.brightness;
        var contrast = options.contrast === undefined ? color_map.contrast : options.contrast;

        const colorOptions = options.colorOptions;

        // This is used so that when the model color is used in a model
        // that was just given a single color to apply to the whole model,
        // the indexes will be set properly (i.e. from 0-4, not 0-no. of
        // vertices.)
        var default_color_offset = default_colors.length === 4 ? 0 : 1;
        var range = max - min;
        var increment = color_map_length / range;

        var value;
        var i, ic, idc, count;
        var color_map_index;

        brightness *= scale;
        contrast *= scale;

        if (min === 0 && (max === 17 || max === 18)) {
          increment = 1;
        }
        //for each value, assign a color
        for (i = 0, count = intensity_values.length; i < count; i++) {
          value = intensity_values[i];
          ic = i * 4;
          color_map_index = getColorMapIndex(value, min, max, increment, clamp, flip, color_map_length);

          //This inserts the RGBA values (R,G,B,A) independently
          if(color_map_index < 0) {
            idc = ic * default_color_offset;

            // contrast includes scaling factor
            destination[ic]     = contrast * default_colors[idc]     + brightness;
            destination[ic + 1] = contrast * default_colors[idc + 1] + brightness;
            destination[ic + 2] = contrast * default_colors[idc + 2] + brightness;
            destination[ic + 3] = scale    * default_colors[idc + 3];
          } else if (colorOptions) {
            const { colors, defaultColor, leftCount} = colorOptions;
            const findColor = colors.find((color) => {
              const isLeft = color[1] === 'left';
              const isAll = color[1] === 'all';
              if (color[0] === 1) {
                return (value > 0 && value <= 1) && 
                (isAll || (isLeft ? i <= leftCount : i > leftCount));
              }

              return color[0] === value && 
                (isAll || (isLeft ? i <= leftCount : i > leftCount));
            })
            if (findColor) {
              // contrast includes scaling factor
              destination[ic]     = contrast * color_map_colors[color_map_index] + brightness;
              destination[ic + 1] = contrast * color_map_colors[color_map_index + 1] + brightness;
              destination[ic + 2] = contrast * color_map_colors[color_map_index + 2] + brightness;
              destination[ic + 3] = scale    * color_map_colors[color_map_index + 3];
            } else {
              // contrast includes scaling factor
              destination[ic]     = contrast * defaultColor[0] + brightness;
              destination[ic + 1] = contrast * defaultColor[1] + brightness;
              destination[ic + 2] = contrast * defaultColor[2] + brightness;
              destination[ic + 3] = scale    * defaultColor[3];
            }
          } else {
            // contrast includes scaling factor
            destination[ic]     = contrast * color_map_colors[color_map_index] + brightness;
            destination[ic + 1] = contrast * color_map_colors[color_map_index + 1] + brightness;
            destination[ic + 2] = contrast * color_map_colors[color_map_index + 2] + brightness;
            destination[ic + 3] = scale    * color_map_colors[color_map_index + 3];

          }
        }

        return destination;
      },

      /**
      * @doc function
      * @name color_map.color_map:colorFromValue
      * @param {number} value Value to convert.
      * @param {object} options Options for the color mapping.
      * Options include the following:
      *
      * * **format** {string} Can be **float** for 0-1 range rgb array,
      *   **255** for 0-255 range rgb array, or "hex" for a hex string.
      * * **min** {number} Minimum intensity value.
      * * **max** {number} Maximum intensity value.
      * * **clamp** {boolean} Should values be clamped to range (overrides color map default)?
      * * **flip** {boolean} Invert mapping (overrides color map default)?
      * * **scale** {number} Scale to use (usually 1 or 255, overrides color map default).
      * * **contrast** {number} Color contrast (overrides color map default).
      * * **brightness** {number} Extra intensity for colors (overrides color map default).
      *
      * @returns {array|string} Color parsed from the value given.
      *
      * @description
      * Convert an intensity value to a color.
      * ```js
      * color_map.colorFromValue(value, {
      *   format: "float",
      *   min: 0,
      *   max: 7.0
      * });
      * ```
      */
      colorFromValue: function(value, options) {
        options = options || {};
        var hex = options.hex || false;
        var min = options.min === undefined ? 0 : options.min;
        var max = options.max === undefined ? 255 : options.max;
        var scale = options.scale === undefined ? color_map.scale : options.scale;
        var brightness = options.brightness === undefined ? color_map.brightness : options.brightness;
        var contrast = options.contrast === undefined ? color_map.contrast : options.contrast;
        var range = max - min;
        var color_map_length = color_map.colors.length / 4;
        var increment = color_map_length / range;
        var color_map_index = getColorMapIndex(
          value, min, max, increment,
          color_map.clamp,
          color_map.flip,
          color_map_length
        );

        var color;

        if (color_map_index >= 0) {
          color = Array.prototype.slice.call(color_map.colors, color_map_index, color_map_index + 4);
        } else {
          color = [0, 0, 0, 1];
        }

        color[0] = Math.max(0, Math.min(contrast * color[0] + brightness, 1));
        color[1] = Math.max(0, Math.min(contrast * color[1] + brightness, 1));
        color[2] = Math.max(0, Math.min(contrast * color[2] + brightness, 1));

        if (hex) {
          color[0] = Math.floor(color[0] * 255);
          color[1] = Math.floor(color[1] * 255);
          color[2] = Math.floor(color[2] * 255);
          color[3] = Math.floor(color[3] * 255);
          color[0] = ("0" + color[0].toString(16)).slice(-2);
          color[1] = ("0" + color[1].toString(16)).slice(-2);
          color[2] = ("0" + color[2].toString(16)).slice(-2);
          color = color.slice(0, 3).join("");
        } else {
          color[0] = color[0] * scale;
          color[1] = color[1] * scale;
          color[2] = color[2] * scale;
          color[3] = color[3] * scale;
        }

        return color;
      },

      /**
      * @doc function
      * @name color_map.color_map:createElement
      * @param {number} min Min value of the color data.
      * @param {number} max Max value of the color data.
      *
      * @description
      * Create an element representing the color map.
      * ```js
      * color_map.createElement(0.0, 7.0);
      * ```
      */
      createElement: function(min, max, width) {
        var canvas;
        var context;
        var colors = color_map.colors;
        var range = max - min;

        canvas  = createCanvas(colors, 20, 40, width);
        context = canvas.getContext("2d");

        context.fillStyle = "#BFBFBF";
        // Min mark
        context.fillRect(0.5 + margin, 20, 1, 10);
        // Quarter mark
        context.fillRect(canvas.width / 4, 20, 1, 10);
        // Middle mark
        context.fillRect(canvas.width / 2, 20, 1, 10);
        // Three-quarter mark
        context.fillRect(3 * canvas.width / 4, 20, 1, 10);
        // Max mark
        context.fillRect(canvas.width - 0.5 - margin, 20, 1, 10);

        context.fillStyle = "#595959";
        context.font = "12px Arial";

        var toFixed = 2
        // Min mark
        var minText = parseFloat(min.toPrecision(3)).toFixed(toFixed);
        context.fillText(minText, 0, 40);
        // Quarter mark
        var quarterText = parseFloat((min + 0.25 * range).toPrecision(3)).toFixed(toFixed);
        context.fillText(quarterText, 0.25 * canvas.width - context.measureText(quarterText).width / 2, 40);
        // Middle mark
        var middleText = parseFloat((min + 0.5 * range).toPrecision(3)).toFixed(toFixed);
        context.fillText(middleText, 0.5 * canvas.width - context.measureText(middleText).width / 2, 40);
        // Three-quarter mark
        var threeQuarterText = parseFloat((min + 0.75 * range).toPrecision(3)).toFixed(toFixed);
        context.fillText(threeQuarterText, 0.75 * canvas.width - context.measureText(threeQuarterText).width / 2, 40);
        // Max mark
        var maxText = parseFloat(max.toPrecision(3)).toFixed(toFixed);
        context.fillText(maxText, canvas.width - context.measureText(threeQuarterText).width, 40);
        
        return canvas;
      },

      /**
       * createLogPElement val = Math.pow(10, -p)
       * min and max is reverse
       */
      createLogPElement: function(min, max, width, isVolume = false) {
        /* const powPFun = (p) => {
          return Number.parseFloat(Math.pow(10, -p).toFixed(4));
        } */
        const fixedNumber = (num) => {
          if (!num) return num;

          return Number.parseFloat(num.toFixed(4));
        };

        var canvas;
        var context;
        var colors = color_map.colors;
        var range = max - min;
        var cutPrevColor = true;

        const filterColors = isVolume ? [0, 0, 0, 1] : undefined;

        canvas  = createCanvas(colors, 20, 40, width, cutPrevColor, filterColors);
        context = canvas.getContext("2d");

        context.fillStyle = "#BFBFBF";
        // Min mark
        context.fillRect(0.5 + margin, 20, 1, 10);
        // Quarter mark
        context.fillRect(canvas.width / 4, 20, 1, 10);
        // Middle mark
        context.fillRect(canvas.width / 2, 20, 1, 10);
        // Three-quarter mark
        context.fillRect(3 * canvas.width / 4, 20, 1, 10);
        // Max mark
        context.fillRect(canvas.width - 0.5 - margin, 20, 1, 10);

        context.fillStyle = "#595959";
        context.font = "12px Arial";

        // Min mark
        // var minText = powPFun(max);
        var minText = fixedNumber(min);
        context.fillText(minText, 0, 40);
        // Quarter mark
        // var quarterText = powPFun(max - 0.25 * range);
        var quarterText = fixedNumber(min + 0.25 * range);
        context.fillText(quarterText, 0.25 * canvas.width - context.measureText(quarterText).width / 2, 40);
        // Middle mark
        // var middleText = powPFun(max - 0.5 * range);
        var middleText = fixedNumber(min + 0.5 * range);
        context.fillText(middleText, 0.5 * canvas.width - context.measureText(middleText).width / 2, 40);
        // Three-quarter mark
        // var threeQuarterText = powPFun(max - 0.75 * range);
        var threeQuarterText = fixedNumber(min + 0.75 * range);
        context.fillText(threeQuarterText, 0.75 * canvas.width - context.measureText(threeQuarterText).width / 2, 40);
        // Max mark
        // var maxText = powPFun(min);
        var maxText = fixedNumber(max);
        context.fillText(maxText, canvas.width - context.measureText(maxText).width, 40);
        
        return canvas;
      },

      createPercentElement: function(min, max, width) {
        var canvas;
        var context;
        var colors = color_map.colors;
        var range = max - min;

        canvas  = createCanvas(colors, 20, 40, width);
        context = canvas.getContext("2d");

        context.fillStyle = "#BFBFBF";

        // Min mark
        context.fillRect(0.5 + margin, 20, 1, 10);

        // Quarter mark
        context.fillRect(canvas.width / 4, 20, 1, 10);

        // Middle mark
        context.fillRect(canvas.width / 2, 20, 1, 10);

        // Three-quarter mark
        context.fillRect(3 * canvas.width / 4, 20, 1, 10);

        // Max mark
        context.fillRect(canvas.width - 0.5 - margin, 20, 1, 10);

        context.fillStyle = "#595959";
        context.font = "12px Arial";

        // Min mark
        var minText = parseFloat(min.toPrecision(3) * 100).toFixed(0) + "%";
        context.fillText(minText, 0, 40);

        // Quarter mark
        var quarterText = parseFloat(((min + 0.25 * range)*100).toPrecision(3)).toFixed(0) + "%";
        context.fillText(quarterText, 0.25 * canvas.width - context.measureText(quarterText).width / 2, 40);

        // Middle mark
        var middleText = parseFloat(((min + 0.5 * range)*100).toPrecision(3)).toFixed(0) + "%";
        context.fillText(middleText, 0.5 * canvas.width - context.measureText(middleText).width / 2, 40);

        // Three-quarter mark
        var threeQuarterText = parseFloat(((min + 0.75 * range)*100).toPrecision(3)).toFixed(0) + "%";
        context.fillText(threeQuarterText, 0.75 * canvas.width - context.measureText(threeQuarterText).width / 2, 40);

        // Max mark
        var maxText = parseFloat(max.toPrecision(3) * 100).toFixed(0) + "%";
        context.fillText(maxText, canvas.width - context.measureText(maxText).width, 40);
        
        return canvas;
      },
      /**
      * @doc special function
      * @name color_map.color_map:createSymmPosNegElement
      * @param {number} min Min value of the color data.
      * @param {number} max Max value of the color data.
      *
      * @description
      * Create an element representing the color map.
      * ```js
      * color_map.createSymmPosNegElement(0.0, 7.0);
      * ```
      */
      createSymmPosNegElement: function(spectrumRange, width) {
        var canvas;
        var context;
        var colors = color_map.colors;
        
        canvas  = createCanvas(colors, 20, 40, width);
        context = canvas.getContext("2d");
        
        context.fillStyle = "#BFBFBF";
        context.strokeStyle = "#BFBFBF";
        context.font = "12px Arial";
        var paddingWidth = 0;
        var subpaddingWidth = 0.5 * canvas.width * (spectrumRange.min_value/spectrumRange.max_value);
        // Min mark tick
        context.fillRect(paddingWidth, 20, 1, 10);
        // Quarter mark tick
        context.fillRect(Math.floor(canvas.width / 2 - subpaddingWidth), 20, 1, 10);
        // Middle mark tick
        context.fillRect(canvas.width / 2, 20, 1, 10);
        // Three-quarter mark tick
        context.fillRect(Math.floor(canvas.width / 2 + subpaddingWidth), 20, 1, 10);
        // Max mark tick
        context.fillRect(canvas.width - paddingWidth - 1, 20, 1, 10);
        // colorbar box
        context.moveTo(paddingWidth, 0);
        context.lineTo(canvas.width - paddingWidth, 0);
        context.stroke();
        context.moveTo(paddingWidth, 21);
        context.lineTo(canvas.width - paddingWidth, 21);
        context.stroke();

        var max_value = spectrumRange.max_value ? parseFloat(spectrumRange.max_value) : 0;
        max_value =  max_value.toString().length <= 4 ? max_value:  max_value.toPrecision(4);
        var min_value = spectrumRange.min_value ? parseFloat(spectrumRange.min_value) : 0;
        min_value = min_value.toString().length <= 4  ? min_value  : min_value.toPrecision(4);
        context.fillStyle = "#595959";
        // Min mark text
        var minusMaxText = '-' + max_value;
        var minusMaxTextRightPos = context.measureText(minusMaxText).width;
        context.fillText(minusMaxText, paddingWidth, 40);
        // Middle mark text
        var middleText = 0;
        var middleTextLeftPos = 0.5 * canvas.width - context.measureText(middleText).width / 2;
        var middleTextRightPos = middleTextLeftPos + context.measureText(middleText).width;
        context.fillText(middleText, middleTextLeftPos, 40);
        // Max mark text
       
        var plusMaxText = max_value;
        var pluxMaxTextLeftPos = canvas.width - paddingWidth - context.measureText(plusMaxText).width;
        context.fillText(plusMaxText, pluxMaxTextLeftPos, 40);
        // Quarter mark text
        var minusMinText = '-' + min_value;
        var minusMinTextWidth = context.measureText(minusMinText).width;
        var minusMinTextLeftPos = 0.5 * canvas.width - subpaddingWidth - minusMinTextWidth / 2;
        if (minusMinTextLeftPos < minusMaxTextRightPos) {
          minusMinTextLeftPos = minusMaxTextRightPos + 2;
        }
        if (minusMinTextLeftPos + minusMinTextWidth > middleTextLeftPos) {
          minusMinTextLeftPos = middleTextLeftPos - minusMinTextWidth - 2;
        }
        context.fillText(minusMinText, minusMinTextLeftPos, 40);
        // Three-quarter mark text
        
        var plusMinText = min_value;
        var plusMinTextWidth = context.measureText(plusMinText).width;
        var plusMinTextLeftPos = 0.5 * canvas.width + subpaddingWidth - plusMinTextWidth / 2;
        if (plusMinTextLeftPos < middleTextRightPos) {
          plusMinTextLeftPos = middleTextRightPos + 2;
        }
        if (plusMinTextLeftPos + plusMinTextWidth > pluxMaxTextLeftPos) {
          plusMinTextLeftPos = pluxMaxTextLeftPos - plusMinTextWidth - 2;
        }
        context.fillText(plusMinText, plusMinTextLeftPos, 40);

        return canvas;
      }
    };

    // Map a single value to a color.
    function getColorMapIndex(value, min, max, increment, clamp, flip, color_map_length) {
      var color_map_index;

      if ((value < min || value > max) && !clamp) {
        return -1;
      }
      else {
        
        color_map_index = Math.floor(Math.max(0, Math.min((value - min) * increment, color_map_length - 1)));
        if (flip) {
          color_map_index = color_map_length - 1 - color_map_index;
        }

        color_map_index *= 4;

        return color_map_index;
      }
    }

    // Creates a canvas with the color_map of colors
    // from low(left) to high(right) values
    //   colors: array of colors
    //   color_height: height of the color bar
    //   full_height: height of the canvas
    function createCanvas(colors, color_height, full_height,full_width, cutPrevColor = false, filterColors) {
      var canvas = document.createElement("canvas");
      var value_array  = new Array(256);
      var i;
      var context;
      var old_scale;

      canvas.width  = (full_width ? full_width : 256) + margin * 2;
      canvas.height = full_height;
      canvas.style.paddingLeft = '10px';
      canvas.style.paddingRight = '10px';
      for (i = 0; i < 256; i++) {
        value_array[i] = i;
      }

      old_scale = color_map.scale;
      color_map.scale = 255;
      colors = color_map.mapColors(value_array, undefined, (colors) => {
        if (!cutPrevColor) return colors;

        while(true) {
          const [color1, color2, color3, color4] = colors;
          
          if (color1 === 1 && color2 === 1 && color3 === 1 && color4 === 1) {
            colors = colors.slice(4);
          } else break;
        }

        if (filterColors) {
          const colorLen = colors.length;
          const filterIndexs = [];
          colors.forEach((colorSubVal, index) => {
            if (
              index % 4 === 0 && 
              colorLen >= index + 3 && 
              colors[index] === filterColors[0] && 
              colors[index + 1] === filterColors[1] && 
              colors[index + 2] === filterColors[2] && 
              colors[index + 3] === filterColors[3]
            ) {
              filterIndexs.push(...[index, index + 1, index + 2, index + 3]);
            }
          });

          colors = colors.filter((val, index) => !filterIndexs.includes(index));
        }
        
        return colors;
      });
      color_map.scale = old_scale;

      context = canvas.getContext("2d");
      let tempColor = '';
      for (i = 0; i < 256; i++) {
        // var index = reverse ? (255 - i) : i;
        var index = i;
        context.fillStyle = "rgb(" + Math.floor(colors[index*4]) + ", " +
                                     Math.floor(colors[index*4+1]) + ", " +
                                     Math.floor(colors[index*4+2]) + ")";
        if(context.fillStyle !== '#ffffff' || !cutPrevColor) {
          tempColor = context.fillStyle;
          context.fillRect(i + margin, 0, 1, color_height);
        } else {
          context.fillStyle = tempColor;
          context.fillRect(i + margin, 0, 1, color_height);
        }
      }

      return canvas;
    }



    return color_map;

  };

})();
