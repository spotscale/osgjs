import utils from 'osg/utils';
import StateAttribute from 'osg/StateAttribute';

var BillboardAttribute = function() {
    StateAttribute.call(this);
    this._attributeEnable = false;
};

utils.createPrototypeStateAttribute(
    BillboardAttribute,
    utils.objectInherit(StateAttribute.prototype, {
        attributeType: 'Billboard',

        cloneType: function() {
            return new BillboardAttribute();
        },

        setEnabled: function(state) {
            this._attributeEnable = state;
        },

        isEnabled: function() {
            return this._attributeEnable;
        },

        apply: function() {},
        
        compare: function(attr) {
            var compareTypes = StateAttribute.prototype.compare.call(this, attr);
            if (compareTypes !== 0) {
                return compareTypes;
            }
            if (this._attributeEnable < attr._attributeEnable) {
                return -1;
            }
            if (this._attributeEnable > attr._attributeEnable) {
                return 1;
            }
            return 0;
        }

    }),
    'osg',
    'Billboard'
);

export default BillboardAttribute;
