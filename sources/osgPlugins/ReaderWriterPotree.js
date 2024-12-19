import P from 'bluebird';
import notify from 'osg/notify';
import Registry from 'osgDB/Registry';
import requestFile from'osgDB/requestFile';
import BinaryDecoder from'osgDB/BinaryDecoder';
import PagedLOD from'osg/PagedLOD';
import Geometry from'osg/Geometry';
import BufferArray from'osg/BufferArray';
import DrawArrays from'osg/DrawArrays';
import PrimitiveSet from'osg/primitiveSet';
import PointSizeAttribute from'osg/PointSizeAttribute';
import Light from'osg/Light';
import Node from'osg/Node';
import BoundingBox from'osg/BoundingBox';
import MatrixTransform from'osg/MatrixTransform';
import { vec3, mat4 } from 'osg/glMatrix';
var PointAttributeNames = {};

PointAttributeNames.POSITION_CARTESIAN = 0; // float x, y, z;
PointAttributeNames.COLOR_PACKED = 1; // byte r, g, b, a;     I = [0,1]
PointAttributeNames.COLOR_FLOATS_1 = 2; // float r, g, b;       I = [0,1]
PointAttributeNames.COLOR_FLOATS_255 = 3; // float r, g, b;       I = [0,255]
PointAttributeNames.NORMAL_FLOATS = 4; // float x, y, z;
PointAttributeNames.FILLER = 5;
PointAttributeNames.INTENSITY = 6;
PointAttributeNames.CLASSIFICATION = 7;
PointAttributeNames.NORMAL_SPHEREMAPPED = 8;
PointAttributeNames.NORMAL_OCT16 = 9;
PointAttributeNames.NORMAL = 10;

// For splat:
PointAttributeNames.RGBA = 11;
PointAttributeNames.SCALE = 12;
PointAttributeNames.ROTATION = 13;

// For float value shader usage, e.g. GSD:
PointAttributeNames.FLOAT_VALUE = 14;


var PointAttribute = function ( name, size, numElements ) {
    this.name = name;
    this.numElements = numElements;
    this.byteSize = this.numElements * size;
};

PointAttribute.POSITION_CARTESIAN = new PointAttribute( PointAttributeNames.POSITION_CARTESIAN, Float32Array.BYTES_PER_ELEMENT, 3 );
PointAttribute.RGBA_PACKED = new PointAttribute( PointAttributeNames.COLOR_PACKED, Int8Array.BYTES_PER_ELEMENT, 4 );
PointAttribute.COLOR_PACKED = PointAttribute.RGBA_PACKED;
PointAttribute.RGB_PACKED = new PointAttribute( PointAttributeNames.COLOR_PACKED, Int8Array.BYTES_PER_ELEMENT, 3 );
PointAttribute.NORMAL_FLOATS = new PointAttribute( PointAttributeNames.NORMAL_FLOATS, Float32Array.BYTES_PER_ELEMENT, 3 );
PointAttribute.FILLER_1B = new PointAttribute( PointAttributeNames.FILLER, Uint8Array.BYTES_PER_ELEMENT, 1 );
PointAttribute.INTENSITY = new PointAttribute( PointAttributeNames.INTENSITY, Uint16Array.BYTES_PER_ELEMENT, 1 );
PointAttribute.CLASSIFICATION = new PointAttribute( PointAttributeNames.CLASSIFICATION, Uint8Array.BYTES_PER_ELEMENT, 1 );
PointAttribute.NORMAL_SPHEREMAPPED = new PointAttribute( PointAttributeNames.NORMAL_SPHEREMAPPED, Uint8Array.BYTES_PER_ELEMENT, 2 );
PointAttribute.NORMAL_OCT16 = new PointAttribute( PointAttributeNames.NORMAL_OCT16, Uint8Array.BYTES_PER_ELEMENT, 2 );
PointAttribute.NORMAL = new PointAttribute( PointAttributeNames.NORMAL, Float32Array.BYTES_PER_ELEMENT, 3 );

// For splat:
PointAttribute.RGBA = PointAttribute.RGBA_PACKED;
PointAttribute.SCALE = new PointAttribute( PointAttributeNames.SCALE, Float32Array.BYTES_PER_ELEMENT, 3 );
PointAttribute.ROTATION = new PointAttribute( PointAttributeNames.ROTATION, Int8Array.BYTES_PER_ELEMENT, 4 );

// For float value shader usage, e.g. GSD:
PointAttribute.FLOAT_VALUE = new PointAttribute( PointAttributeNames.FLOAT_VALUE, Float32Array.BYTES_PER_ELEMENT, 1 );

var PointAttributes = function ( pointAttributes ) {
    this.attributes = [];
    this.byteSize = 0;
    this.size = 0;

    var pointAttributeNames = [];
    for ( var i = 0; i < pointAttributes.length; i++ ) {
        var pointAttributeName = pointAttributes[ i ];
        pointAttributeNames.push(pointAttributeName);
        var pointAttribute = PointAttribute[ pointAttributeName ];
        this.attributes.push( pointAttribute );
        this.byteSize += pointAttribute.byteSize;
        this.size++;
    }
    
    this.splat = (
      pointAttributeNames.indexOf('POSITION_CARTESIAN') > -1 &&
      pointAttributeNames.indexOf('RGBA') > -1 &&
      pointAttributeNames.indexOf('SCALE') > -1 &&
      pointAttributeNames.indexOf('ROTATION') > -1
    );
    
    this.hasFloatValue = (pointAttributeNames.indexOf('FLOAT_VALUE') > -1);
};

var PointCloudOctree = function () {
    this.version = undefined;
    this.spacing = 0;
    this.hierarchyStepSize = 0;
    this.pointAttributes = undefined;
    this.projection = undefined;
    this.boundingBox = undefined;
    this.offset = undefined;
    this.hierarchy = undefined;
    this.scale = 1.0;
};

var ReaderWriterPotree = function () {
    this._states = {};
};


ReaderWriterPotree.prototype = {

    _getState: function ( path = '' ) {
        for (const databasePath in this._states) {
            if (path.startsWith(databasePath)) {
                return this._states[databasePath];
            }
        }

        const state = {
            databasePath: path,
            pco: new PointCloudOctree(),
            binaryDecoder: new BinaryDecoder(),
            floatValueMinMax: [Number.MAX_VALUE, -Number.MAX_VALUE],
            splatCallback: undefined
        };
        this._states[path] = state;
        
        return state;
    },

    readNodeURL: function ( url, options ) {
        var defer = P.defer();
        
        const databasePath = (options && options.databasePath ? options.databasePath : '');
        const state = this._getState(databasePath);
        
        if ( options && options.splatCallback !== undefined ) {
            state.splatCallback = options.splatCallback;
        }

        var self = this;

        // remove the pseudoloader string
        url = url.substr( 0, url.lastIndexOf( '.' ) );
        var filePromise = requestFile( url );

        filePromise.then( function ( file ) {
            defer.resolve( self.readCloudFile( file, state ) );
        } ).catch( function ( err ) {
            defer.reject( err );
        } );
        return defer.promise;
    },
    readCloudFile: function ( file, state ) {
        var cloudJson = JSON.parse( file );
        
        state.databasePath += cloudJson.octreeDir + '/';
        state.pco.version = cloudJson.version;
        state.pco.spacing = cloudJson.spacing;
        state.pco.hierarchyStepSize = cloudJson.hierarchyStepSize;
        state.pco.pointAttributes = new PointAttributes(cloudJson.pointAttributes);
        state.pco.scale = cloudJson.scale;
        state.pco.boundingBox = new BoundingBox();
        state.pco.boundingBox.expandByVec3( vec3.fromValues( cloudJson.boundingBox.lx, cloudJson.boundingBox.ly, cloudJson.boundingBox.lz ) );
        state.pco.boundingBox.expandByVec3( vec3.fromValues( cloudJson.boundingBox.ux, cloudJson.boundingBox.uy, cloudJson.boundingBox.uz ) );
        state.pco.offset = [cloudJson.boundingBox.lx, cloudJson.boundingBox.ly, cloudJson.boundingBox.lz];
        var self = this;
        return this.readHierarchyFile( state ).then( function ( hrc ) {
            state.pco.hierarchy = hrc;
            return self.readRootTile( state );
        } );
    },

    readHierarchyFile: function ( state ) {
        var rootHrcUrl = state.databasePath + 'r/r.hrc';
        var self = this;
        return new P(function(resolve) {
            requestFile( rootHrcUrl, {
                responseType: 'arraybuffer'
            } ).then( function ( arrayBuffer ) {
                var nodes = {};
                self.readHierarchy( arrayBuffer, 'r', nodes, state );
                // Read sub-hierarchy folders
                var subPromises = [];
                for (let name in nodes) {
                    var node = nodes[name];
                    if (node.level >= state.pco.hierarchyStepSize) {
                        var subHrcUrl = state.databasePath + 'r/' + name.substr(1) + '/' + name + '.hrc';
                        var subFilePromise = requestFile( subHrcUrl, {
                            responseType: 'arraybuffer'
                        } );
                        subPromises.push(subFilePromise);
                        subFilePromise.then( function ( arrayBuffer ) {
                            var fromNum = Object.keys(nodes).length;
                            self.readHierarchy( arrayBuffer, name, nodes, state );
                        }.bind( name ) );
                    }            
                }

                P.all(subPromises).then(function() {
                    resolve(nodes);
                } );
            } );
        } );
    },


    readHierarchy: function ( bufferArray, hrcName, nodes, state ) {
        //var count = bufferArray.byteLength / 5;
        state.binaryDecoder.setBuffer( bufferArray );
        state.binaryDecoder.setLittleEndian( true );
        var stack = [];
        var children = state.binaryDecoder.getUint8Value();
        var numPoints = state.binaryDecoder.getUint32Value();
        stack.push( {
            children: children,
            numPoints: numPoints,
            name: hrcName
        } );
        var decoded = [];
        var i;

        while ( stack.length > 0 ) {
            var snode = stack.shift();
            var mask = 1;
            for ( i = 0; i < 8; i++ ) {
                if ( ( snode.children & mask ) !== 0 ) {
                    try {
                      var childName = snode.name + i;
                      var childChildren = state.binaryDecoder.getUint8Value();
                      var childNumPoints = state.binaryDecoder.getUint32Value();
                      stack.push( {
                          children: childChildren,
                          numPoints: childNumPoints,
                          name: childName
                      } );
                      decoded.push( {
                          children: childChildren,
                          numPoints: childNumPoints,
                          name: childName
                      } );
                    }
                    catch (err) {
                        console.warn(err);
                    }
                }
                mask = mask * 2;
            }
            if ( state.binaryDecoder.getOffset() === bufferArray.byteLength ) {
                break;
            }
        }

        if (nodes.numPoints === undefined) {
            nodes.numPoints = numPoints;
        }
        
        if (hrcName === 'r') {
            var root = {};
            root.children = [];
            root.hasChildren = true;
            root.boundingBox = state.pco.boundingBox;

            // Make bbox local
            vec3.sub( root.boundingBox.getMax(), root.boundingBox.getMax(), root.boundingBox.getMin() );
            root.boundingBox.setMin( vec3.ZERO );
            nodes[ 'r' ] = root;
        }

        for ( i = 0; i < decoded.length; i++ ) {
            var name = decoded[ i ].name;
            //     var numPoints = decoded[i].numPoints;
            var index = parseInt( name.charAt( name.length - 1 ) );
            var parentName = name.substring( 0, name.length - 1 );
            var parentNode = nodes[ parentName ];
            var level = name.length - 1;
            var currentNode = {};

            // var currentNode = new Potree.PointCloudOctreeGeometryNode(name, pco, boundingBox);
            currentNode.name = name;
            currentNode.level = level;
            currentNode.numPoints = numPoints;
            currentNode.boundingBox = this.createChildAABB( parentNode.boundingBox, index );
            currentNode.hasChildren = decoded[ i ].children > 0;
            if ( currentNode.hasChildren )
                currentNode.children = [];
            // currentNode.spacing = pco.spacing / Math.pow(2, level);
            parentNode.children.push( currentNode );
            nodes[ name ] = currentNode;
        }

        // node.loadPoints();
    },

    createChildAABB: function ( aabb, childIndex ) {
        var min = aabb.getMin();
        var max = aabb.getMax();
        var vec = vec3.sub( vec3.create(), max, min );

        var dHalfLength = vec3.scale( vec, vec, 0.5 );
        var xHalfLength = vec3.fromValues( vec[ 0 ], 0.0, 0.0 );
        var yHalfLength = vec3.fromValues( 0.0, vec[ 1 ], 0.0 );
        var zHalfLength = vec3.fromValues( 0.0, 0.0, vec[ 2 ] );

        var cmin = vec3.copy( vec3.create(), min );
        var cmax = vec3.add( vec3.create(), min, dHalfLength );

        if ( childIndex === 1 ) {
            vec3.add( cmin, cmin, zHalfLength );
            vec3.add( cmax, cmax, zHalfLength );
        } else if ( childIndex === 3 ) {
            vec3.add( cmin, vec3.add( cmin, cmin, zHalfLength ), yHalfLength );
            vec3.add( cmax, vec3.add( cmax, cmax, zHalfLength ), yHalfLength );
        } else if ( childIndex === 2 ) {
            vec3.add( cmin, cmin, yHalfLength );
            vec3.add( cmax, cmax, yHalfLength );
        } else if ( childIndex === 5 ) {
            vec3.add( cmin, vec3.add( cmin, cmin, zHalfLength ), xHalfLength );
            vec3.add( cmax, vec3.add( cmax, cmax, zHalfLength ), xHalfLength );
        } else if ( childIndex === 7 ) {
            vec3.add( cmin, cmin, dHalfLength );
            vec3.add( cmax, cmax, dHalfLength );
        } else if ( childIndex === 4 ) {
            vec3.add( cmin, cmin, xHalfLength );
            vec3.add( cmax, cmax, xHalfLength );
        } else if ( childIndex === 6 ) {
            vec3.add( cmin, vec3.add( cmin, cmin, xHalfLength ), yHalfLength );
            vec3.add( cmax, vec3.add( cmax, cmax, xHalfLength ), yHalfLength );
        }
        var bBox = new BoundingBox();
        bBox.setMin( cmin );
        bBox.setMax( cmax );
        return bBox;
    },



    readRootTile: function ( state ) {
        var rootTile = new PagedLOD();
        rootTile.setDatabasePath( state.databasePath );
        rootTile.setName( 'r' );
        rootTile.setRangeMode( PagedLOD.PIXEL_SIZE_ON_SCREEN );
        var ss = rootTile.getOrCreateStateSet();
        var pointSizeAttr = new PointSizeAttribute( false );
        pointSizeAttr.setCircleShape( true );
        pointSizeAttr.setPointSize( 5.0 );
        for (let i = 0; i < 8; ++i) {
          ss.setAttributeAndModes( new Light( i, true ) );
        }
        
        ss.setAttributeAndModes( pointSizeAttr );
        
        // potree root tile
        var rootUrl = state.databasePath + 'r/r.bin';
        var filePromise = requestFile( rootUrl, {
            responseType: 'arraybuffer'
        } );
        var self = this;
        return filePromise.then( function ( arrayBuffer ) {
            var geometry = self.readTileGeometry( arrayBuffer, rootTile.getName(), state );
            if (geometry) {
                // For now
                rootTile.addChild( geometry, 0, Number.MAX_VALUE );
                // Is it a leaf node?
                rootTile.setFunction( 1, self.readChildrenTiles.bind( self, state ) );
                rootTile.setRange( 1, 250000, Number.MAX_VALUE );

                var rootTransform = new MatrixTransform();
                rootTransform.addChild(rootTile);
                
                var offsetMatrix = mat4.create();
                mat4.fromTranslation(offsetMatrix, state.pco.offset);
                rootTransform.setMatrix(offsetMatrix);
                
                // Monkey-patch min/max float value on to root transform
                rootTransform.floatValueMinMax = state.floatValueMinMax;
                
                return rootTransform;
            }
        } );
    },


    readChildrenTiles: function ( state, parent ) {
        var defer = P.defer();
        var numChilds = 0;
        var group = new Node();
        var createTile = function ( tileLOD, rw, level ) {
            var folder = ( level >= state.pco.hierarchyStepSize ? tileLOD.getName().substr( 1, state.pco.hierarchyStepSize ) + '/' : '' );
            var tileurl = tileLOD.getDatabasePath() + 'r/' + folder + tileLOD.getName() + '.bin';
            requestFile( tileurl, {
                responseType: 'arraybuffer'
            } ).then( function ( bufferArray ) {
                var rangeMin = 250000;
                var child = rw.readTileGeometry( bufferArray, tileLOD.getName(), state );
                if (child) {
                  tileLOD.addChild( child, 0, Number.MAX_VALUE );
                  if ( state.pco.hierarchy[ tileLOD.getName() ].hasChildren ) {
                      tileLOD.setFunction( 1, rw.readChildrenTiles.bind( rw, state ) );
                      tileLOD.setRange( 1, rangeMin, Number.MAX_VALUE );
                  }
                }
                
                const bbox = state.pco.hierarchy[tileLOD.getName()].boundingBox;
                const bboxCenter = vec3.create();
                bbox.center(bboxCenter);
                tileLOD.setCenter(bboxCenter);
                tileLOD.setRadius(bbox.radius());
                
                numChilds--;
                if ( numChilds <= 0 )
                    defer.resolve( group );
            } );
        };

        var children = state.pco.hierarchy[ parent.getName() ].children;
        numChilds = children.length;
        if (numChilds === 0) {
            defer.resolve( group );
        }
        for ( var i = 0; i < numChilds; i++ ) {
            var tileLOD = new PagedLOD();
            tileLOD.setRangeMode( PagedLOD.PIXEL_SIZE_ON_SCREEN );
            tileLOD.setName( children[ i ].name );
            tileLOD.setDatabasePath( parent.getDatabasePath() );
            createTile( tileLOD, this, children[ i ].level );
            group.addChild( tileLOD );
        }
        return defer.promise;
    },

    readTileGeometry: function ( bufferArray, name, state ) {
        try {
            var bbox = state.pco.hierarchy[ name ].boundingBox;
            state.binaryDecoder.setBuffer( bufferArray );
            state.binaryDecoder.setLittleEndian( true );
            var numPoints = bufferArray.byteLength / state.pco.pointAttributes.byteSize;
            notify.log( 'Tile numPoints:' + numPoints );
            var min = bbox.getMin();
            var verticesUint = new Uint32Array( state.binaryDecoder.decodeUint32Interleaved( numPoints, 0, state.pco.pointAttributes.byteSize, 3 ).buffer );
            var vertices = new Float32Array( numPoints * 3 );
            for ( var i = 0; i < numPoints; i++ ) {
                if (verticesUint[ i * 3 ] === undefined || verticesUint[ i * 3 + 1 ] === undefined || verticesUint[ i * 3 + 2 ] === undefined) {
                    continue;
                }
                vertices[ i * 3 ] = verticesUint[ i * 3 ] * state.pco.scale + min[ 0 ];
                vertices[ i * 3 + 1 ] = verticesUint[ i * 3 + 1 ] * state.pco.scale + min[ 1 ];
                vertices[ i * 3 + 2 ] = verticesUint[ i * 3 + 2 ] * state.pco.scale + min[ 2 ];
            }

            var geometry = undefined;
            if (state.pco.pointAttributes.splat) {
                var rgbaUint = new Uint8Array( state.binaryDecoder.decodeUint8Interleaved( numPoints, 12, state.pco.pointAttributes.byteSize, 4 ).buffer );
                var scaleFloat = new Float32Array( state.binaryDecoder.decodeFloat32Interleaved( numPoints, 16, state.pco.pointAttributes.byteSize, 3 ).buffer );
                var rotationUint = new Uint8Array( state.binaryDecoder.decodeUint8Interleaved( numPoints, 28, state.pco.pointAttributes.byteSize, 4 ).buffer );
                
                if (state.splatCallback !== undefined) {
                    // Call splat callback
                    geometry = state.splatCallback(numPoints, vertices, rgbaUint, scaleFloat, rotationUint);
                }
                else {
                    // Fallback
                    console.warn('No splatCallback given to ReaderWriterPotree, handling as point cloud');
                    geometry = new Geometry();
                    geometry.setVertexAttribArray( 'Vertex', new BufferArray( BufferArray.ARRAY_BUFFER, vertices, 3 ) );
                    var colorBuffer = new BufferArray( BufferArray.ARRAY_BUFFER, rgbaUint, 4 );
                    colorBuffer.setNormalize( true );
                    geometry.setVertexAttribArray( 'Color', colorBuffer );
                    geometry.setVertexAttribArray( 'Scale', new BufferArray( BufferArray.ARRAY_BUFFER, scaleFloat, 3 ) );
                    var rotationBuffer = new BufferArray( BufferArray.ARRAY_BUFFER, rotationUint, 4 );
                    geometry.setVertexAttribArray( 'Rotation', rotationBuffer );
                    geometry.getPrimitiveSetList().push( new DrawArrays( PrimitiveSet.POINTS, 0, numPoints ) );
                }
            }
            else {
                geometry = new Geometry();
                geometry.setVertexAttribArray( 'Vertex', new BufferArray( BufferArray.ARRAY_BUFFER, vertices, 3 ) );
                if (state.pco.pointAttributes.hasFloatValue) {
                  var floats = new Float32Array( state.binaryDecoder.decodeFloat32Interleaved( numPoints, 12, state.pco.pointAttributes.byteSize, 1 ).buffer );
                  var floatsBuffer = new BufferArray( BufferArray.ARRAY_BUFFER, floats, 1, true );
                  geometry.setVertexAttribArray( 'FloatValue', floatsBuffer );
                  geometry.getPrimitiveSetList().push( new DrawArrays( PrimitiveSet.POINTS, 0, numPoints ) );
                  
                  var floatIterator = floats.values();
                  for (let floatValue of floatIterator) {
                      state.floatValueMinMax[0] = Math.min(state.floatValueMinMax[0], floatValue);
                      state.floatValueMinMax[1] = Math.max(state.floatValueMinMax[1], floatValue);
                  }
                }
                else {
                  var colors = new Uint8Array( state.binaryDecoder.decodeUint8Interleaved( numPoints, 12, state.pco.pointAttributes.byteSize, 3 ).buffer );
                  var colorBuffer = new BufferArray( BufferArray.ARRAY_BUFFER, colors, 3, true );
                  colorBuffer.setNormalize( true );
                  geometry.setVertexAttribArray( 'Color', colorBuffer );
                  geometry.getPrimitiveSetList().push( new DrawArrays( PrimitiveSet.POINTS, 0, numPoints ) );
                }
            }
            
            return geometry;
        }
        catch (err) {
            console.warn(err);
            return undefined;
        }
    },

};

Registry.instance().addReaderWriter( 'pot', new ReaderWriterPotree() );

export default ReaderWriterPotree;
