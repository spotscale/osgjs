import utils from 'osg/utils';
import StateAttribute from 'osg/StateAttribute';

/**
 *  Manage Blending equation
 *  @class BlendEquation
 */
var BlendEquation = function(modeRGB, modeAlpha) {
    StateAttribute.call(this);
    this._mode = BlendEquation.FUNC_ADD;
    this._modeAlpha = BlendEquation.FUNC_ADD;
    this._separate = false;
    if (modeRGB !== undefined) {
        this.setMode(modeRGB);
    }
    if (modeAlpha !== undefined) {
        this.setModeAlpha(modeAlpha);
    }
};

BlendEquation.DISABLE = -1;
BlendEquation.FUNC_ADD = 0x8006;
BlendEquation.FUNC_SUBTRACT = 0x800a;
BlendEquation.FUNC_REVERSE_SUBTRACT = 0x800b;
BlendEquation.MIN = 0x8007;
BlendEquation.MAX = 0x8008;

/** @lends BlendEquation.prototype */
utils.createPrototypeStateAttribute(
    BlendEquation,
    utils.objectInherit(StateAttribute.prototype, {
        /**
         * StateAttribute type of BlendEquation
         * @type String
         */
        attributeType: 'BlendEquation',
        /**
         * Create an instance of this StateAttribute
         */
        cloneType: function() /**BlendEquation*/ {
            return new BlendEquation();
        },
        setMode: function(f) {
            this.setModeRGB(f);
            this.setModeAlpha(f);
        },
        getMode: function() {
            return this._mode;
        },
        getSeparate: function() {
            return this._separate;
        },
        checkSeparate: function() {
            return (
                this._mode !== this._modeAlpha
            );
        },
        setModeRGB: function(f) {
            if (typeof f === 'string') {
                this._mode = BlendEquation[f];
            } else {
                this._mode = f;
            }
            this._separate = this.checkSeparate();
        },
        getModeRGB: function() {
            return this._mode;
        },
        setModeAlpha: function(f) {
            if (typeof f === 'string') {
                this._modeAlpha = BlendEquation[f];
            } else {
                this._modeAlpha = f;
            }
            this._separate = this.checkSeparate();
        },
        getModeAlpha: function() {
            return this._modeAlpha;
        },

        /**
         * Apply the mode, must be called in the draw traversal
         * @param state
         */
        apply: function(state) {
            state.applyBlendEquation(this);
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
            if (this._modeAlpha < attr._modeAlpha) {
                return -1;
            }
            if (this._modeAlpha > attr._modeAlpha) {
                return 1;
            }
            if (this._separate < attr._separate) {
                return -1;
            }
            if (this._separate > attr._separate) {
                return 1;
            }
            return 0;
        }
    }),
    'osg',
    'BlendEquation'
);

export default BlendEquation;
