import utils from 'osg/utils';
import StateAttribute from 'osg/StateAttribute';
import Uniform from 'osg/Uniform';

var PointSizeAttribute = function(disable) {
    StateAttribute.call(this);

    this._enable = !disable;
    this._pointSize = 1.0;
    // careful with this option if there is lines/triangles under the stateset
    this._circleShape = false;
    this._pixelSizeType = true;
    this._dirtyHash = true;
    this._hash = '';
};

utils.createPrototypeStateAttribute(
    PointSizeAttribute,
    utils.objectInherit(StateAttribute.prototype, {
        attributeType: 'PointSize',

        cloneType: function() {
            return new PointSizeAttribute(true);
        },

        setCircleShape: function(bool) {
            this._circleShape = bool;
            this._dirtyHash = true;
        },

        isCircleShape: function() {
            return this._circleShape;
        },
        
        setPixelSizeType: function(pixelSizeType) {
          this._pixelSizeType = pixelSizeType;
          this._dirtyHash = true;
        },
        
        isPixelSizeType: function() {
          return this._pixelSizeType;
        },

        setEnabled: function(state) {
            this._enable = state;
            this._dirtyHash = true;
        },

        isEnabled: function() {
            return this._enable;
        },

        setPointSize: function(size) {
            this._pointSize = size;
        },

        getOrCreateUniforms: function() {
            var obj = PointSizeAttribute;
            if (obj.uniforms) return obj.uniforms;

            obj.uniforms = {
                pointSize: Uniform.createFloat(1.0, 'uPointSize')
            };

            return obj.uniforms;
        },

        getHash: function() {
            if (!this._dirtyHash) return this._hash;

            this._hash = this._computeInternalHash();
            this._dirtyHash = false;
            return this._hash;
        },

        _computeInternalHash: function() {
            return (
                this.getTypeMember() +
                (this.isEnabled() ? '1' : '0') +
                (this._circleShape ? '1' : '0') +
                (this._pixelSizeType ? '1' : '0')
            );
        },

        apply: function() {
            if (!this._enable) return;

            var uniforms = this.getOrCreateUniforms();
            uniforms.pointSize.setFloat(this._pointSize);
        },
        
        compare: function(attr) {
            var compareTypes = StateAttribute.prototype.compare.call(this, attr);
            if (compareTypes !== 0) {
                return compareTypes;
            }
            if (this._enable < attr._enable) {
                return -1;
            }
            if (this._enable > attr._enable) {
                return 1;
            }
            if (this._pointSize < attr._pointSize) {
                return -1;
            }
            if (this._pointSize > attr._pointSize) {
                return 1;
            }
            if (this._circleShape < attr._circleShape) {
                return -1;
            }
            if (this._circleShape > attr._circleShape) {
                return 1;
            }
            if (this._pixelSizeType < attr._pixelSizeType) {
                return -1;
            }
            if (this._pixelSizeType > attr._pixelSizeType) {
                return 1;
            }
            return 0;
        }
    }),
    'osg',
    'PointSizeAttribute'
);

export default PointSizeAttribute;
