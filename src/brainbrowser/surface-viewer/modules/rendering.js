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
* Author: Paul Mougel
* Author: Lindsay Lewis <lindsayblewis@gmail.com>
* Author: Natacha Beck <natabeck@gmail.com>
*/

import {
  MeshLine,
  MeshLineMaterial,
  MeshLineRaycast
} from '../lib/THREE.MeshLine';

let rendererCache;

BrainBrowser.SurfaceViewer.modules.rendering = function(viewer) {
  "use strict";

  if (!viewer.dom_element) {
    // reset dom element for rending async cause js error
    viewer.dom_element = document.createElement('div');
  }

  const isSafari= /Apple/.test(navigator.userAgent);

  let renderer;
  var THREE = BrainBrowser.SurfaceViewer.THREE;
  if(!rendererCache || viewer.moreSurf || isSafari) {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: true,
      autoClear: false,
    });
    rendererCache = renderer;
  } else {
    renderer = rendererCache;
  }

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(30, viewer.dom_element.offsetWidth / viewer.dom_element.offsetHeight, 1, 3000);
  var default_camera_distance = 500;
  var light = new THREE.PointLight(0xFFFFFF);
  var current_frame;
  var last_frame;
  var effect = renderer;
  var effects = {};
  var canvas = renderer.domElement;
  var old_zoom_level;

  viewer.model = new THREE.Object3D();

  scene.add(viewer.model);

  /**
  * @doc function
  * @name viewer.rendering:render
  * @description
  * Start the render loop.
  * ```js
  * viewer.render();
  * ```
  */
  viewer.lineMode = false;
  viewer.polyLineMode = false;
  viewer.polyLinePoints = [];
  viewer.isFs4 = false;
  viewer.render = function() {
    var dom_element = viewer.dom_element;
    renderer.setClearColor(0x000000);
    dom_element.appendChild(renderer.domElement);
    camera.position.z = default_camera_distance;
    light.position.set(0, 0, default_camera_distance);
    scene.add(light);
    viewer.updateViewport();
    renderFrame();
  };

  viewer.checkIsWinAndDesk = function () {
    const agent = navigator.userAgent.toLowerCase();
    const isWin = agent.indexOf("win32") >= 0 ||
      agent.indexOf("wow32") >= 0 ||
      agent.indexOf("win64") >= 0 ||
      agent.indexOf("wow64") >= 0;
    const isDesk = typeof global !== 'undefined';

    return isWin && isDesk;
  };

  viewer.clearCachedWebgl = function () {
    viewer.clearAllListeners && viewer.clearAllListeners();
    viewer.model_data && viewer.model_data.clear();
    if (viewer.model && viewer.model.children) {
      viewer.model.children = [];
    }
    
    // const isWinAndDesk = viewer.checkIsWinAndDesk();
    // if (isWinAndDesk) return;
    renderer.clear();
    renderer.dispose();
  };

  /**
   * @doc function
   * @name viewer.rendering:updateViewport
   * @description
   * Update the viewport size and aspect ratio to fit
   * the current size of the viewer DOM element.
   * ```js
   * viewer.updateViewport();
   * ```
   */
  viewer.updateViewport = function(height, widht) {
    var dom_element = viewer.dom_element;
    effect.setSize(widht || dom_element.offsetWidth, height || dom_element.offsetHeight);
    camera.aspect = dom_element.offsetWidth / dom_element.offsetHeight;
    camera.updateProjectionMatrix();

    viewer.updated = true;
  };

  /**
   * @doc function
   * @name viewer.rendering:canvasDataURL
   * @returns {string} The data URL.
   * @description
   * Returns the Data URL of the canvas the viewer is using
   * so it can be used to create an image.
   * ```js
   * viewer.canvasDataURL();
   * ```
   */
  viewer.canvasDataURL = function() {
    return renderer.domElement.toDataURL();
  };

  /**
   * @doc function
   * @name viewer.rendering:addEffect
   * @param {string} effect_name The name of the effect as defined in three.js.
   * @description
   * Add a three.js postprocessing effect to the viewer.
   * ```js
   * viewer.addEffect("AnaglyphEffect");
   * ```
   */
  viewer.addEffect = function(effect_name) {
    var effect;
    if (BrainBrowser.utils.isFunction(THREE[effect_name])) {
      effect = new THREE[effect_name](renderer);
      effect.setSize(viewer.dom_element.offsetWidth, viewer.dom_element.offsetHeight);

      effects[effect_name] = effect;
    }
  };

  /**
  * @doc function
  * @name viewer.rendering:setEffect
  * @param {string} effect_name The name of the effect as defined in three.js.
  * @description
  * Activate a previously added postprocessing effect.
  * ```js
  * viewer.setEffect("AnaglyphEffect");
  * ```
  */
  viewer.setEffect = function(effect_name) {
    effect = effects[effect_name] ? effects[effect_name] : renderer;
    effect.setSize(viewer.dom_element.offsetWidth, viewer.dom_element.offsetHeight);
    effect.render(scene, camera);  // Not sure why: effects seem to need to render twice before they work properly.

    viewer.updated = true;
  };

  /**
  * @doc function
  * @name viewer.rendering:setCameraPosition
  * @param {number} x The x coordinate of the camera.
  * @param {number} y The y coordinate of the camera.
  * @param {number} z The z coordinate of the camera.
  * @description
  * Set the camera position.
  * ```js
  * viewer.setCameraPosition(10, 25, 12);
  * ```
  */
  viewer.setCameraPosition = function(x, y, z) {
    camera.position.set(x, y, z);
    light.position.set(x, y, z);

    viewer.updated = true;
  };

  /**
  * @doc function
  * @name viewer.rendering:getCameraPosition
  * @description
  * Get the camera position.
  * ```js
  * viewer.getCameraPosition();
  * ```
  */
  viewer.getCameraPosition = function() {
    return camera.position;
  };

  /**
  * @doc function
  * @name viewer.rendering:resetView
  * @description
  * Resets the view of the scene.
  * ```js
  * viewer.resetView();
  * ```
  */
  viewer.resetView = function() {
    var model = viewer.model;
    var inv   = new THREE.Matrix4();
    inv.getInverse(model.matrix);

    model.applyMatrix4(inv);
    camera.position.set(0, 0, default_camera_distance);
    light.position.set(0, 0, default_camera_distance);

    var offset = model.userData.model_center_offset || new THREE.Vector3(0,0,0);
    model.children.forEach(function(shape) {
      var centroid   = shape.userData.centroid;
      var recentered = shape.userData.recentered;

      // The check for original_data tells us
      // this is a loaded model, rather than
      // an annotation, etc.
      if (shape.userData.original_data) {
        shape.position.set(offset.x, offset.y, offset.z);
        shape.rotation.set(0, 0, 0);
        // shape.material.opacity = 1;
      }
    });

    model.rotation.set(0, 0, 0);
    viewer.zoom = 1;

    viewer.updated = true;
  };

  /**
  * @doc function
  * @name viewer.rendering:setClearColor
  * @param {number} color A hexadecimal number representing the RGB color to use.
  * @param {number} define the opacity.
  * @description
  * Updates the clear color of the viewer.
  * ```js
  * viewer.setClearColor(0xFF0000);
  * ```
  */
  viewer.setClearColor = function(color,alpha)  {
    if (alpha === undefined) alpha = 1;
    renderer.setClearColor(color, alpha);

    viewer.updated = true;
  };

  /**
  * @doc function
  * @name viewer.rendering:drawDot
  * @param {number} x The x coordinate.
  * @param {number} y The y coordinate.
  * @param {number} z The z coordinate.
  * @param {number} radius Radius of the sphere (default: 2).
  * @param {number} color Color of the sphere as a hexadecimal integer (default: 0xFF0000).
  *
  * @returns {object} The sphere itself.
  *
  * @description Draw a sphere in the current scene. Handy for debugging.
  * ```js
  * viewer.drawDot(10, 5, 15, 3, 0x00FF00);
  * ```
  */
  viewer.drawDot = function(x, y, z, radius, color) {
    radius = radius || 2;
    radius = radius >= 0 ? radius : 0;
    color  = color  >= 0 ? color  : 0xFF0000;

    var geometry = new THREE.SphereGeometry(2, 32, 32);
    var material = new THREE.MeshPhongMaterial({
      color: color,
      specular: 0xFFFFFF,
      shininess: 10,
    });

    var sphere   = new THREE.Mesh(geometry, material);
    sphere.name = 'Dot';
    if (viewer.model.children[0] && viewer.model.children[0].userData.recentered) {
      sphere.position.set(
        x - viewer.model.children[0].userData.centroid.x,
        y - viewer.model.children[0].userData.centroid.y,
        z - viewer.model.children[0].userData.centroid.z
      );
    } else {
      sphere.position.set(
        x,
        y,
        z
      );
    }

    if (viewer.model) {
      var offset     = viewer.model.userData.model_center_offset;
      if (offset !== undefined) {
        sphere.translateX(-offset.x);
        sphere.translateY(-offset.y + viewer.model.userData.centroid.y);
        sphere.translateZ(-offset.z + viewer.model.userData.centroid.z);
      }
      viewer.model.add(sphere);
    } else {
      scene.add(sphere);
    }

    viewer.updated = true;

    return sphere;

  };

  viewer.getDrawLinesStartEndPoint = function(startPoint, endPoint) {
    var centroidX = 0;
    var centroidY = 0;
    var centroidZ = 0;
    if (viewer.model.children[0]) {
      centroidX = viewer.model.children[0].userData.centroid.x;
      centroidY = viewer.model.children[0].userData.centroid.y;
      centroidZ = viewer.model.children[0].userData.centroid.z;
    }
    var start = new THREE.Vector3(startPoint.x - centroidX, startPoint.y - centroidY, startPoint.z - centroidZ);
    var end = new THREE.Vector3(endPoint.x - centroidX, endPoint.y - centroidY, endPoint.z - centroidZ);
    return {start: start, end: end};
  }

  viewer.customizedrawLines = function(startPoint, endPoint) {
    var point = viewer.getDrawLinesStartEndPoint(startPoint, endPoint);
    var children = [].concat(viewer.model.children);
    viewer.model.children = children.filter(child => child.name !== 'Line');
    viewer.drawLine(point.start, point.end, {
      color: 0xffffff,
    });
  };

  viewer.drawPolyLine = function(startPoint, endPoint) {
    var children = [].concat(viewer.model.children);
    viewer.model.children = children.filter(child => child.name !== 'Line');
    for (var i = 0; i < viewer.polyLinePoints.length; i++){
      var end = i === viewer.polyLinePoints.length - 1 ? endPoint : viewer.polyLinePoints[i + 1].point;
      var point = viewer.getDrawLinesStartEndPoint(viewer.polyLinePoints[i].point, end);
      viewer.drawLine(point.start, point.end, {
        color: 0xffffff,
      });
    }
  };

  /**
  * @doc function
  * @name viewer.rendering:drawGrid
  * @param {number} size The size of the grid.
  * @param {number} step The size of the step between 2 lines.
  * @param {object} options Options, which include the following:
  *
  * * **name** The name of the object.
  * * **color_center_line** The color of the centerline as a hexadecimal integer (default 0x444444).
  * * **color_grid** The color of the lines of the grid as a hexadecimal integer (default 0x888888).
  * * **x** The x coordinate (default: 0).
  * * **y** The y coordinate (default: 0).
  * * **z** The z coordinate (default: 0).
  * * **euler_rotation** The Euler angles to apply.
  *
  * @returns {object} The grid itself.
  *
  * @description Draw a Grid in the current scene.
  * ```js
  * var euler_rotation = new THREE.Euler( 0, 0, Math.PI/2, 'XYZ' );
  * viewer.drawGrid(100, 10, {euler_rotation: euler_rotation});
  * ```
  */
  viewer.drawGrid = function(size, step, options) {
    options               = options || {};
    var name              = options.name;
    var color_center_line = options.color_center_line;
    var color_grid        = options.color_grid;
    var x                 = options.x || 0;
    var y                 = options.y || 0;
    var z                 = options.z || 0;
    var euler_rotation    = options.euler_rotation;

    // Define default size and step
    if (size === undefined || size <= 0) { size = 200; }
    if (step === undefined || step <= 0) { step = 20; }

    // Define default colors
    color_center_line = color_center_line >= 0 ? color_center_line : 0x444444;
    color_grid        = color_grid        >= 0 ? color_grid        : 0x888888;

    // Create the grid
    var grid  = new THREE.GridHelper(size, step, color_center_line, color_grid);
    grid.name = name;
    grid.position.set(x,y,z);
    // Used euler_rotation only if present
    if ( euler_rotation !== undefined ) { grid.setRotationFromEuler(euler_rotation); }

    if (viewer.model) {
      viewer.model.add(grid);
    } else {
      scene.add(grid);
    }

    viewer.updated = true;

    return grid;
  };

  viewer.drawGridXYZ = function(grid_name, is_checked, options) {
    options               = options || {};
    var x                 = options.x || 0;
    var y                 = options.y || 0;
    var z                 = options.z || 0;
    var rotation = new THREE.Euler();
    var color_grid;
    var grid = viewer.model.getObjectByName(grid_name);
    if (grid !== undefined) {
      grid.visible   = is_checked;
      grid.position.set(x,y,z);
      viewer.updated = true;
      return;
    }
    if (!grid && !is_checked) {
      return;
    }
    if (grid_name === "gridX") {
      rotation.set(0, 0, Math.PI/2, "XYZ");
      color_grid = 0x00ff00;
    }
    if (grid_name === "gridY") {
      rotation.set(0, Math.PI/2, 0, "XYZ");
      color_grid = 0x0000ff;
    }
    if (grid_name === "gridZ") {
      rotation.set(Math.PI/2, 0, 0, "XYZ");
      color_grid = 0xff0000;
    }

    viewer.drawGrid(200, 20, {
      euler_rotation: rotation, name: grid_name, color_grid: color_grid,
      x:x,
      y:y,
      z:z,
    });
  };
  /**
  * @doc function
  * @name viewer.rendering:gridHelper
  * @param {number} horizontal_from where start the grid horizontally
  * @param {number} horizontal_to where end the grid horizontally
  * @param {number} x1 where horizontal vertices start
  * @param {number} x2 where horizontal vertices end
  * @param {object} horizontal_color a THREE color
  * @param {number} where start the grid vertically
  * @param {number} where end the grid vertically
  * @param {number} z1 where vertical vertices start
  * @param {number} z2 where horizontal vertices end
  * @param {object} vertical_color a THREE color
  * @param {number} step of the grid
  *
  * @returns {object} The grid itself.
  *
  * @description return an object that represent the grid.
  * ```js
  * var horizontal_color = new THREE.Color(0x000000);
  * var vertical_color   = new THREE.Color(0xFF0000);
  * var gridXY           = viewer.gridHelper( -100, 100, -100, 100, horizontal_color, -100, 100, 100, -100, vertical_color, 10)
  * ```
  *
  */
  viewer.gridHelper = function ( horizontal_from, horizontal_to, x1, x2, horizontal_color, vertical_from, vertical_to, z1, z2, vertical_color, step) {
    var geometry = new THREE.Geometry();
    var material = new THREE.LineBasicMaterial( { vertexColors: THREE.VertexColors } );

    var grid = Object.create( THREE.GridHelper.prototype );

    // Horizontal axes
    for ( var z = horizontal_from; z <= horizontal_to; z += step ) {
      geometry.vertices.push(
        new THREE.Vector3( x1, 0, z ),
        new THREE.Vector3( x2, 0, z )
      );
      geometry.colors.push( horizontal_color, horizontal_color );
    }

    // Vertical axes
    for ( var x = vertical_from; x <= vertical_to; x += step ) {
      geometry.vertices.push(
        new THREE.Vector3( x, 0, z1),
        new THREE.Vector3( x, 0, z2)
      );
      geometry.colors.push( vertical_color, vertical_color );
    }

    THREE.Line.call( grid, geometry, material, THREE.LineSegments );
    return grid;
  };

  /**
  * @doc function
  * @name viewer.rendering:drawLine
  * @param {object} start A Vector3, start of the line segment
  * @param {object} end A Vector3, end of the line segment
  * @param {object} options Options, which include the following:
  *
  * * **color** The color of the line as a hexadecimal integer (default 0x444444).
  * * **dashed** If true create a dashed line
  * * **draw**   If false don't draw the line
  *
  * @returns {object} The line itself.
  *
  * @description Draw a line in the current scene.
  * ```js
  * var start = new THREE.Vector3(0,0,0);
  * var end   = new THREE.Vector3(200,200,200);
  * viewer.drawLine(start, end, {dashed: true});
  * ```
  */
  viewer.drawLine = function( start, end, options ) {
    options      = options || {};
    var color    = options.color >= 0 ? options.color : 0x444444;
    // Create the geometry
    var geometry = new THREE.Geometry();
    geometry.vertices.push( start.clone() );
    geometry.vertices.push( end.clone() );
    var meshLine = new MeshLine();

    var material = new MeshLineMaterial({
      lineWidth: 1,
      color: color,
    });

    meshLine.setGeometry(geometry, p => 1);
    meshLine.name = options.geometryName;
    var mesh = new THREE.Mesh(meshLine, material);
    mesh.name = 'Line';
    mesh.raycast = MeshLineRaycast;
    if (options.draw === false) {return mesh;}

    if (viewer.model) {
      viewer.model.add(mesh);
    } else {
      scene.add(mesh);
    }

    // [start, end].forEach(point => {
    //   var sphereGeometry = new THREE.SphereGeometry( 0.5, 32, 32 );
    //   var sphereMaterial = new THREE.LineBasicMaterial({
    //     color
    //   });
    //   var sphere = new THREE.Mesh( sphereGeometry, sphereMaterial );
    //   sphere.position.set(point.x, point.y, point.z);
    //   sphere.name = 'Line';

    //   if (viewer.model) {
    //     viewer.model.add(sphere);
    //   } else {
    //     scene.add(sphere);
    //   }
    // });

    viewer.updated = true;

    return mesh;
  };

  viewer.drawTrajectory = function(start, end, options) {
    const { x: startX, y: startY, z: startZ } = start;
    const { x: endX, y: endY, z: endZ } = end;
    const gapX = endX - startX;
    const gapY = endY - startY;
    const gapZ = endZ - startZ;

    const m = Math.sqrt(
        Math.pow(endX - startX, 2) +
        Math.pow(endY - startY, 2) +
        Math.pow(endZ - startZ, 2))

    const k = 60 / m;
    const x = endX + gapX * k;
    const y = endY + gapY * k;
    const z = endZ + gapZ * k;

    var startVector = new THREE.Vector3(start.x, start.y, start.z);
    var endVector = new THREE.Vector3(x, y, z);
    viewer.drawLine(startVector, endVector, options);
  };

  viewer.drawSticksLine = function( start, end, options ) {
    options      = options || {};

    const lineLength = Math.sqrt(
        Math.pow(start.x - end.x, 2) +
        Math.pow(start.y - end.y, 2) +
        Math.pow(start.z - end.z, 2)
    );
    const lineMulti = 4 / (lineLength - 4);
    const verticePoint = {
      x: (end.x - start.x) * lineMulti,
      y: (end.y - start.y) * lineMulti,
      z: (end.z - start.z) * lineMulti,
    };
    const points = [start];
    while (true) {
      if (points.length - 1 >= (1 / lineMulti)) break;
      const prevPoint = points[points.length - 1];
      const nextPoint = {
        x: prevPoint.x + verticePoint.x,
        y: prevPoint.y + verticePoint.y,
        z: prevPoint.z + verticePoint.z,
      };
      points.push(nextPoint);

    }
    points.push(end);
    points.forEach(point => {
      var sphereGeometry = new THREE.SphereGeometry( 2, 32, 32 );
      var sphereMaterial = new THREE.MeshPhongMaterial({
        color: 0xff6666
      });
      var sphere = new THREE.Mesh( sphereGeometry, sphereMaterial );
      sphere.position.set(point.x, point.y, point.z);
      sphere.name = 'SticksLine';

      if (viewer.model) {
        viewer.model.add(sphere);
      } else {
        scene.add(sphere);
      }
    })

    viewer.updated = true;
  };

  viewer.highlightTrajectorys = function(geometryName) {
    viewer.model.children.forEach(function(obj) {
      if (obj.name === 'Line') {
        if (geometryName === obj.geometry.name){
          obj.material.color = new THREE.Color(0xffffff);
          obj.material.needsUpdate = true;
        }else {
          obj.material.color = new THREE.Color(0x444444);
          obj.material.needsUpdate = true;
        }
      }
    });
    viewer.updated = true;
  };

  /**
  * @doc function
  * @name viewer.rendering:drawAxes
  * @param {number} size Define the size of the line representing the axes.
  * @param {object} options Options, which include the following:
  *
  * * **name** The name of the axes
  * * **center** A Vector3, that represent the orgin of the axes
  * * **x_color** The color of the line as a hexadecimal integer (default 0xff0000).
  * * **y_color** The color of the line as a hexadecimal integer (default 0x00ff00).
  * * **z_color** The color of the line as a hexadecimal integer (default 0x0000ff).
  * * **complete** If true draw postive (plain) and negative axes (dashed)
  *
  *
  * @returns {object} The axes itself.
  *
  * @description
  * Draw Axes in the current scene
  * ```js
  *   viewer.drawAxes(300)
  * ```
  */
  viewer.drawAxes = function(size, options) {
    options      = options || {};
    var name     = options.name   || "axes";
    var center   = options.center || new THREE.Vector3(0,0,0);
    var x_color  = options.x_color >= 0 ? options.x_color : 0xff0000 ;
    var y_color  = options.y_color >= 0 ? options.y_color : 0x00ff00 ;
    var z_color  = options.z_color >= 0 ? options.z_color : 0x0000ff ;
    var complete = options.complete === true;

    // If size is not defined set a reasonable default value
    if (size === undefined) {
      var sizes = viewer.model_data.get().size;
      var max_size = Math.max(sizes.x, sizes.y, sizes.z);
      size = (max_size / 2) *  1.2;
    }

    var axes  = new THREE.Object3D();
    axes.name = name;

    // X axes
    axes.add(viewer.drawLine(center, new THREE.Vector3( center.x + size, center.y, center.z), {color: x_color, dashed: false, draw: false}));
    if (complete) { axes.add(viewer.drawLine(center, new THREE.Vector3(-size + center.x, center.y, center.z), {color: x_color, dashed: true , draw: false})); }

    // Y axes
    axes.add(viewer.drawLine(center, new THREE.Vector3(center.x, center.y + size, center.z), {color: y_color, dashed: false, draw: false}));
    if (complete) { axes.add(viewer.drawLine(center, new THREE.Vector3(center.x, -size + center.y, center.z), {color: y_color, dashed: true, draw: false})); }

    // Z axes
    axes.add(viewer.drawLine(center, new THREE.Vector3(center.x, center.y, center.z + size), {color: z_color, dashed: false, draw: false}));
    if (complete) { axes.add(viewer.drawLine(center, new THREE.Vector3(center.x, center.y, -size + center.z), {color: z_color, dashed: true,  draw: false})); }

    if (viewer.model) {
      viewer.model.add(axes);
    } else {
      scene.add(axes);
    }

    viewer.updated = true;

    return axes;
  };

  /**
  * @doc function
  * @name viewer.rendering:pick
  * @param {number} x The x coordinate on the canvas (defaults to current mouse position).
  * @param {number} y The y coordinate on the canvas (defaults to current mouse position).
  * @param {number} opacity_threshold ignore shape that have opacity lower than the opacity_threshold integer between 0 and 100,
  * @returns {object} If an intersection is detected, returns an object with the following information:
  *
  * * **object** The THREE.Object3D object with which the the click intersected.
  * * **point** A THREE.Vector3 object representing the point in 3D space at which the intersection occured.
  * * **index** The index of the intersection point in the list of vertices.
  *
  * Otherwise returns **null**.
  *
  * @description
  * Returns information about the displayed object
  * and a certain x and y on the canvas. Defaults to
  * the current mouse position.
  * ```js
  * viewer.pick();              // Pick at current mouse position.
  * viewer.pick(125, 250);      // Pick at given position.
  * viewer.pick(125, 250, 25);  // Pick at given position only if opacity of shape is >= to 25%.
  * ```
  */
  viewer.pick = function(x, y, opacity_threshold) {
    x = x === undefined ? viewer.mouse.x : x;
    y = y === undefined ? viewer.mouse.y : y;
    opacity_threshold = opacity_threshold === undefined ? 0.25 : (opacity_threshold / 100.0);

    if (!viewer.dom_element) return;

    // Convert to normalized device coordinates.

    x = (x / viewer.dom_element.offsetWidth) * 2 - 1;
    y = (-y / viewer.dom_element.offsetHeight) * 2 + 1;

    var model = viewer.model;
    var raycaster    = new THREE.Raycaster();
    var vector       = new THREE.Vector3(x, y, camera.near);
    var intersection = null;
    var intersects, vertex_data;
    var intersect_object, intersect_point, intersect_indices, intersect_face;
    var intersect_vertex_index, intersect_vertex_coords;
    var min_distance;
    var original_vertices, original_indices;
    var index, coords, distance;
    var i, count;
    var centroid, cx, cy, cz;
    // Because we're comparing against
    // the vertices in their original positions,
    // we have move everything to place the model at its
    // original position.
    var inv_matrix = new THREE.Matrix4();
    vector.unproject(camera);
    raycaster.set(camera.position, vector.sub(camera.position).normalize());
    intersects = raycaster.intersectObject(model, true);

    for (i = 0; i < intersects.length; i++) {
      intersects[i].object.userData.pick_ignore = (intersects[i].object.material.opacity < opacity_threshold);
      if (
          !intersects[i].object.userData.pick_ignore &&
          intersects[i].face &&
          intersects[i].object.userData.original_data
      ) {
        intersection = intersects[i];
        break;
      }
    }

    if (intersection !== null && intersection.face) {
      intersect_object = intersection.object;
      intersect_face = intersection.face;

      intersect_indices = intersect_face ? [
        intersect_face.a,
        intersect_face.b,
        intersect_face.c
      ] : [];

      if (intersect_object.userData.annotation_info) {
        vertex_data = {
          index: intersect_object.userData.annotation_info.vertex,
          point: intersect_object.userData.annotation_info.position,
          object: intersect_object
        };
      } else {
        // We're dealing with an imported model.

        if (intersect_object.userData.recentered) {
          // Objects have their origins centered
          // to help with transparency, so to check
          // check against original vertices we have
          // move them back.
          centroid = intersect_object.userData.centroid;
          cx = centroid.x;
          cy = centroid.y;
          cz = centroid.z;
        } else {
          cx = cy = cz = 0;
        }


        inv_matrix.getInverse(intersect_object.matrixWorld);
        intersect_point = intersection.point.applyMatrix4(inv_matrix);

        original_vertices = intersect_object.userData.original_data.vertices;
        original_indices = intersect_object.userData.original_data.indices;


        index = intersect_indices[0];
        if (!BrainBrowser.WEBGL_UINT_INDEX_ENABLED) {
          // Have to get the vertex pointed to by the original index because of
          // the de-indexing (see workers/deindex.worker.js)
          index = original_indices[index];
        }
        intersect_vertex_index = index;

        intersect_vertex_coords = new THREE.Vector3(
            original_vertices[index*3],
            original_vertices[index*3+1],
            original_vertices[index*3+2]
        );

        //Compensate for a translated center.
        min_distance = intersect_point.distanceTo(
            new THREE.Vector3(
                intersect_vertex_coords.x - cx,
                intersect_vertex_coords.y - cy,
                intersect_vertex_coords.z - cz
            )
        );

        for (i = 1, count = intersect_indices.length; i < count; i++) {
          index = intersect_indices[i];
          if (!BrainBrowser.WEBGL_UINT_INDEX_ENABLED) {
            // Have to get the vertex pointed to by the original index because of
            // the de-indexing (see workers/deindex.worker.js)
            index = original_indices[index];
          }
          coords = new THREE.Vector3(
              original_vertices[index*3],
              original_vertices[index*3+1],
              original_vertices[index*3+2]
          );
          distance = intersect_point.distanceTo(
              new THREE.Vector3(
                  coords.x - cx,
                  coords.y - cy,
                  coords.z - cz
              )
          );

          if (distance < min_distance) {
            intersect_vertex_index = index;
            intersect_vertex_coords = coords;
            min_distance = distance;
          }

        }

        vertex_data = {
          index: intersect_vertex_index,
          point: intersect_vertex_coords,
          object: intersect_object
        };
      }


    } else {
      vertex_data = null;
    }

    return vertex_data;
  };

  /**
  * @doc function
  * @name viewer.rendering:pickByVertex
  * @param {number} index Index of the vertex.
  * @param {object} options Options, which include the following:
  *
  * * **model_name**: if more than one model file has been loaded, refer to the appropriate
  * model using the **model_name** option.
  *
  * @returns {object} If an intersection is detected, returns an object with the following information:
  *
  * * **object** The THREE.Object3D object with which the the click intersected.
  * * **point** A THREE.Vector3 object representing the point in 3D space at which the intersection occured.
  * * **index** The index of the intersection point in the list of vertices.
  *
  * Otherwise returns **null**.
  *
  * @description
  *
  * ```js
  * viewer.pickByVertex(2356);
  * viewer.pickByVertex(2356, { model_name: "brain.obj" });
  * ```
  */
  viewer.pickByVertex = function(index, options) {
    var model = viewer.model;
    options   = options || {};

    if (index === undefined) {return null;}

    var vector = viewer.getVertex(index, {model_name: options.model_name});

    var intersect_object;
    var vertex_data;
    model.children.forEach(function(child) {
      if (Object.keys(child.userData).length === 0 && child.userData.constructor === Object) { return ; }
      if (Object.keys(child.userData).length !== 0 && child.userData.model_name !== options.model_name) { return ; }

      var vertices = child.geometry.index.array;
      var j;

      index = parseInt(index,0);
      for (j = 0; j < vertices.length; j++) {
        if (vertices[j] === index){
          intersect_object = child;
          vertex_data = {
            index: index,
            point: vector,
            object: intersect_object,
          };
          break;
        }
      }
    });
    return vertex_data;
  };

  viewer.reverseByVertexCoordstoPoint = function(x, y, z) {
    var p = new THREE.Vector3(x, y, z);
    p = p.applyMatrix4(viewer.model.matrixWorld);
    var vector = p.project(camera);
    var x = (vector.x + 1) / 2 * viewer.dom_element.offsetWidth;
    var y = -(vector.y - 1) / 2 * viewer.dom_element.offsetHeight;
    return { x: x,  y:y };
  };

  /**
  * @doc function
  * @name viewer.rendering:changeCenterRotation
  * @param {center} a Vector3 that indigate the new center
  *
  * @description
  * Use to change center of rotation.
  *
  *
  * ```js
  * viewer.changeCenterRotation(center);
  * ```
  */
  viewer.changeCenterRotation = function(center) {
    var offset     = new THREE.Vector3(0 , 0, 0);
    // Copy the center into offset, in order to keep center intact
    // we do not want to manipulate center
    offset.copy(center);
    var model      = viewer.model;

    // Adjust the offset value if needed (e.g: if the model was already moved)
    var offset_old = model.userData.model_center_offset || new THREE.Vector3(0,0,0);
    offset.x       = -offset_old.x - offset.x;
    offset.y       = -offset_old.y - offset.y;
    offset.z       = -offset_old.z - offset.z;
    offset.negate();

    /*
      Adjsut all the children.
    */

    // Translate to original place first then translate to new place
    model.children.forEach(function(children) {
      // Return if children was not part of the original model (e.g: axes and grid)
      if (Object.keys(children.userData).length === 0 && children.userData.constructor === Object) { return ; }
      children.translateX(offset_old.x - offset.x);
      children.translateY(offset_old.y - offset.y);
      children.translateZ(offset_old.z - offset.z);
    });

    /*
      Adjsut the parent (a.k.a: the scene)
    */

    // Unapply previous adjustment to scene position due to user manual rotation (this does nothing / has no effect before 1st rotation)
    var inverse_matrix = new THREE.Matrix4().getInverse(model.matrix);
    model.parent.position.applyMatrix4(inverse_matrix);

    // Translate the scene to original position
    model.parent.translateX(-offset_old.x);
    model.parent.translateY(-offset_old.y);
    model.parent.translateZ(-offset_old.z);

    // Compensate scene position for all offsets done to model above
    model.parent.translateX(offset.x);
    model.parent.translateY(offset.y);
    model.parent.translateZ(offset.z);

    // Reapply previous adjustment to scene position due to user manual rotation (this does nothing / has no effect before 1st rotation)
    inverse_matrix = new THREE.Matrix4().getInverse(model.matrix);
    model.parent.position.applyMatrix4(model.matrix);

    // Save offset information in userData
    viewer.model.userData.model_center_offset = offset;

    viewer.updated = true;
  };


  /**
  * @doc function
  * @name viewer.rendering:modelCentric
  *
  * @description
  * Use to recenter data when userData input is shifted in space.
  *
  *
  * ```js
  * viewer.modelCentric(true);
  * ```
  */
  viewer.modelCentric = function() {
    var model = viewer.model;
    viewer.findUserDataCentroid(model);
    var center = model.userData.model_center || new THREE.Vector3(0,0,0);

    // Set Camera position
    viewer.setCameraPosition(center.x,center.y,center.z);

    // Set center position
    viewer.changeCenterRotation(center);

    viewer.updated = true;
  };

  /**
  * @doc function
  * @name viewer.rendering:findUserDataCentroid
  * @param {object} a model.
  *
  * @description
  * Find centroid of the model (only take in account userData).
  *
  * @returns {object} The initial information with additionnal model_center argument.
  *
  * ```js
  * viewer.findUserDataCentroid(model);
  * ```
  */
  viewer.findUserDataCentroid = function(model) {
    // Calculate only if needed
    if (model.userData.model_center_offset !== undefined) {
      return;
    }

    // Calculate bounding box for all children given by the user
    // ignore other children
    var min_x, max_x, min_y, max_y, min_z, max_z;
    min_x = min_y = min_z = Number.POSITIVE_INFINITY;
    max_x = max_y = max_z = Number.NEGATIVE_INFINITY;

    model.children.forEach(function(children){
      var model_name    = children.userData.model_name;
      var model_data    = viewer.model_data.get(model_name);

      var children_name = children.name;
      model_data.shapes.forEach(function(shape){
        if (shape.name !== children_name) {
          return;
        }
        var bounding_box  = shape.bounding_box;

        // min
        min_x = Math.min(min_x, bounding_box.min_x);
        min_y = Math.min(min_y, bounding_box.min_y);
        min_z = Math.min(min_z, bounding_box.min_z);
        // max
        max_x = Math.max(max_x, bounding_box.max_x);
        max_y = Math.max(max_y, bounding_box.max_y);
        max_z = Math.max(max_z, bounding_box.max_z);
      });

      // centroid of all the model
      var centroid = new THREE.Vector3();
      centroid.x   =  min_x + (max_x - min_x) / 2;
      centroid.y   =  min_y + (max_y - min_y) / 2;
      centroid.z   =  min_z + (max_z - min_z) / 2;

      model.userData.model_center  = new THREE.Vector3(centroid.x, centroid.y, centroid.z);
    });
  };

  viewer.updateLineText = function(eleIdParam, eleNameParam) {
    let eleId = 'line-lenght-text-view';
    if(viewer.isFs4){
      eleId = 'line-length-text-view-fs4';
    }else if (eleIdParam){
      eleId = eleIdParam;
    }
    let eleName = 'polyLine-lenght-text-view';
    if(viewer.isFs4){
      eleName = 'polyLine-length-text-view-fs4';
    }else if (eleNameParam){
      eleName = eleNameParam;
    }
    var ele = document.getElementById(eleId);
    var eles = document.getElementsByClassName(eleName);
    var update = function(element) {
      var startVector3 = element.getAttribute('startVector3').split(',');
      var endVector3 = element.getAttribute('endVector3').split(',');
      var centroidX = 0;
      var centroidY = 0;
      var centroidZ = 0;
      if (viewer.model.children[0]) {
        centroidX = viewer.model.children[0].userData.centroid.x;
        centroidY = viewer.model.children[0].userData.centroid.y;
        centroidZ = viewer.model.children[0].userData.centroid.z;
      }
      var start = viewer.reverseByVertexCoordstoPoint(startVector3[0] - centroidX, startVector3[1] - centroidY, startVector3[2] - centroidZ);
      var end = viewer.reverseByVertexCoordstoPoint(endVector3[0] - centroidX, endVector3[1] - centroidY, endVector3[2] - centroidZ);
      var point = lineTextPoint(start, end);
      if (point.top !== 0) {
        element.style.top = point.top + 'px';
      }
      if (point.left !== 0) {
        element.style.left = point.left + 'px';
      }
    };
    if (ele) {
      update(ele);
    }
    if (eles && eles.length > 0) {
      for(var i = 0; i < eles.length; i++) {
        update(eles[i]);
      }
    }
  };

  viewer.clearLines = function() {
    var children = [].concat(viewer.model.children);
    var newChildren = children.filter(function(obj) {
      return (obj.name !== 'Line' && obj.name !== 'Dot');
    });
    viewer.model.children = newChildren;
    var ele = document.getElementById('line-lenght-text-view');
    if (ele) {
      viewer.dom_element.removeChild(ele);
    }
    var eles = document.getElementsByClassName('polyLine-lenght-text-view');
    if (eles && eles.length > 0) {
      for(var i = eles.length - 1; i >= 0; i--) {
        eles[i].textContent = '';
        viewer.dom_element.removeChild(eles[i]);
      }
    }
    viewer.updated = true;
  };

  viewer.clearFs4Line = function() {
    var children = [].concat(viewer.model.children);
    var newChildren = children.filter(function(obj) {
      return (obj.name !== 'Line' && obj.name !== 'Dot');
    });
    viewer.model.children = newChildren;
    var eleFs4 = document.getElementById('line-length-text-view-fs4');
    if (eleFs4) {
      viewer.dom_element.removeChild(eleFs4);
    }
    var elesPloyFs4 = document.getElementsByClassName('polyLine-length-text-view-fs4');
    if (elesPloyFs4 && elesPloyFs4.length > 0) {
      for(var i = elesPloyFs4.length - 1; i >= 0; i--) {
        elesPloyFs4[i].textContent = '';
        viewer.dom_element.removeChild(elesPloyFs4[i]);
      }
    }
    viewer.updated = true;
  }


  viewer.insertDom = function(startPoint, endPoint, lineLenght) {
    var textPoint = lineTextPoint(startPoint, endPoint);
    var top = textPoint.top;
    var left = textPoint.left;
    var startVector3 = '' + startPoint.point.x + ',' + startPoint.point.y + ',' + startPoint.point.z;
    var endVector3 = '' + endPoint.point.x + ',' + endPoint.point.y + ',' + endPoint.point.z;
    let eleId = 'line-lenght-text-view';
    if(viewer.isFs4){
      eleId = 'line-length-text-view-fs4';
    }

    var ele = document.getElementById(eleId);
    if (ele) {
      if (left !== 0) {
        ele.style.left = left + 'px';
      }
      if (top !== 0) {
        ele.style.top = top + 'px';
      }
      ele.style.color = 'white';
      ele.style.fontWeight = 900;
      ele.style.textShadow = '3px 0 black, 0 3px black, 3px 0 black, 0 3px black';
      ele.textContent = lineLenght + '(mm)';
      ele.setAttribute("endVector3", endVector3);
    } else {
      var el1 = document.createElement('div');
      var text = document.createTextNode(lineLenght + '(mm)');
      el1.style.height = '5px';
      el1.style.width = '5px';
      el1.style.fontWeight = 900;
      el1.style.position = 'absolute';
      if (left !== 0) {
        el1.style.left = left + 'px';
      }
      if (top !== 0) {
        el1.style.top = top + 'px';
      }
      el1.style.color = 'white';
      el1.style.textShadow = '3px 0 black, 0 3px black, 3px 0 black, 0 3px black';
      el1.id = eleId;
      el1.setAttribute("startVector3", startVector3);
      el1.setAttribute("endVector3", endVector3);
      viewer.dom_element.appendChild(el1);
      el1.appendChild(text);
    }

  }

  viewer.polyLineInsertDom = function (startPoint, endPoint, lineLenght) {
    var textPoint = lineTextPoint(startPoint, endPoint);
    var top = textPoint.top;
    var left = textPoint.left;
    var startVector3 = '' + startPoint.point.x + ',' + startPoint.point.y + ',' + startPoint.point.z;
    var endVector3 = '' + endPoint.point.x + ',' + endPoint.point.y + ',' + endPoint.point.z;

    let eleName = 'polyLine-lenght-text-view';
    if(viewer.isFs4){
      eleName = 'polyLine-length-text-view-fs4';
    }
    var eles = document.getElementsByClassName(eleName);
    if (viewer.polyLinePoints.length > eles.length) {
      var el1 = document.createElement('div');
      var text = document.createTextNode(lineLenght + '(mm)');
      el1.style.height = '5px';
      el1.style.width = '5px';
      el1.style.position = 'absolute';
      if (left !== 0) {
        el1.style.left = left + 'px';
      }
      if (top !== 0) {
        el1.style.top = top + 'px';
      }
      el1.style.color = 'white';
      el1.className = eleName;
      el1.style.fontWeight = 900;
      el1.style.textShadow = '3px 0 black, 0 3px black, 3px 0 black, 0 3px black';
      el1.setAttribute("startVector3", startVector3);
      el1.setAttribute("endVector3", endVector3);
      viewer.dom_element.appendChild(el1);
      el1.appendChild(text);
    } else {
      var lastEle = eles[eles.length - 1];
      if (left !== 0) {
        lastEle.style.left = left + 'px';
      }
      if (top !== 0) {
        lastEle.style.top = top + 'px';
      }
      lastEle.style.color = 'white';
      lastEle.textContent = lineLenght + '(mm)';
      lastEle.style.fontWeight = 900;
      lastEle.setAttribute("startVector3", startVector3);
      lastEle.setAttribute("endVector3", endVector3);
    }

  }

  ////////////////////////////////////
  // PRIVATE FUNCTIONS
  ////////////////////////////////////

  // Render a single frame on the viewer.
  function renderFrame(timestamp) {
    var model = viewer.model;
    var delta;
    var rotation;
    var position = camera.position;
    var new_z    = default_camera_distance / viewer.zoom;

    viewer.requestAnimationFrame = window.requestAnimationFrame(renderFrame);

    last_frame = current_frame || timestamp;
    current_frame = timestamp;

    delta = current_frame - last_frame;
    rotation = delta * 0.00015 * viewer.rotate_speed;

    if (viewer.autorotate.x) {
      model.rotation.x += rotation;
      viewer.updated = true;
    }
    if (viewer.autorotate.y) {
      model.rotation.y += rotation;
      viewer.updated = true;
    }
    if (viewer.autorotate.z) {
      model.rotation.z += rotation;
      viewer.updated = true;
    }
    if (old_zoom_level !== viewer.zoom) {
      old_zoom_level = viewer.zoom;
      viewer.updated = true;
      viewer.triggerEvent("zoom", { zoom: viewer.zoom });
    }

    if (viewer.updated) {
      if (new_z > camera.near && new_z < 0.9 * camera.far) {
        position.z = new_z;
        light.position.z = new_z;
      }
      effect.render(scene, camera);
      viewer.triggerEvent("draw", {
        renderer: effect,
        scene: scene,
        camera: camera
      });
      viewer.updated = false;
    }
  }

  ////////////////////////////////
  // CONTROLS
  ////////////////////////////////

  var lineTextPoint = function(startPoint, endPoint) {
    var left = 0;
    var top = 0;
    if (startPoint.x - endPoint.x > 0) {
      left = startPoint.x - (startPoint.x - endPoint.x) / 2;
    }else {
      left = endPoint.x - (endPoint.x - startPoint.x) / 2;
    }

    if (endPoint.y - startPoint.y > 0) {
      top = endPoint.y - (endPoint.y - startPoint.y) / 2;
    } else {
      top = startPoint.y - (startPoint.y - endPoint.y) / 2;
    }

    return { left: left, top: top };
  };

  var startVertexData = { point: { x: 0, y: 0, z:0 }, position2D: { x: 0, y: 0 }};
  var endPoinxyz; // x y z;
  var lineEndPosition2D;
  (function() {
    var model = viewer.model;
    var movement = "rotate";
    var last_x = null;
    var last_y = null;
    var last_touch_distance = null;

    function viewerClickCallBack() {
      if (viewer.clickCallBack) {
        viewer.clickCallBack();
      }
    }

    function drag(pointer, multiplier) {
      if (!pointer) {
        return;
      }
      var inverse = new THREE.Matrix4();
      var x       = pointer.x;
      var y       = pointer.y;
      var dx, dy;


      if (last_x !== null) {
        dx = x - last_x;
        dy = y - last_y;

        if (movement === "rotate") {

          // Want to always be rotating around world axes.
          inverse.getInverse(model.matrix);
          var axis = new THREE.Vector3(1, 0, 0).applyMatrix4(inverse).normalize();
          model.rotateOnAxis(axis, dy / 150);

          inverse.getInverse(model.matrix);
          axis = new THREE.Vector3(0, 1, 0).applyMatrix4(inverse).normalize();
          model.rotateOnAxis(axis, dx / 150);

          if (viewer.model_data.related_models !== undefined ) {
            viewer.model_data.related_models.forEach(function(child){
              child.rotation.x = model.rotation.x;
              child.rotation.y = model.rotation.y;
              child.rotation.z = model.rotation.z;
            });
          }
        } else {
          multiplier  = multiplier || 1.0;
          multiplier *= camera.position.z / default_camera_distance;

          camera.position.x -= dx * multiplier * 0.25;
          light.position.x  -= dx * multiplier * 0.25;
          camera.position.y += dy * multiplier * 0.25;
          light.position.y  += dy * multiplier * 0.25;
        }
      }
      last_x = x;
      last_y = y;
      viewerClickCallBack();
      viewer.updated = true;
    }

    function touchZoom() {
      var dx = viewer.touches[0].x - viewer.touches[1].x;
      var dy = viewer.touches[0].y - viewer.touches[1].y;

      var distance = Math.sqrt(dx * dx + dy * dy);
      var delta;

      if (last_touch_distance !== null) {
        delta = distance - last_touch_distance;

        viewer.zoom *= 1.0 + 0.01 * delta;
      }

      last_touch_distance = distance;
    }

    function mouseDrag(event) {
      viewer.moveFlag = true;
      event.preventDefault();
      if ((viewer.lineMode || viewer.polyLineMode) && startVertexData.point.x === 0 && startVertexData.point.y === 0 && startVertexData.point.z === 0) {
        return;
      }
      if (viewer.lineMode) {
        var obj = get3DPoint(event);
        if (!obj) {
          return;
        }
        var endPosition = { point: obj.vertex_data.point, x: obj.x, y: obj.y };
        var lineLenght = calculationLineWidth(startVertexData, obj.vertex_data);
        viewer.insertDom({x: startVertexData.position2D.x, y: startVertexData.position2D.y, point: startVertexData.point}, endPosition, lineLenght);
        viewer.customizedrawLines(startVertexData.point, obj.vertex_data.point);
        if (viewer.drawLineCallBack) {
          viewer.drawLineCallBack([startVertexData, obj.vertex_data], parseFloat(lineLenght),endPosition);
        }
      }
      if (viewer.polyLineMode) {
        var obj = get3DPoint(event);
        if (!obj) {
          return;
        }
        endPoinxyz = { point:  {x: obj.vertex_data.point.x, y: obj.vertex_data.point.y, z: obj.vertex_data.point.z}, position2D: { x: obj.x, y: obj.y }};
        var polyLinePoints = JSON.parse(JSON.stringify(viewer.polyLinePoints));
        var lastPolyLine = polyLinePoints[polyLinePoints.length - 1];
        viewer.drawPolyLine(lastPolyLine.point, obj.vertex_data.point);
        var lineLenght = calculationLineWidth(lastPolyLine, obj.vertex_data);
        viewer.polyLineInsertDom({x: lastPolyLine.position2D.x, y: lastPolyLine.position2D.y, point: lastPolyLine.point}, {point: obj.vertex_data.point, x: obj.x, y: obj.y}, lineLenght);
        if (viewer.drawLineCallBack) {
          var allpolyLines = [].concat(polyLinePoints);
          allpolyLines.push(obj.vertex_data);
          var allLength = 0;
          for(var i = 0; i < allpolyLines.length - 1; i ++) {
            allLength += parseFloat(calculationLineWidth(allpolyLines[i], allpolyLines[i + 1]));
          }
          viewer.drawLineCallBack(allpolyLines, allLength, obj);
        }
      }
      if (!viewer.lineMode && !viewer.polyLineMode) {
        drag(viewer.mouse, 1.1);
      }
      viewerClickCallBack();
    }

    function touchDrag(event) {
      event.preventDefault();
      if (movement === "zoom") {
        touchZoom();
      } else {
        drag(viewer.touches[0], 2);
      }
      viewerClickCallBack();
    }

    function mouseDragEnd() {
      viewer.moveFlag = false;
      document.removeEventListener("mousemove", mouseDrag, false);
      document.removeEventListener("mouseup", mouseDragEnd, false);
      last_x = null;
      last_y = null;
      viewerClickCallBack();
      if(viewer.polyLineMode && endPoinxyz) {
        viewer.polyLinePoints.push(JSON.parse(JSON.stringify(endPoinxyz)));
      }
    }

    function touchDragEnd() {
      document.removeEventListener("touchmove", touchDrag, false);
      document.removeEventListener("touchend", touchDragEnd, false);
      last_x = null;
      last_y = null;
      last_touch_distance = null;
      viewerClickCallBack();
    }

    function wheelHandler(event) {
      if (event.ctrlKey) {
        var delta = Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail)));
        event.preventDefault();
        viewer.zoom *= 1.0 + 0.02 * delta;
        if (viewer.zoomCallBack) {
          viewer.zoomCallBack(viewer.zoom);
        }
      }
    }

    canvas.addEventListener("mousedown", function(event) {
      var pick = viewer.pick();
      if (viewer.lineMode && pick) {
        startVertexData.point = pick.point;
        startVertexData.position2D = {x: viewer.mouse.x, y: viewer.mouse.y };
      }
      if (viewer.polyLineMode && pick) {
        startVertexData.point = { x: pick.point.x, y: pick.point.y, z: pick.point.z};
        startVertexData.position2D = {x: viewer.mouse.x, y: viewer.mouse.y };
        if (viewer.polyLinePoints.length === 0) {
          viewer.polyLinePoints.push(JSON.parse(JSON.stringify(startVertexData)));
        }
      }
      viewer.moveFlag = false;
      document.addEventListener("mousemove", mouseDrag, false);
      document.addEventListener("mouseup", mouseDragEnd, false);
      movement = event.which === 1 ? "rotate" : "translate" ;
    }, false);

    canvas.addEventListener("touchstart", function(event) {
      document.addEventListener("touchmove", touchDrag, false);
      document.addEventListener("touchend", touchDragEnd, false);
      movement = event.touches.length === 1 ? "rotate" :
          event.touches.length === 2 ? "zoom" :
              "translate";
    }, false);

    canvas.addEventListener("mousewheel", wheelHandler, false);
    // https://medium.com/@auchenberg/detecting-multi-touch-trackpad-gestures-in-javascript-a2505babb10e
    canvas.addEventListener("wheel", wheelHandler, false);
    canvas.addEventListener("DOMMouseScroll", wheelHandler, false); // Dammit Firefox

    canvas.addEventListener('contextmenu', function(event) {
      event.preventDefault();
    }, false);

    function get3DPoint(event) {
      var offset = BrainBrowser.utils.getOffset(renderer.domElement,  'surface-viewer');
      var x, y;
      if (event.pageX !== undefined) {
        x = event.pageX;
        y = event.pageY;
      } else {
        x = event.clientX + window.pageXOffset;
        y = event.clientY + window.pageYOffset;
      }

      var vertex_data = viewer.pick(x - offset.left, y - offset.top);
      if (vertex_data) {
        return { x: x - offset.left, y: y - offset.top, vertex_data: vertex_data };
      }else {
        return undefined;
      }
    }

    function calculationLineWidth(start, end) {
      var x = Math.pow(start.point.x - end.point.x, 2);
      var y = Math.pow(start.point.y - end.point.y, 2);
      var z = Math.pow(start.point.z - end.point.z, 2);
      var lineLenght =  Math.pow(x + y + z, 0.5);
      return parseFloat(lineLenght).toFixed(2);
    }

  })();

};



