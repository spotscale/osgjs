import utils from 'osg/utils';
import StateAttribute from 'osg/StateAttribute';

var Scissor = function(x, y, w, h) {
    StateAttribute.call(this);

    this._x = x !== undefined ? x : -1;
    this._y = y !== undefined ? y : -1;
    this._width = w !== undefined ? w : -1;

    this._height = h !== undefined ? h : -1;
};

utils.createPrototypeStateAttribute(
    Scissor,
    utils.objectInherit(StateAttribute.prototype, {
        attributeType: 'Scissor',

        cloneType: function() {
            return new Scissor();
        },

        setScissor: function(x, y, width, height) {
            this._x = x;
            this._y = y;
            this._width = width;
            this._height = height;
        },

        x: function() {
            return this._x;
        },

        y: function() {
            return this._y;
        },

        width: function() {
            return this._width;
        },

        height: function() {
            return this._height;
        },

        apply: function(state) {
            state.applyScissor(this);
        },
        
        compare: function(attr) {
            var compareTypes = StateAttribute.prototype.compare.call(this, attr);
            if (compareTypes !== 0) {
                return compareTypes;
            }
            if (this._x < attr._x) {
                return -1;
            }
            if (this._x > attr._x) {
                return 1;
            }
            if (this._y < attr._y) {
                return -1;
            }
            if (this._y > attr._y) {
                return 1;
            }
            if (this._width < attr._width) {
                return -1;
            }
            if (this._width > attr._width) {
                return 1;
            }
            if (this._height < attr._height) {
                return -1;
            }
            if (this._height > attr._height) {
                return 1;
            }
            return 0;
        }
    }),
    'osg',
    'Scissor'
);

export default Scissor;
