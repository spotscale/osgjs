import utils from 'osg/utils';
import StateAttribute from 'osg/StateAttribute';

/**
 *  Manage PolygonOffset attribute
 *  @class PolygonOffset
 */
var PolygonOffset = function(factor, units) {
    StateAttribute.call(this);
    this.setFactor(factor !== undefined ? factor : 0.0);
    this.setUnits(units !== undefined ? units : 0.0);
};

/** @lends PolygonOffset.prototype */
utils.createPrototypeStateAttribute(
    PolygonOffset,
    utils.objectInherit(StateAttribute.prototype, {
        attributeType: 'PolygonOffset',

        cloneType: function() {
            return new PolygonOffset();
        },

        setFactor: function(factor) {
            this._factor = factor;
        },

        getFactor: function() {
            return this._factor;
        },

        setUnits: function(units) {
            this._units = units;
        },

        getUnits: function() {
            return this._units;
        },

        apply: function(state) {
            state.applyPolygonOffset(this);
        },
        
        compare: function(attr) {
            var compareTypes = StateAttribute.prototype.compare.call(this, attr);
            if (compareTypes !== 0) {
                return compareTypes;
            }
            if (this._factor < attr._factor) {
                return -1;
            }
            if (this._units > attr._units) {
                return 1;
            }
            return 0;
        }
    }),
    'osg',
    'PolygonOffset'
);

export default PolygonOffset;
