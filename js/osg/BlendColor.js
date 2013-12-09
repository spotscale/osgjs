/*global define */

define( [
    'osg/osg',
    'osg/StateAttribute'
], function ( osg, StateAttribute ) {

    /** 
     *  Manage BlendColor attribute
     *  @class BlendColor
     */
    BlendColor = function ( color ) {
        StateAttribute.call( this );
        this._constantColor = new Array( 4 );
        this._constantColor[ 0 ] = this._constantColor[ 1 ] = this._constantColor[ 2 ] = this._constantColor[ 3 ] = 1.0;
        if ( color !== undefined ) {
            this.setConstantColor( color );
        }
    };

    /** @lends BlendColor.prototype */
    BlendColor.prototype = osg.objectLibraryClass( osg.objectInehrit( StateAttribute.prototype, {
        attributeType: 'BlendColor',
        cloneType: function () {
            return new BlendColor();
        },
        getType: function () {
            return this.attributeType;
        },
        getTypeMember: function () {
            return this.attributeType;
        },
        getConstantColor: function () {
            return this._constantColor;
        },
        apply: function ( state ) {
            var gl = state.getGraphicContext();
            gl.blendColor( this._constantColor[ 0 ],
                this._constantColor[ 1 ],
                this._constantColor[ 2 ],
                this._constantColor[ 3 ] );
            this._dirty = false;
        }
    } ), 'osg', 'BlendColor' );

    return BlendColor;
} );