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
* Author: Tarek Sherif <tsherif@gmail.com> (http://tareksherif.ca/)
*/

import * as math from 'mathjs'

BrainBrowser.VolumeViewer.modules.loading = function(viewer) {
  "use strict";

  var VolumeViewer = BrainBrowser.VolumeViewer;
  var default_color_map = null;
  var default_panel_width = 256;
  var default_panel_height = 256;
  viewer.anchor = [];
  viewer.drawLine = false;
  viewer.lineWorldCoords = [];
  viewer.drawPolyline = false;
  viewer.polylineWorldCoords = [];
  viewer.isDrawPoints = false;
  viewer.drawPoints = [];
  viewer.pointsWorldCoords = [];
  /**
  * @doc function
  * @name viewer.loading:loadVolumes
  * @param {object} options Description of volumes to load:
  * * **volumes** {array} An array of volume descriptions.
  * * **overlay** {boolean|object} Set to true to display an overlay of
  *   the loaded volumes without any interface, or provide and object
  *   containing a description of the template to use for the UI (see below).
  * * **complete** {function} Callback invoked once all volumes are loaded.
  *
  * @description
  * Initial load of volumes. Usage:
  * ```js
  * viewer.loadVolumes({
  *   volumes: [
  *     {
  *       type: "minc",
  *       header_url: "volume1.mnc?minc_headers=true",
  *       raw_data_url: "volume1.mnc?raw_data=true",
  *       template: {
  *         element_id: "volume-ui-template",
  *         viewer_insert_class: "volume-viewer-display"
  *       }
  *     },
  *     {
  *       type: "minc",
  *       header_file: document.getElementById("header-file"),
  *       raw_data_file: document.getElementById("raw-data-file"),
  *       template: {
  *         element_id: "volume-ui-template",
  *         viewer_insert_class: "volume-viewer-display"
  *       }
  *     }
  *   ],
  *   overlay: {
  *     template: {
  *       element_id: "overlay-ui-template",
  *       viewer_insert_class: "overlay-viewer-display"
  *     }
  *   }
  * });
  * ```
  * The volume viewer can use the following parameters to describe the volumes to be loaded:
  * * **type** The type of volume. This should map to one of the volume loaders.
  * * **template** (optional) Object containing information about the template to use
  *   to produce the UI for each volume. Its properties include **element\_id**,
  *   the id of the element containing the template, and
  *   **viewer\_insert\_class**, the class of the element within the template
  *   in which to insert the volume's display panels.
  *
  * Other parameters may be required for given volume types.
  */
  viewer.loadVolumes = function(options) {

    options = options || {};
    var overlay_options = options.overlay && typeof options.overlay === "object" ? options.overlay : {};
          
    var volume_descriptions = options.volumes;
    var hideBorder = !!volume_descriptions.find(des => des.hideBorder);
    var num_descriptions = options.volumes.length;
    var complete = options.complete;
    var num_loaded = 0;
    var i;
        
    function loadVolume(i) {
      setVolume(i, {
        ...volume_descriptions[i],
        hideBorder,
      }, function() {
        if (++num_loaded < num_descriptions) {
          return;
        }

        if (options.overlay && num_descriptions > 1) {
          viewer.createOverlay(overlay_options, hideBorder, function() {
            if (BrainBrowser.utils.isFunction(complete)) {
              complete();
            }

            viewer.triggerEvent("volumesloaded");
          });
        } else {
          if (BrainBrowser.utils.isFunction(complete)) {
            complete();
          }

          viewer.triggerEvent("volumesloaded");
        }
      });
    }
    
    for (i = 0; i < num_descriptions; i++) {
      loadVolume(i);
    }

  };

  /**
  * @doc function
  * @name viewer.loading:loadVolumeColorMapFromURL
  * @param {number} vol_id Index of the volume to be updated.
  * @param {string} url URL of the color map file.
  * @param {string} cursor_color Color to be used for the cursor.
  * @param {function} callback Callback to which the color map object will be passed
  *   after loading.
  *
  * @description
  * Load a color map for the specified volume.
  * ```js
  * viewer.loadVolumeColorMapFromURL(vol_id, url, "#FF0000", function(volume, color_map) {
  *   // Manipulate volume or color map.
  * });
  * ```
  */
  viewer.loadVolumeColorMapFromURL = function(vol_id, url, cursor_color, callback) {
    BrainBrowser.loader.loadColorMapFromURL(url, function(color_map) {
      setVolumeColorMap(vol_id, color_map, cursor_color, callback);
    }, { scale: 255 });
  };

  /**
  * @doc function
  * @name viewer.loading:loadDefaultColorMapFromURL
  * @param {string} url URL of the color map file.
  * @param {string} cursor_color Color to be used for the cursor.
  * @param {function} callback Callback to which the color map object will be passed
  *   after loading.
  *
  * @description
  * Load a default color map for the viewer. Used when a given volume
  *   doesn't have its color map set.
  * ```js
  * viewer.loadDefaultColorMapFromURL(url, "#FF0000", function(color_map) {
  *   // Manipulate color map.
  * });
  * ```
  */
  viewer.loadDefaultColorMapFromURL = function(url, cursor_color, callback) {
    BrainBrowser.loader.loadColorMapFromURL(url, function(color_map) {
      setDefaultColorMap(color_map, cursor_color, callback);
    }, { scale: 255 });
  };

  /**
  * @doc function
  * @name viewer.loading:loadVolumeColorMapFromFile
  * @param {number} vol_id Index of the volume to be updated.
  * @param {DOMElement} file_input File input element representing the color map file to load.
  * @param {string} cursor_color Color to be used for the cursor.
  * @param {function} callback Callback to which the color map object will be passed
  *   after loading.
  *
  * @description
  * Load a color map for the specified volume.
  * ```js
  * viewer.loadVolumeColorMapFromFile(vol_id, file_input_element, "#FF0000", function(volume, color_map) {
  *   // Manipulate volume or color map.
  * });
  * ```
  */
  viewer.loadVolumeColorMapFromFile = function(vol_id, file_input, cursor_color, callback) {
    BrainBrowser.loader.loadColorMapFromFile(file_input, function(color_map) {
      setVolumeColorMap(vol_id, color_map, cursor_color, callback);
    }, { scale: 255 });
  };

  /**
  * @doc function
  * @name viewer.loading:loadDefaultColorMapFromFile
  * @param {DOMElement} file_input File input element representing the color map file to load.
  * @param {string} cursor_color Color to be used for the cursor.
  * @param {function} callback Callback to which the color map object will be passed
  *   after loading.
  *
  * @description
  * Load a default color map for the viewer. Used when a given volume
  *   doesn't have its color map set.
  * ```js
  * viewer.loadDefaultColorMapFromFile(file_input_element, "#FF0000", function(color_map) {
  *   // Manipulate color map.
  * });
  * ```
  */
  viewer.loadDefaultColorMapFromFile = function(file_input, cursor_color, callback) {
    BrainBrowser.loader.loadColorMapFromFile(file_input, function(color_map) {
      setDefaultColorMap(color_map, cursor_color, callback);
    }, { scale: 255 });
  };

  /**
  * @doc function
  * @name viewer.loading:setVolumeColorMap
  * @param {number} vol_id Index of the volume to be updated.
  * @param {object} color_map Color map to use for the indicated volume.
  *
  * @description
  * Set the color map for the indicated volume using an actual color map
  *   object.
  * ```js
  * viewer.setVolumeColorMap(vol_id, color_map));
  * ```
  */
  viewer.setVolumeColorMap = function(vol_id, color_map) {
    if (!viewer.volumes[vol_id]) return;
    viewer.volumes[vol_id].color_map = color_map;
  };

  /**
  * @doc function
  * @name viewer.loading:loadVolume
  * @param {object} volume_description Description of the volume to be loaded.
  *   Must contain at least a **type** property that maps to the volume loaders in
  *   **BrainBrowser.volume_loaders.** May contain a **template** property that
  *   indicates the template to be used for the volume's UI. Other properties will be
  *   specific to a particular volume type.
  * @param {function} callback Callback to which the new volume object will be passed
  *   after loading.
  *
  * @description
  * Load a new volume.
  * ```js
  * // Load over the network.
  * viewer.loadVolume({
  *   type: "minc",
  *   header_url: "volume1.mnc?minc_headers=true",
  *   raw_data_url: "volume1.mnc?raw_data=true",
  *   template: {
  *     element_id: "volume-ui-template",
  *     viewer_insert_class: "volume-viewer-display"
  *   }
  * });
  *
  * // Load from local files.
  * viewer.loadVolume({
  *   type: "minc",
  *   header_file: document.getElementById("header-file"),
  *   raw_data_file: document.getElementById("raw-data-file"),
  *   template: {
  *     element_id: "volume-ui-template",
  *     viewer_insert_class: "volume-viewer-display"
  *   }
  * });
  * ```
  */
  viewer.loadVolume = function(volume_description, callback) {
    setVolume(viewer.volumes.length, volume_description, callback);
  };

  /**
  * @doc function
  * @name viewer.loading:clearVolumes
  *
  * @description
  * Clear all loaded volumes.
  * ```js
  * viewer.clearVolumes();
  * ```
  */
  viewer.clearVolumes = function() {
    viewer.volumes.forEach(function(volume) {
      volume.triggerEvent("eventmodelcleanup");
    });

    viewer.volumes = [];
    viewer.containers = [];
    viewer.active_panel = null;
    viewer.dom_element.innerHTML = "";
  };

  /**
  * @doc function
  * @name viewer.loading:createOverlay
  * @param {object} volume_description Will contain at most a **template**
  *   property indicating the template to use for the UI.
  * @param {function} callback Callback to which the new overlay volume object
  *   will be passed after loading.
  *
  * @description
  * Create an overlay of the currently loaded volumes.
  * ```js
  * viewer.createOverlay({
  *   template: {
  *     element_id: "overlay-ui-template",
  *     viewer_insert_class: "overlay-viewer-display"
  *   }
  * });
  * ```
  */
  viewer.createOverlay = function(description, hideBorder, callback) {

    description = description || {};
    var overlay_type = description.type || 'overlay';
    var views = description.views;

    viewer.loadVolume({
        hideBorder,
        volumes: viewer.volumes,
        type: overlay_type,
        views: views,
        template: description.template
      },
      callback
    );
  };

  /**
  * @doc function
  * @name viewer.loading:setDefaultPanelSize
  * @param {number} width Panel width.
  * @param {number} height Panel height.
  *
  * @description
  * Set the default size for panel canvases.
  * ```js
  * viewer.setDefaultPanelSize(512, 512);
  * ```
  */
  viewer.setDefaultPanelSize = function(width, height) {
    default_panel_width = width;
    default_panel_height = height;
  };

  viewer.syncPosition = function(panel, volume, axis_name) {
    var wc = volume.getWorldCoords();
    viewer.volumes.forEach(function(synced_volume) {
      if (synced_volume !== volume) {
        var synced_panel = synced_volume.display.getPanel(axis_name);
        synced_panel.volume.setWorldCoords(wc.x, wc.y, wc.z);
        synced_panel.updated = true;
        synced_volume.display.forEach(function(panel) {
          if (panel !== synced_panel) {
            panel.updateSlice();
          }
        });
      }
    });
  };

  ///////////////////////////
  // Private Functions
  ///////////////////////////

  // Open volume using appropriate volume loader
  function openVolume(volume_description, callback){
    var loader = VolumeViewer.volume_loaders[volume_description.type];
    var error_message;
    
    if(loader){
      loader(volume_description, callback);
    } else {
      error_message = "Unsuported Volume Type";

      BrainBrowser.events.triggerEvent("error", { message: error_message });
      throw new Error(error_message);
    }
  }

  function flyVolume(volume) {
    const { data } = volume;
    const start = { x: 127, y: 127, z: 127 };
    const end = { x: 157, y: 157, z: 157 };
    const inter = 120;

    // 构造轨迹的坐标路径
    const xList = math.range(start.x, end.x, (end.x - start.x) / inter)._data;
    const yList = math.range(start.y, end.y, (end.y - start.y) / inter)._data;
    const zList = math.range(start.z, end.z, (end.z - start.z) / inter)._data;
    // console.log('xList', xList);

    // x y z 方向的尺寸
    const xSize = xList[xList.length - 1] - xList[0];
    const ySize = yList[yList.length - 1] - yList[0];
    const zSize = zList[zList.length - 1] - zList[0];
    // console.log('xSize', xSize);

    // x y z 与路径尺寸的比例
    const size = Math.sqrt(Math.pow(xSize, 2) + Math.pow(ySize, 2) + Math.pow(zSize, 2));
    // console.log('size', size);
    const xRotio = xSize / size;
    const yRotio = ySize / size;
    const zRotio = zSize / size;

    const vector1Norm = [xRotio, yRotio, zRotio];
    // console.log('xRotio', xRotio);

    // 矩阵转换
    let a = math.matrix([
      [xRotio, yRotio, zRotio], 
      [1, 0, 0],
      [0, 1, 0],
    ]);

    let b = math.matrix([[0], [1], [0]]);

    const vector2 = math.lusolve(a, b)._data;
    // console.log('vector2', vector2);

    const vector2Size = Math.sqrt(
      Math.pow(vector2[0][0], 2) + 
      Math.pow(vector2[1][0], 2) +
      Math.pow(vector2[2][0], 2));
    const vector2x = vector2[0][0] / vector2Size;
    const vector2y = vector2[1][0] / vector2Size;
    const vector2z = vector2[2][0] / vector2Size;
    const vector2Norm = [vector2x, vector2y, vector2z];
    // console.log('vector2Norm', vector2Norm);

    // 另一个矩阵转换
    a = math.matrix([
      [vector1Norm[0], vector1Norm[1], vector1Norm[2]],
      [vector2Norm[0], vector2Norm[1], vector2Norm[2]],
      [0, 1, 0],
    ]);

    b = math.matrix([[0], [0], [1]]);

    const vector3 = math.lusolve(a, b)._data;
    // console.log('vector3', vector3);

    const vector3Size = Math.sqrt(
      Math.pow(vector3[0][0], 2) +
      Math.pow(vector3[1][0], 2) +
      Math.pow(vector3[2][0], 2));
    const vector3x = vector3[0][0] / vector3Size;
    const vector3y = vector3[1][0] / vector3Size;
    const vector3z = vector3[2][0] / vector3Size;
    const vector3Norm = [vector3x, vector3y, vector3z];
    // console.log('vector3Norm', vector3Norm);

    // pointx, pointy, pointz = data.shape
    // pic_center = [data.shape[0] / 2, data.shape[1] / 2, data.shape[2] / 2]
    const pointX = 256;
    const pointY = 256;
    const pointZ = 256;
    const picCenter = { x: pointX / 2, y: pointY / 2, z: pointZ / 2 };

    let nextData = [];
    for(let index = 0; index < xList.length; index++) {
      const newX = xList[index];
      const newY = yList[index];
      const newZ = zList[index];

      const newData = math.zeros(pointX, pointY)._data;
      // console.log('newData', newData);
      const newCenter = { x: newX, y: newY, z: newZ };

      const startX = Math.floor(-pointX / 2);
      const endX = Math.floor(pointX / 2);
      for (let i = startX; i < endX; i++) {
        const startY = Math.floor(-pointY / 2);
        const endY = Math.floor(pointY / 2);

        for (let j = startY; j < endY; j++) {

          const nextX = i * vector2Norm[0] + j * vector3Norm[0];
          const nextY = i * vector2Norm[1] + j * vector3Norm[1];
          const nextZ = i * vector2Norm[2] + j * vector3Norm[2];

          const nextI = Math.floor(nextX + Math.floor(pointX / 2) + newCenter.x - picCenter.x);
          const nextJ = Math.floor(nextY + Math.floor(pointY / 2) + newCenter.y - picCenter.y);
          const nextK = Math.floor(nextZ + Math.floor(pointZ / 2) + newCenter.z - picCenter.z);

          if (!(nextI >= 0 && nextJ >= 0 && nextK >= 0)) continue;
          
          const dataIndex = Math.pow(pointX, 2) * nextI + pointY * nextJ + nextK;

          newData[j + Math.floor(pointY / 2)][i + Math.floor(pointX / 2)] = data[dataIndex];
        }
      }

      nextData = [...nextData, ...math.flatten(newData)];
    }
    
    // console.log('nextData', nextData.filter(n => !!n));
    volume.data = nextData;

    return volume;
  }

  // Place a volume at a certain position in the volumes array.
  // This function should be used with care as empty places in the volumes
  // array will cause problems with rendering.
  function setVolume(vol_id, volume_description, callback) {
    openVolume(volume_description, function(volume) {
      // volume = flyVolume(volume);
      var slices_loaded = 0;
      var views = volume_description.views || ["xspace","yspace","zspace"];

      BrainBrowser.events.addEventModel(volume);

      volume.addEventListener("eventmodelcleanup", function() {
        volume.display.triggerEvent("eventmodelcleanup");
      });

      viewer.volumes[vol_id] = volume;
      volume.color_map = default_color_map;
      volume.display = createVolumeDisplay(viewer.dom_element, vol_id, volume_description);
      volume.opacity = typeof volume_description.opacity === 'undefined' ? 1 : volume_description.opacity;
      volume.propagateEventTo("*", viewer);

      ["xspace", "yspace", "zspace"].forEach(function(axis) {
        volume.position[axis] = Math.floor(volume.header[axis].space_length / 2);
      });

      volume.display.forEach(function(panel) {
        panel.updateSlice(function() {
          if (++slices_loaded === views.length) {
            viewer.triggerEvent("volumeloaded", {
              volume: volume
            });
            if (BrainBrowser.utils.isFunction(callback)) {
              callback(volume);
            }
          }
        });
      });

    });
  }

  function setDefaultColorMap(color_map, cursor_color, callback) {
    color_map.cursor_color = cursor_color;
    default_color_map = color_map;

    viewer.volumes.forEach(function(volume) {
      volume.color_map = volume.color_map || default_color_map;
    });

    if (BrainBrowser.utils.isFunction(callback)) {
      callback(color_map);
    }
  }

  function setVolumeColorMap(vol_id, color_map, cursor_color, callback) {
    color_map.cursor_color = cursor_color;
    viewer.setVolumeColorMap(vol_id, color_map);
    
    if (BrainBrowser.utils.isFunction(callback)) {
      callback(viewer.volumes[vol_id], color_map);
    }
  }

  function getTemplate(dom_element, vol_id, template_id, viewer_insert_class) {
    var template = document.getElementById(template_id).innerHTML.replace(/\{\{VOLID\}\}/gm, vol_id);
    var temp = document.createElement("div");
    temp.innerHTML = template;
    
    var template_elements = temp.childNodes;
    var viewer_insert = temp.getElementsByClassName(viewer_insert_class)[0];

    var i, count;
    var node;

    for (i = 0, count = dom_element.childNodes.length; i < count; i++) {
      node = dom_element.childNodes[i];
      if (node.nodeType === 1) {
        viewer_insert.appendChild(node);
        i--;
        count--;
      }
    }

    return template_elements;
  }

  // Create canvases and add mouse interface.
  function createVolumeDisplay(dom_element, vol_id, volume_description) {
    var container = document.createElement("div");
    var volume = viewer.volumes[vol_id];

    var display = VolumeViewer.createDisplay();
    var template_options = volume_description.template || {};
    var views = volume_description.views || ["xspace", "yspace", "zspace"];
    var template;

    display.propagateEventTo("*", volume);

    container.classList.add("volume-container");
    
    views.forEach(function(axis_name) {
      var canvas = document.createElement("canvas");
      canvas.width = default_panel_width;
      canvas.height = default_panel_height;
      canvas.classList.add("slice-display");
      canvas.style.backgroundColor = "#000000";
      container.appendChild(canvas);
      display.setPanel(
        axis_name,
        VolumeViewer.createPanel({
          volume: volume,
          volume_id: vol_id,
          axis: axis_name,
          canvas: canvas,
          hideBorder: volume_description.hideBorder,
          image_center: {
            x: canvas.width / 2,
            y: canvas.height / 2
          }
        })
      );
    });

    if (template_options.element_id && template_options.viewer_insert_class) {
      template = getTemplate(container, vol_id, template_options.element_id, template_options.viewer_insert_class);

      if (typeof template_options.complete === "function") {
        template_options.complete(volume, template);
      }

      Array.prototype.forEach.call(template, function(node) {
        if (node.nodeType === 1 && volume_description.show_volume !== false) {
          container.appendChild(node);
        }
      });
    }
  
    ///////////////////////////////////
    // Mouse Events
    ///////////////////////////////////
    
    (function() {
      var current_target = null;
      
      views.forEach(function(axis_name) {
        var panel = display.getPanel(axis_name);
        panel.drawPolyline = viewer.drawPolyline;
        panel.drawLine = viewer.drawLine;
        panel.isDrawPoints = viewer.isDrawPoints;
        viewer.polylineWorldCoords = [];
        panel.anchor = viewer.anchor;
        panel.drawPoints = viewer.drawPoints;
        var canvas = panel.canvas;
        var last_touch_distance = null;

        viewer.clearPanel = function() {
          viewer.volumes.forEach(function(volume) {
            volume.display.forEach(function(panel) {
              panel.anchor = [];
              panel.drawPoints = [];
              panel.updated = true;
              panel.dragAnchor = null;
            });
          });
        };

        function startDrag(pointer, shift_key, ctrl_key) {
          if (!pointer) {
            return;
          }
          var voxel = panel.cursorToVoxel(pointer.x, pointer.y);
          panel.isDrawPoints = viewer.isDrawPoints;
          if ((viewer.drawPolyline && panel.anchor.length === 0)) {
            viewer.volumes.forEach(function(volume) {
              volume.display.forEach(function(panel) {
                panel.anchor = [];
              });
            });
            panel.anchor = [voxel];
          }
          if (viewer.drawLine && panel.anchor.length === 2)  {
            panel.anchor = [];
          }
          if (viewer.drawPolyline && viewer.polylineWorldCoords.length === 0) {
            var coords = viewer.volumes[viewer.volumes.length - 1].getWorldCoords();
            viewer.polylineWorldCoords = [coords];
          }
          if (viewer.isDrawPoints) {
            if (panel.drawPoints.length === 0) {
              viewer.volumes.forEach(function(volume) {
                volume.display.forEach(function(panel) {
                  panel.drawPoints = [];
                  viewer.pointsWorldCoords = [];
                });
              });
            }
            var voxel = panel.cursorToVoxel(pointer.x, pointer.y);
            panel.drawPoints.push(voxel);    
            var coords = viewer.volumes[viewer.volumes.length - 1].getWorldCoords();
            viewer.pointsWorldCoords.push(coords);
            if (viewer.drawLineCallBack) {
              var allLength = 0;
              var drawPoints = [];
              if (panel.drawPoints.length === 2) {
                allLength += calculationLine(
                  panel.voxelToCursor(panel.drawPoints[0].voxelX, panel.drawPoints[0].voxelY), 
                  panel.voxelToCursor(panel.drawPoints[1].voxelX, panel.drawPoints[1].voxelY), 
                  panel);
              } else if (panel.drawPoints.length > 2){
                for (var i = 0; i < panel.drawPoints.length; i++) {
                  drawPoints.push(
                    panel.voxelToCursor(panel.drawPoints[i].voxelX, panel.drawPoints[i].voxelY)
                  );
                  var endpoint = i === panel.drawPoints.length - 1 ? panel.drawPoints[0] : panel.drawPoints[i+1];
                  allLength += calculationLine(
                    panel.voxelToCursor(panel.drawPoints[i].voxelX, panel.drawPoints[i].voxelY), 
                    panel.voxelToCursor(endpoint.voxelX, endpoint.voxelY), panel);
                }
              }
              
              viewer.drawLineCallBack(viewer.pointsWorldCoords, allLength, drawPoints, panel.zoom);
            }
          }

          if (!shift_key) {
            panel.updateVolumePosition(pointer.x, pointer.y);
            volume.display.forEach(function(other_panel) {
              if (panel !== other_panel) {
                other_panel.updateSlice();
              }
            });

            if (viewer.synced){
              viewer.syncPosition(panel, volume, axis_name);
            }
          }
          panel.updated = true;
        }

        function drag(pointer, shift_key) {
          if(!pointer) {
            return;
          }
          var drag_delta;
          if(shift_key) {
            drag_delta = panel.followPointer(pointer);
            if (viewer.synced){
              viewer.volumes.forEach(function(synced_volume, synced_vol_id) {
                var synced_panel;

                if (synced_vol_id !== vol_id) {
                  synced_panel = synced_volume.display.getPanel(axis_name);
                  synced_panel.translateImage(drag_delta.dx, drag_delta.dy);
                }
              });
            }
          } else {
            panel.updateVolumePosition(pointer.x, pointer.y);
            var voxel = panel.cursorToVoxel(pointer.x, pointer.y);
            if (viewer.drawPolyline) {
              panel.dragAnchor = voxel;
            }
            volume.display.forEach(function(other_panel) {
              if (panel !== other_panel) {
                other_panel.updateSlice();
              }
            });

            if (viewer.synced){
              viewer.syncPosition(panel, volume, axis_name);
            }
          }

          drawPolylLineCallBack(pointer);
          panel.updated = true;
        }

        function mouseDrag(event) {
          if(event.target === current_target) {
            event.preventDefault();
            drag(panel.mouse, event.shiftKey);
          }
        }

        function touchDrag(event) {
          if(event.target === current_target) {
            event.preventDefault();
            drag(panel.touches[0], panel.touches.length === views.length);
          }
        }
        
        function mouseDragEnd(event) {
          event.preventDefault();
          document.removeEventListener("mousemove", mouseDrag, false);
          document.removeEventListener("mouseup", mouseDragEnd, false);
          var coords = viewer.volumes[viewer.volumes.length - 1].getWorldCoords();
          if (panel.anchor && viewer.drawPolyline) {
            var lastAnchor = panel.anchor[panel.anchor.length - 1];
            var voxel = panel.cursorToVoxel(panel.mouse.x, panel.mouse.y);
            var isSamePoint = lastAnchor.voxelX === voxel.voxelX && lastAnchor.voxelY === voxel.voxelY;
            if (!isSamePoint) {
              panel.anchor.push(voxel);
            }
            panel.dragAnchor = voxel;
            viewer.polylineWorldCoords.push(coords);
            drawPolylLineCallBack({ x: panel.mouse.x, y: panel.mouse.y });
          }
          if(viewer.drawLine) {
            var voxel = panel.cursorToVoxel(panel.mouse.x, panel.mouse.y);
            panel.dragAnchor = voxel;
            if (panel.anchor.length > 1 || panel.anchor.length === 0) {
              viewer.volumes.forEach(function(volume) {
                volume.display.forEach(function(panel) {
                  panel.anchor = [];
                });
              });
              panel.anchor = [voxel];
              viewer.lineWorldCoords = [coords];
            } else {
              panel.anchor.push(voxel);
              viewer.lineWorldCoords.push(coords);
              var anchor = panel.voxelToCursor(panel.anchor[0].voxelX, panel.anchor[0].voxelY);
              var length = calculationLine(anchor, {x: panel.mouse.x, y: panel.mouse.y}, panel);
              if (viewer.drawLineCallBack) {
                viewer.drawLineCallBack(viewer.lineWorldCoords, length);
              }
            }
          }
          current_target = null;
        }

        function touchDragEnd() {
          document.removeEventListener("touchmove", touchDrag, false);
          document.removeEventListener("touchend", touchDragEnd, false);
          viewer.volumes.forEach(function(volume) {
            volume.display.forEach(function(panel) {
              // panel.anchor = null;
            });
          });
          current_target = null;
        }

        function touchZoom(event) {
          var dx = panel.touches[0].x - panel.touches[1].x;
          var dy = panel.touches[0].y - panel.touches[1].y;

          var distance = Math.sqrt(dx * dx + dy * dy);
          var delta;

          event.preventDefault();

          if (last_touch_distance !== null) {
            delta = distance - last_touch_distance;

            zoom(delta * 0.2);
          }

          last_touch_distance = distance;
        }

        function touchZoomEnd() {
          document.removeEventListener("touchmove", touchZoom, false);
          document.removeEventListener("touchend", touchZoomEnd, false);

          last_touch_distance = null;
        }

        function canvasMousedown (event) {
          panel.isDrawPoints = viewer.isDrawPoints;
          event.preventDefault();

          current_target = event.target;
          
          if (viewer.active_panel) {
            viewer.active_panel.updated = true;
          }
          viewer.active_panel = panel;
          document.addEventListener("mousemove", mouseDrag , false);
          document.addEventListener("mouseup", mouseDragEnd, false);

          startDrag(panel.mouse, event.shiftKey, event.ctrlKey);
        }

        function canvasTouchstart (event) {
          event.preventDefault();

          current_target = event.target;

          if (viewer.active_panel) {
            viewer.active_panel.updated = true;
          }
          viewer.active_panel = panel;

          if (panel.touches.length === 2) {
            document.removeEventListener("touchmove", touchDrag, false);
            document.removeEventListener("touchend", touchDragEnd, false);
            document.addEventListener("touchmove", touchZoom, false);
            document.addEventListener("touchend", touchZoomEnd, false);
          } else {
            document.removeEventListener("touchmove", touchZoom, false);
            document.removeEventListener("touchend", touchZoomEnd, false);
            document.addEventListener("touchmove", touchDrag, false);
            document.addEventListener("touchend", touchDragEnd, false);

            startDrag(panel.touches[0], panel.touches.length === 3, true);
          }

        }
        
        function wheelHandler(event) {
          if (event.ctrlKey) {
            event.preventDefault();

            zoom(Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail))));
          }
        }

        function zoom(delta) {
          panel.zoom *= (delta < 0) ? 1/1.05 : 1.05;
          panel.zoom = Math.max(panel.zoom, 0.25);
          panel.updateVolumePosition();
          panel.updateSlice();

          if (viewer.synced){
            viewer.volumes.forEach(function(synced_volume, synced_vol_id) {
              var synced_panel = synced_volume.display.getPanel(axis_name);

              if (synced_vol_id !== vol_id) {
                synced_panel.zoom = panel.zoom;
                synced_panel.updateVolumePosition();
                synced_panel.updateSlice();
              }
            });
          }
        }

        function calculationLine(start, end, panel) {
          var  dx = (start.x - end.x) / panel.zoom;
          var  dy = (start.y - end.y) / panel.zoom;

          return Math.sqrt(dx * dx + dy * dy);
        }

        function drawPolylLineCallBack(pointer) {
          if (viewer.drawPolyline && panel.anchor) {
            var allLength = 0;
            for (var i = 0; i < panel.anchor.length; i++) {
              var endpoint = i === panel.anchor.length - 1 ? {x: pointer.x, y: pointer.y} : panel.voxelToCursor(panel.anchor[i+1].voxelX, panel.anchor[i+1].voxelY);
              var anchor = panel.voxelToCursor(panel.anchor[i].voxelX, panel.anchor[i].voxelY);
              allLength += calculationLine(anchor, endpoint, panel);
            }
            if (viewer.drawLineCallBack) {
              if (viewer.polylineWorldCoords.length !== panel.anchor.length) {
                viewer.polylineWorldCoords = viewer.polylineWorldCoords.slice(viewer.polylineWorldCoords.length -  panel.anchor.length);
              }
              viewer.drawLineCallBack(viewer.polylineWorldCoords, allLength);
            }
          }
        }


        canvas.addEventListener("mousedown", canvasMousedown, false);
        canvas.addEventListener("touchstart", canvasTouchstart, false);
        canvas.addEventListener("mousewheel", wheelHandler, false);
        canvas.addEventListener("wheel", wheelHandler, false);
        canvas.addEventListener("DOMMouseScroll", wheelHandler, false); // Dammit Firefox
        
        canvas.clearAllListeners = function () {
          canvas.removeEventListener('mousedown', canvasMousedown, false);
          canvas.removeEventListener('touchstart', canvasTouchstart, false);
          canvas.removeEventListener('mousewheel', wheelHandler, false);
          canvas.removeEventListener('wheel', wheelHandler, false);
          canvas.removeEventListener('DOMMouseScroll', wheelHandler, false);
          document.removeEventListener("touchmove", touchDrag, false);
          document.removeEventListener("touchend", touchDragEnd, false);
          document.removeEventListener("touchmove", touchZoom, false);
          document.removeEventListener("touchend", touchZoomEnd, false);
          document.removeEventListener("mousemove", mouseDrag, false);
          document.removeEventListener("mouseup", mouseDragEnd, false);
        }
      });
    })();

    viewer.containers[vol_id] = container;

    /* See if a subsequent volume has already been loaded. If so we want
     * to be sure that this container is inserted before the subsequent
     * container. This guarantees the ordering of elements.
     */
    var containers = viewer.containers;
    var next_id;
    for (next_id = vol_id + 1; next_id < containers.length; next_id++) {
      if (next_id in containers) {
        if (volume_description.show_volume !== false) {
          try {
            dom_element.insertBefore(container, containers[next_id]);
          } catch (e) {
            console.error('Volume Viewer Loading.js insertBefore Error', e);
          }
        }
        break;
      }
    }
    if (next_id === containers.length) {
      if (volume_description.show_volume !== false) {
        try {
          dom_element.appendChild(container);
        } catch (e) {
          console.error('Volume Viewer Loading.js appendChild Error', e);
        }
      }
    }
    viewer.triggerEvent("volumeuiloaded", {
      container: container,
      volume: volume,
      volume_id: vol_id
    });

    return display;
  }
};
