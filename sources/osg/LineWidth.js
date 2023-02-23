import utils from 'osg/utils';
import StateAttribute from 'osg/StateAttribute';

var LineWidth = function(lineWidth) {
    StateAttribute.call(this);
    this.lineWidth = 1.0;
    if (lineWidth !== undefined) {
        this.lineWidth = lineWidth;
    }
};
utils.createPrototypeStateAttribute(
    LineWidth,
    utils.objectInherit(StateAttribute.prototype, {
        attributeType: 'LineWidth',
        cloneType: function() {
            return new LineWidth();
        },
        apply: function(state) {
            state.getGraphicContext().lineWidth(this.lineWidth);
        },
        
        compare: function(attr) {
            var compareTypes = StateAttribute.prototype.compare.call(this, attr);
            if (compareTypes !== 0) {
                return compareTypes;
            }
            if (this.lineWidth < attr.lineWidth) {
                return -1;
            }
            if (this.lineWidth > attr.lineWidth) {
                return 1;
            }
            return 0;
        }
    }),
    'osg',
    'LineWidth'
);

export default LineWidth;
