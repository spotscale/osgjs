import utils from 'osg/utils';
import StateAttribute from 'osg/StateAttribute';

var ColorMask = function(red, green, blue, alpha) {
    StateAttribute.call(this);
    this._red = true;
    this._green = true;
    this._blue = true;
    this._alpha = true;

    if (red !== undefined && green !== undefined && blue !== undefined)
        this.setMask(red, green, blue, alpha);
};

utils.createPrototypeStateAttribute(
    ColorMask,
    utils.objectInherit(StateAttribute.prototype, {
        attributeType: 'ColorMask',
        cloneType: function() {
            return new ColorMask();
        },
        setMask: function(red, green, blue, alpha) {
            this._red = !!red;
            this._green = !!green;
            this._blue = !!blue;
            this._alpha = !!alpha;
        },
        apply: function(state) {
            state.applyColorMask(this);
        },
        
        compare: function(attr) {
            var compareTypes = StateAttribute.prototype.compare.call(this, attr);
            if (compareTypes !== 0) {
                return compareTypes;
            }
            if (this._red < attr._red) {
                return -1;
            }
            if (this._red > attr._red) {
                return 1;
            }
            if (this._green < attr._green) {
                return -1;
            }
            if (this._green > attr._green) {
                return 1;
            }
            if (this._blue < attr._blue) {
                return -1;
            }
            if (this._blue > attr._blue) {
                return 1;
            }
            if (this._alpha < attr._alpha) {
                return -1;
            }
            if (this._alpha > attr._alpha) {
                return 1;
            }
            return 0;
        }
    }),
    'osg',
    'ColorMask'
);

export default ColorMask;
