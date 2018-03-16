'use strict';

import WebGLCaps from 'osg/WebGLCaps';
import DrawArrays from 'osg/DrawArrays';
import utils from 'osg/utils';
import notify from 'osg/notify';

/**
 * DrawArrays manage rendering of indexed primitives
 * @class DrawArrays
 */
var DrawArraysInstanced = function ( mode, first, count, numInstances ) {
    DrawArrays.call( this, mode, first, count );
    this.numInstances = numInstances;
    this.extension = undefined;
};

/** @lends DrawArrays.prototype */
utils.createPrototypeNode(
    DrawArraysInstanced,
    utils.objectInherit(DrawArrays.prototype, {
        draw: function ( state ) {
            if ( this.count === 0 )
                return;
            //var gl = state.getGraphicContext();
            if ( !this.extension ) {
                this.extension = WebGLCaps.instance().getWebGLExtension( 'ANGLE_instanced_arrays' );
                if ( !this.extension ) {
                    notify.error( 'Your browser does not support instanced arrays extension' );
                    return;
                }
            }
            this.extension.drawArraysInstancedANGLE( this.mode, this.first, this.count, this.numInstances );
        },

        setNumPrimitives: function ( numPrimitives ) {
            this.numPrimitives = numPrimitives;
        },

        getNumPrimitives: function () {
            return this.numPrimitives;
        }
    }),
    'osg',
    'DrawArraysInstanced'
);

export default DrawArraysInstanced;
