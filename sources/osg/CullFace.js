import utils from 'osg/utils';
import StateAttribute from 'osg/StateAttribute';

/**
 *  Manage CullFace attribute
 *  @class CullFace
 */
var CullFace = function(mode) {
    StateAttribute.call(this);
    this.setMode(mode !== undefined ? mode : CullFace.BACK);
};

CullFace.DISABLE = 0x0;
CullFace.FRONT = 0x0404;
CullFace.BACK = 0x0405;
CullFace.FRONT_AND_BACK = 0x0408;

/** @lends CullFace.prototype */
utils.createPrototypeStateAttribute(
    CullFace,
    utils.objectInherit(StateAttribute.prototype, {
        attributeType: 'CullFace',

        cloneType: function() {
            return new CullFace();
        },

        setMode: function(mode) {
            var value = mode;
            if (typeof value === 'string') value = CullFace[value];
            this._mode = value;
        },

        getMode: function() {
            return this._mode;
        },

        apply: function(state) {
            state.applyCullFace(this);
        },
        
        compare: function(attr) {
            var compareTypes = StateAttribute.prototype.compare.call(this, attr);
            if (compareTypes !== 0) {
                return compareTypes;
            }
            if (this._mode < attr._mode) {
                return -1;
            }
            if (this._mode > attr._mode) {
                return 1;
            }
            return 0;
        }
    }),
    'osg',
    'CullFace'
);

export default CullFace;
