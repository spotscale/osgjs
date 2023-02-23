import utils from 'osg/utils';
import StateAttribute from 'osg/StateAttribute';
import { vec4 } from 'osg/glMatrix';
import Uniform from 'osg/Uniform';

// Define a material attribute
var Material = function() {
    StateAttribute.call(this);
    this._ambient = vec4.fromValues(0.2, 0.2, 0.2, 1.0);
    this._diffuse = vec4.fromValues(0.8, 0.8, 0.8, 1.0);
    this._specular = vec4.fromValues(0.0, 0.0, 0.0, 1.0);
    this._emission = vec4.fromValues(0.0, 0.0, 0.0, 1.0);
    this._shininess = 12.5;
};

utils.createPrototypeStateAttribute(
    Material,
    utils.objectInherit(StateAttribute.prototype, {
        attributeType: 'Material',

        cloneType: function() {
            return new Material();
        },

        getParameterName: function(name) {
            return 'u' + this.getType() + '_' + name;
        },

        getOrCreateUniforms: function() {
            var obj = Material;
            if (obj.uniforms) return obj.uniforms;

            obj.uniforms = {
                ambient: Uniform.createFloat4('uMaterialAmbient'),
                diffuse: Uniform.createFloat4('uMaterialDiffuse'),
                specular: Uniform.createFloat4('uMaterialSpecular'),
                emission: Uniform.createFloat4('uMaterialEmission'),
                shininess: Uniform.createFloat1('uMaterialShininess')
            };

            return obj.uniforms;
        },

        setEmission: function(a) {
            vec4.copy(this._emission, a);
        },

        getEmission: function() {
            return this._emission;
        },

        setAmbient: function(a) {
            vec4.copy(this._ambient, a);
        },

        getAmbient: function() {
            return this._ambient;
        },

        setSpecular: function(a) {
            vec4.copy(this._specular, a);
        },

        getSpecular: function() {
            return this._specular;
        },

        setDiffuse: function(a) {
            vec4.copy(this._diffuse, a);
        },

        getDiffuse: function() {
            return this._diffuse;
        },

        setShininess: function(a) {
            this._shininess = a;
        },

        getShininess: function() {
            return this._shininess;
        },

        setTransparency: function(a) {
            this._diffuse[3] = 1.0 - a;
        },

        getTransparency: function() {
            return this._diffuse[3];
        },

        apply: function() {
            var uniforms = this.getOrCreateUniforms();

            uniforms.ambient.setFloat4(this._ambient);
            uniforms.diffuse.setFloat4(this._diffuse);
            uniforms.specular.setFloat4(this._specular);
            uniforms.emission.setFloat4(this._emission);
            uniforms.shininess.setFloat(this._shininess);
        },
        
        compare: function(attr) {
            var compareTypes = StateAttribute.prototype.compare.call(this, attr);
            if (compareTypes !== 0) {
                return compareTypes;
            }
            var ambientComp = vec4.compare(this._ambient, attr._ambient);
            if (ambientComp !== 0) {
                return ambientComp;
            }
            var diffuseComp = vec4.compare(this._diffuse, attr._diffuse);
            if (diffuseComp !== 0) {
                return diffuseComp;
            }
            var specularComp = vec4.compare(this._specular, attr._specular);
            if (specularComp !== 0) {
                return specularComp;
            }
            var emissionComp = vec4.compare(this._emission, attr._emission);
            if (emissionComp !== 0) {
                return emissionComp;
            }
            if (this._shininess < attr._shininess) {
                return -1;
            }
            if (this._shininess > attr._shininess) {
                return 1;
            }
            return 0;
        },
        
        clone: function() {
            var m = new Material();
            m._ambient = vec4.clone(this._ambient);
            m._diffuse = vec4.clone(this._diffuse);
            m._specular = vec4.clone(this._specular);
            m._emission = vec4.clone(this._emission);
            m._shininess = this._shininess;
            return m;
        }
    }),
    'osg',
    'Material'
);

export default Material;
