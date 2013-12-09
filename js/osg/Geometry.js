/*global define */

define( [
    'osg/osg',
    'osg/Node',
    'osg/BoundingBox'
], function ( osg, Node, BoundingBox ) {

    /** -*- compile-command: 'jslint-cli Geometry.js' -*- */

    /**
     * Geometry manage array and primitives to draw a geometry.
     * @class Geometry
     */
    Geometry = function () {
        Node.call( this );
        this.primitives = [];
        this.attributes = {};
        this.boundingBox = new BoundingBox();
        this.boundingBoxComputed = false;
        this.cacheAttributeList = {};
    };

    /** @lends Geometry.prototype */
    Geometry.prototype = osg.objectLibraryClass( osg.objectInehrit( Node.prototype, {
        releaseGLObjects: function ( gl ) {
            var i;
            for ( i in this.attributes ) {
                this.attributes[ i ].releaseGLObjects( gl );
            }
            for ( var j = 0, l = this.primitives.length; j < l; j++ ) {
                var prim = this.primitives[ j ];
                if ( prim.getIndices !== undefined ) {
                    if ( prim.getIndices() !== undefined && prim.getIndices() !== null ) {
                        prim.indices.releaseGLObjects( gl );
                    }
                }
            }
        },
        dirtyBound: function () {
            if ( this.boundingBoxComputed === true ) {
                this.boundingBoxComputed = false;
            }
            Node.prototype.dirtyBound.call( this );
        },

        dirty: function () {
            this.cacheAttributeList = {};
        },
        getPrimitives: function () {
            return this.primitives;
        },
        getAttributes: function () {
            return this.attributes;
        },
        getVertexAttributeList: function () {
            return this.attributes;
        },
        getPrimitiveSetList: function () {
            return this.primitives;
        },

        drawImplementation: function ( state ) {
            var program = state.getLastProgramApplied();
            var prgID = program.getInstanceID();
            if ( this.cacheAttributeList[ prgID ] === undefined ) {
                var attribute;
                var attributesCache = program.attributesCache;
                var attributeList = [];

                var generated = '//generated by Geometry::implementation\n';
                generated += 'state.lazyDisablingOfVertexAttributes();\n';
                generated += 'var attr;\n';

                for ( var i = 0, l = attributesCache.attributeKeys.length; i < l; i++ ) {
                    var key = attributesCache.attributeKeys[ i ];
                    attribute = attributesCache[ key ];
                    var attr = this.attributes[ key ];
                    if ( attr === undefined ) {
                        continue;
                    }
                    attributeList.push( attribute );
                    // dont display the geometry if missing data
                    generated += 'attr = this.attributes[\'' + key + '\'];\n';
                    generated += 'if (!attr.isValid()) { return; }\n';
                    generated += 'state.setVertexAttribArray(' + attribute + ', attr, false);\n';
                }
                generated += 'state.applyDisablingOfVertexAttributes();\n';
                var primitives = this.primitives;
                generated += 'var primitives = this.primitives;\n';
                for ( var j = 0, m = primitives.length; j < m; ++j ) {
                    generated += 'primitives[' + j + '].draw(state);\n';
                }
                this.cacheAttributeList[ prgID ] = new Function( 'state', generated );
            }
            this.cacheAttributeList[ prgID ].call( this, state );
        },

        // for testing disabling drawing
        drawImplementationDummy: function ( state ) {
            var program = state.getLastProgramApplied();
            var attribute;
            var attributeList = [];
            var attributesCache = program.attributesCache;


            var primitives = this.primitives;
            //state.disableVertexAttribsExcept(attributeList);

            for ( var j = 0, m = primitives.length; j < m; ++j ) {
                //primitives[j].draw(state);
            }
        },

        getBoundingBox: function () {
            if ( !this.boundingBoxComputed ) {
                this.computeBoundingBox( this.boundingBox );
                this.boundingBoxComputed = true;
            }
            return this.boundingBox;
        },

        computeBoundingBox: function ( boundingBox ) {
            var vertexArray = this.getAttributes().Vertex;

            if ( vertexArray !== undefined &&
                vertexArray.getElements() !== undefined &&
                vertexArray.getItemSize() > 2 ) {
                var v = [ 0, 0, 0 ];
                vertexes = vertexArray.getElements();
                for ( var idx = 0, l = vertexes.length; idx < l; idx += 3 ) {
                    v[ 0 ] = vertexes[ idx ];
                    v[ 1 ] = vertexes[ idx + 1 ];
                    v[ 2 ] = vertexes[ idx + 2 ];
                    boundingBox.expandByVec3( v );
                }
            }
            return boundingBox;
        },

        computeBound: function ( boundingSphere ) {
            boundingSphere.init();
            var bb = this.getBoundingBox();
            boundingSphere.expandByBox( bb );
            return boundingSphere;
        }
    } ), 'osg', 'Geometry' );
    Geometry.prototype.objectType = osg.objectType.generate( 'Geometry' );

    return Geometry;
} );