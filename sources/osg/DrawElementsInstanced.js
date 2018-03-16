'use strict';

import WebGLCaps from 'osg/WebGLCaps';
import DrawElements from 'osg/DrawElements';
import utils from 'osg/utils';
import notify from 'osg/notify';

/**
 * DrawElements manages rendering of indexed primitives
 * @class DrawElements
 */
var DrawElementsInstanced = function ( mode, indices, numPrimitives ) {
    DrawElements.call( this, mode, indices );
    this.numPrimitives = numPrimitives;
    this.extension = undefined;
};

/** @lends DrawElements.prototype */
utils.createPrototypeNode(
    DrawElementsInstanced,
    utils.objectInherit(DrawElements.prototype, {
        drawElements: function ( state ) {
            //var gl = state.getGraphicContext();
            if ( !this.extension ) {
                this.extension = WebGLCaps.instance().getWebGLExtension( 'ANGLE_instanced_arrays' );
                if ( !this.extension ) {
                    notify.error( 'Your browser does not support instanced arrays extension' );
                    return;
                }
            }
            this.extension.drawElementsInstancedANGLE( this.mode, this.count, this.uType, this.offset, this.numPrimitives );
        },

        setNumPrimitives: function ( numPrimitives ) {
            this.numPrimitives = numPrimitives;
        },

        getNumPrimitives: function () {
            return this.numPrimitives;
        }
    }),
    'osg',
    'DrawElementsInstanced'
);

export default DrawElementsInstanced;
