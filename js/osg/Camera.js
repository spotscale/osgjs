/*global define */

define( [
    'osg/osg',
    'osg/Transform',
    'osg/Matrix'
], function ( osg, Transform, Matrix ) {

    /** 
     * Camera - is a subclass of Transform which represents encapsulates the settings of a Camera.
     * @class Camera
     * @inherits Transform CullSettings
     */
    Camera = function () {
        Transform.call( this );
        CullSettings.call( this );

        this.viewport = undefined;
        this.setClearColor( [ 0, 0, 0, 1.0 ] );
        this.setClearDepth( 1.0 );
        this.setClearMask( Camera.COLOR_BUFFER_BIT | Camera.DEPTH_BUFFER_BIT );
        this.setViewMatrix( Matrix.makeIdentity( [] ) );
        this.setProjectionMatrix( Matrix.makeIdentity( [] ) );
        this.renderOrder = Camera.NESTED_RENDER;
        this.renderOrderNum = 0;
    };

    Camera.PRE_RENDER = 0;
    Camera.NESTED_RENDER = 1;
    Camera.POST_RENDER = 2;

    Camera.COLOR_BUFFER_BIT = 0x00004000;
    Camera.DEPTH_BUFFER_BIT = 0x00000100;
    Camera.STENCIL_BUFFER_BIT = 0x00000400;

    /** @lends Camera.prototype */
    Camera.prototype = osg.objectLibraryClass( osg.objectInehrit(
        CullSettings.prototype,
        osg.objectInehrit( Transform.prototype, {

            setClearDepth: function ( depth ) {
                this.clearDepth = depth;
            },
            getClearDepth: function () {
                return this.clearDepth;
            },

            setClearMask: function ( mask ) {
                this.clearMask = mask;
            },
            getClearMask: function () {
                return this.clearMask;
            },

            setClearColor: function ( color ) {
                this.clearColor = color;
            },
            getClearColor: function () {
                return this.clearColor;
            },

            setViewport: function ( vp ) {
                this.viewport = vp;
                this.getOrCreateStateSet().setAttributeAndMode( vp );
            },
            getViewport: function () {
                return this.viewport;
            },


            setViewMatrix: function ( matrix ) {
                this.modelviewMatrix = matrix;
            },

            setProjectionMatrix: function ( matrix ) {
                this.projectionMatrix = matrix;
            },

            /** Set to an orthographic projection. See OpenGL glOrtho for documentation further details.*/
            setProjectionMatrixAsOrtho: function ( left, right,
                bottom, top,
                zNear, zFar ) {
                Matrix.makeOrtho( left, right, bottom, top, zNear, zFar, this.getProjectionMatrix() );
            },

            getViewMatrix: function () {
                return this.modelviewMatrix;
            },
            getProjectionMatrix: function () {
                return this.projectionMatrix;
            },
            getRenderOrder: function () {
                return this.renderOrder;
            },
            setRenderOrder: function ( order, orderNum ) {
                this.renderOrder = order;
                this.renderOrderNum = orderNum;
            },

            attachTexture: function ( bufferComponent, texture, level ) {
                if ( this.frameBufferObject ) {
                    this.frameBufferObject.dirty();
                }
                if ( level === undefined ) {
                    level = 0;
                }
                if ( this.attachments === undefined ) {
                    this.attachments = {};
                }
                this.attachments[ bufferComponent ] = {
                    'texture': texture,
                    'level': level
                };
            },

            attachRenderBuffer: function ( bufferComponent, internalFormat ) {
                if ( this.frameBufferObject ) {
                    this.frameBufferObject.dirty();
                }
                if ( this.attachments === undefined ) {
                    this.attachments = {};
                }
                this.attachments[ bufferComponent ] = {
                    'format': internalFormat
                };
            },

            computeLocalToWorldMatrix: function ( matrix, nodeVisitor ) {
                if ( this.referenceFrame === Transform.RELATIVE_RF ) {
                    Matrix.preMult( matrix, this.modelviewMatrix );
                } else { // absolute
                    matrix = this.modelviewMatrix;
                }
                return true;
            },

            computeWorldToLocalMatrix: function ( matrix, nodeVisitor ) {
                var inverse = [];
                Matrix.inverse( this.modelviewMatrix, inverse );
                if ( this.referenceFrame === Transform.RELATIVE_RF ) {
                    Matrix.postMult( inverse, matrix );
                } else {
                    matrix = inverse;
                }
                return true;
            }

        } ) ), 'osg', 'Camera' );
    Camera.prototype.objectType = objectType.generate( 'Camera' );


    return Camera;
} );