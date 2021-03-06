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

/**
 * Represents a blended volume. It does so at least in part by
 * defining its own "virtual" world space and superimposing the
 * other volumes onto this space.
 */

(function() {
  "use strict";

  var VolumeViewer = BrainBrowser.VolumeViewer;
  var image_creation_context = document.createElement("canvas").getContext("2d");

  const checkIsRiskHeatMap = (volume) => {
    return !!volume && !!volume.isRiskHeatMap;
  }

  const checkIsSafety = (volume) => {
    return !!volume && !!volume.isSafety;
  }

  const getAnatSlice = (slices, volumes) => {
    let AnatSlice = slices.find((slice,index) => {
      return !!(volumes[index] && volumes[index].isAnat)
    });
    return AnatSlice ? AnatSlice : false;
  }

  const getRiskMaskSlice = (slices = [], volumes = []) => {
    let riskMaskSlice = slices.find((slice,index) => {
      return !!(volumes[index] && volumes[index].isRiskMask)
    });
    return riskMaskSlice ? riskMaskSlice : false;
  }

  VolumeViewer.volume_loaders.overlayaligned = function(options, callback) {
    options = options || {};
    var volumes = options.volumes || [];

    /*
     * Initialize the header to a fairly generic setting. This allows
     * us to fully define "world coordinates" in this volume. This is
     * important if we're going to synchronize all slices on world
     * coordinates.
     */
    var header = {};
    var SIZE = 256;
    var order = ["xspace", "yspace", "zspace"];
    header.order = order;

    for (var i = 0; i < order.length; i++) {
      header[order[i]] = {};
      header[order[i]].step = volumes[0].header[order[i]].step;
      header[order[i]].start = volumes[0].header[order[i]].start;
      header[order[i]].direction_cosines = volumes[0].header[order[i]].direction_cosines;
      header[order[i]].space_length = volumes[0].header[order[i]].space_length;

    }
    /* Use this header to create the volume object for the
     * overlay. This will set the transform and populate
     * essential member functions.
     */
    var overlay_volume = VolumeViewer.createVolume(header, []);

    overlay_volume.type = "overlay"; // Set the type.

    /* Create the three special fields the overlay contains - the base
     * size of its voxel dimensions, the list of overlaid volumes and
     * the blend ratios to apply to those volumes.
     */
    overlay_volume.size = SIZE;
    overlay_volume.volumes = [];
    overlay_volume.blend_ratios = [];
    overlay_volume.opacitys = [];
    overlay_volume.saveOriginAndTransform(header);

    /* Override the default slice function. This one does not really
     * return the data at all, since the overlay contains no data of
     * its own. It just gets references to the slices in the overlaid
     * volumes and returns a more-or-less valid slice object.
     */
    overlay_volume.slice = function(axis, slice_num, time) {
      slice_num = slice_num === undefined ? this.position[axis] : slice_num;
      time = time === undefined ? this.current_time : time;

      var slices = [];

      this.volumes.forEach(function(volume) {
        /*
         * We need to correct the slice_num for images with different
         * numbers of points along an axis. Otherwise we won't form
         * the composite image correctly.
         * TODO: This is only a partial fix, and should be improved.
         */
        var factor = volume.header[axis].step / volumes[0].header[axis].step;
        var corrected_slice_num = Math.round(slice_num / factor);
        var slice = volume.slice(axis, corrected_slice_num, time);
        slice.display_zindex = volume.header.display_zindex;
        slices.push(slice);
      });

      return {
        height_space: header[axis].height_space,
        width_space: header[axis].width_space,
        slices: slices
      };
    };

    // Get the slice image, at the requested zoom level, contrast
    // and brightness. Zoom values of less than one imply a smaller
    // image (therefore a larger field of view)
    overlay_volume.getSliceImage = function(slice, zoom, contrast, brightness) {
      zoom = zoom || 1;

      var slices = slice.slices;
      var images = [];
      // var max_width = Math.round(this.size * zoom);
      // var max_height = max_width;

      var max_width = Math.round(slices[0].width * zoom);
      var max_height = Math.round(slices[0].height * zoom);
      const riskMaskSlice = getRiskMaskSlice(slices, overlay_volume.volumes);
      const anatSlice = getAnatSlice(slices, overlay_volume.volumes);
      slices.forEach(function (slice, i) {
        if (slice.width === undefined || slice.height === undefined) return;
        var volume = overlay_volume.volumes[i];
        var color_map = volume.color_map;
        var error_message;

        if (!color_map) {
          error_message = "No color map set for this volume. Cannot render slice.";
          volume.triggerEvent("error", error_message);
          throw new Error(error_message);
        }

        var target_width = max_width;
        var target_height = max_height;
        var source_image = image_creation_context.createImageData(slice.width, slice.height);
        var target_image = image_creation_context.createImageData(target_width, target_height);

        if (volume.header.datatype === 'rgb8') {
          var tmp = new Uint8ClampedArray(slice.data.buffer);
          source_image.data.set(tmp, 0);
        }
        else {
          let mergedData = slice.data;
          const isRiskHeatMap = checkIsRiskHeatMap(volume);
          const isSafety =  checkIsSafety(volume)
          if (isSafety) {
            if (isRiskHeatMap && anatSlice){
              mergedData = slice.data.map((val, sliceIndex) => {
                const maskVal = anatSlice.data[sliceIndex];
                return volume.riskId && maskVal === volume.riskId ? val: 0;
              });
            }
          }else if (isRiskHeatMap && riskMaskSlice) {
            mergedData = slice.data.map((val, sliceIndex) => {
              const maskVal = riskMaskSlice.data[sliceIndex];
              return volume.riskId && maskVal === volume.riskId ? val: 0;
            });
          }

          color_map.mapColors(mergedData, {
            min: volume.intensity_min,
            max: volume.intensity_max,
            contrast: contrast,
            brightness: brightness,
            destination: source_image.data
          });
        }

        target_image.data.set(
          VolumeViewer.utils.nearestNeighbor(
            source_image.data,
            source_image.width,
            source_image.height,
            target_width,
            target_height,
            { block_size: 4 }
          )
        );

        target_image.display_zindex = slice.display_zindex;
        images.push(target_image);
      });
      return blendImages(
        images,
        image_creation_context.createImageData(max_width, max_height),
        overlay_volume.opacitys,
      );
    };

    /* Override the getIntensityValue function. The intensity of
     * the overlaid image is defined as the mean of the individual
     * volume intensities, weighted by the blend values.
     */
    overlay_volume.getIntensityValue = function(i, j, k, time) {
      var vc = overlay_volume.getVoxelCoords();
      i = i === undefined ? vc.i : i;
      j = j === undefined ? vc.j : j;
      k = k === undefined ? vc.k : k;
      time = time === undefined ? this.current_time : time;
      var values = [];

      var wc = overlay_volume.voxelToWorld(i, j, k);

      this.volumes.forEach(function(volume) {
        var vc = volume.worldToVoxel(wc.x, wc.y, wc.z);
        values.push(volume.getIntensityValue(vc.i, vc.j, vc.k, time));
      });

      return values.reduce(function(intensity, current_value, i) {
        return intensity + current_value * overlay_volume.blend_ratios[i];
      }, 0);
    };
    volumes.forEach(function(volume) {
      overlay_volume.volumes.push(volume);
      overlay_volume.blend_ratios.push(1 / volumes.length);
      const opacity = typeof volume.opacity === 'undefined' ? 1 : volume.opacity;
      overlay_volume.opacitys.push(opacity);
    });

    if (BrainBrowser.utils.isFunction(callback)) {
      callback(overlay_volume);
    }
  };

  // if image 1 has value, use image 1, otherwise use image 0
  function blendImages(images, target, blend_opacitys) {
    var num_images = images.length;
    if (num_images === 1) {
      return images[0];
    }
    images.sort(function (a, b) {
      var a_zindex = a.display_zindex || 0;
      var b_zindex = b.display_zindex || 0;
      return a_zindex - b_zindex;

    });
    var target_data = target.data;
    var width = target.width;
    var height = target.height;
    var y, x;
    var i;
    var image, image_data, pixel, opacity, current;
    var row_offset;

    //This will be used to keep the position in each image of its next pixel
    var image_iter = new Uint32Array(images.length);
    var opacitys = new Float32Array(blend_opacitys);
    for (y = 0; y < height; y += 1) {
      row_offset = y * width;

      for (x = 0; x < width; x += 1) {
        pixel = (row_offset + x) * 4;

        for (i = 0; i < num_images; i += 1) {
          image = images[i];
          opacity = i === 0 ? 0 : 1 - opacitys[i];

          if(y < image.height &&  x < image.width) {
            image_data = image.data;

            current = image_iter[i];

            if (image_data[current] > 0 || image_data[current + 1] > 0 || image_data[current + 2] > 0) {
              //Red
              target_data[pixel] = target_data[pixel] * opacity + image_data[current] * opacitys[i];

              //Green
              target_data[pixel+1] = target_data[pixel + 1] * opacity + image_data[current + 1] * opacitys[i];

              //Blue
              target_data[pixel+2] = target_data[pixel + 2] * opacity + image_data[current + 2] * opacitys[i];
            }
            target_data[pixel + 3] = 255;

            image_iter[i] += 4;
          }
        }
      }
    }
    return target;

  }

}());

