'use strict';

var Light = require( 'osg/Light' );
var Notify = require( 'osg/notify' );
var MACROUTILS = require( 'osg/Utils' );

var CompilerFragment = {

    _createFragmentShader: function () {
        // Call to specialised inhenrited shader Compiler
        var roots = this.createFragmentShaderGraph();
        var fname = this.getFragmentShaderName();
        if ( fname ) roots.push( this.getNode( 'Define', 'SHADER_NAME' ).setValue( fname ) );

        var shader = this.createShaderFromGraphs( roots );

        Notify.debug( this.getDebugIdentifier() );
        Notify.debug( shader );

        this.cleanAfterFragment();

        return shader;
    },

    applyPointSizeCircle: function ( color ) {
        if ( !this._pointSizeAttribute || !this._pointSizeAttribute.isEnabled() || !this._pointSizeAttribute.isCircleShape() )
            return color;

        this.getNode( 'InlineCode' ).code( 'if (length(2.0 * gl_PointCoord - 1.0) > %radius) discard;' ).inputs( {
            radius: this.getOrCreateConstantOne( 'float' )
        } ).outputs( {
            output: color
        } );

        return color;
    },

    cleanAfterFragment: function () {
        // reset for next
        this._variables = {};
        this._activeNodeList = {};

        // clean texture cache variable (for vertex shader re-usage)
        for ( var keyTexture in this._texturesByName ) {
            this._texturesByName[ keyTexture ].variable = undefined;
        }

        for ( var keyVarying in this._varyings ) {
            var varying = this._varyings[ keyVarying ];
            varying.reset();
            this._activeNodeList[ varying.getID() ] = varying;
            this._variables[ keyVarying ] = varying;
        }
    },

    createDefaultFragmentShaderGraph: function () {
        var fofd = this.getOrCreateConstant( 'vec4', 'fofd' ).setValue( 'vec4(1.0, 0.0, 1.0, 0.7)' );
        var fragCol = this.getNode( 'glFragColor' );
        this.getNode( 'SetFromNode' ).inputs( fofd ).outputs( fragCol );
        return fragCol;
    },

    createFragmentShaderGraph: function () {

        // shader graph can have multiple output (glPointsize, varyings)
        // here named roots all outputs must be pushed inside
        var roots = [];

        // no material then return a default shader
        if ( !this._material ) {
            roots.push( this.createDefaultFragmentShaderGraph() );
            return roots;
        }

        var materialUniforms = this.getOrCreateStateAttributeUniforms( this._material );

        // vertex color needs to be computed to diffuse
        var diffuseColor = this.getVertexColor( materialUniforms.diffuse );

        var finalColor;

        if ( this._lights.length > 0 ) {

            var lightedOutput = this.createLighting( {
                materialdiffuse: diffuseColor
            } );
            finalColor = lightedOutput;

        } else {
            finalColor = diffuseColor;
        }

        if ( materialUniforms.emission ) {
            // add emission if any
            var outputDiffEm = this.createVariable( 'vec3' ).setValue( 'vec3(0.0)' );
            this.getNode( 'Add' ).inputs( finalColor, materialUniforms.emission ).outputs( outputDiffEm );
            finalColor = outputDiffEm;
        }

        // finalColor = primary color * texture color
        var textureColor = this.getDiffuseColorFromTextures();
        if ( textureColor !== undefined ) {
            this.getNode( 'InlineCode' ).code( '%color.rgb *= %texture.rgb;' ).inputs( {
                texture: textureColor
            } ).outputs( {
                color: finalColor
            } );
        }

        // compute alpha
        var alpha = this.createVariable( 'float' );
        var textureTexel = this.getFirstValidTexture();
        var alphaCompute;
        if ( textureTexel ) // use alpha of the first valid texture if has texture
            alphaCompute = '%alpha = %color.a * %texelAlpha.a;';
        else
            alphaCompute = '%alpha = %color.a;';

        // Discard fragments totally transparents when rendering billboards
        if ( this._isBillboard )
            alphaCompute += 'if ( %alpha == 0.0) discard;';

        this.getNode( 'InlineCode' ).code( alphaCompute ).inputs( {
            color: materialUniforms.diffuse,
            texelAlpha: textureTexel
        } ).outputs( {
            alpha: alpha
        } );

        // premult alpha
        finalColor = this.getPremultAlpha( finalColor, alpha );

        var fragColor = this.getNode( 'glFragColor' );

        // todo add gamma corrected color, but it would also mean to handle correctly srgb texture
        // so it should be done at the same time. see osg.Tetxure to implement srgb
        this.getNode( 'SetAlpha' ).inputs( {
            color: finalColor,
            alpha: alpha
        } ).outputs( {
            color: fragColor
        } );

        roots.push( fragColor );

        return roots;
    },

    getOrCreateFrontViewTangent: function () {
        var out = this._variables[ 'frontViewTangent' ];
        if ( out )
            return out;

        out = this.createVariable( 'vec4', 'frontViewTangent' );

        this.getNode( 'FrontNormal' ).inputs( {
            normal: this.getOrCreateVarying( 'vec4', 'vViewTangent' )
        } ).outputs( {
            normal: out
        } );

        return out;
    },

    getOrCreateFrontViewNormal: function () {
        var out = this._variables[ 'frontViewNormal' ];
        if ( out )
            return out;

        out = this.createVariable( 'vec3', 'frontViewNormal' );

        this.getNode( 'FrontNormal' ).inputs( {
            normal: this.getOrCreateVarying( 'vec3', 'vViewNormal' )
        } ).outputs( {
            normal: out
        } );

        return out;
    },

    getOrCreateNormalizedViewEyeDirection: function () {
        var eye = this._variables[ 'eyeVector' ];
        if ( eye )
            return eye;

        var nor = this.createVariable( 'vec3' );
        var castEye = this.createVariable( 'vec3' );
        this.getNode( 'SetFromNode' ).inputs( this.getOrCreateVarying( 'vec4', 'vViewVertex' ) ).outputs( castEye );
        this.getNode( 'Normalize' ).inputs( {
            vec: castEye
        } ).outputs( {
            vec: nor
        } );

        var out = this.createVariable( 'vec3', 'eyeVector' );
        this.getNode( 'Mult' ).inputs( nor, this.createVariable( 'float' ).setValue( '-1.0' ) ).outputs( out );
        return out;
    },

    getOrCreateNormalizedFrontViewNormal: function () {
        var out = this._variables[ 'nFrontViewNormal' ];
        if ( out )
            return out;

        out = this.createVariable( 'vec3', 'nFrontViewNormal' );
        this.getNode( 'Normalize' ).inputs( {
            vec: this.getOrCreateFrontViewNormal()
        } ).outputs( {
            vec: out
        } );

        return out;
    },

    getOrCreateFrontModelNormal: function () {
        var out = this._variables[ 'frontModelNormal' ];
        if ( out )
            return out;

        out = this.createVariable( 'vec3', 'frontModelNormal' );

        this.getNode( 'FrontNormal' ).inputs( {
            normal: this.getOrCreateVarying( 'vec3', 'vModelNormal' )
        } ).outputs( {
            normal: out
        } );

        return out;
    },

    getOrCreateNormalizedFrontModelNormal: function () {
        var out = this._variables[ 'nFrontModelNormal' ];
        if ( out )
            return out;

        out = this.createVariable( 'vec3', 'nFrontModelNormal' );
        this.getNode( 'Normalize' ).inputs( {
            vec: this.getOrCreateFrontModelNormal()
        } ).outputs( {
            vec: out
        } );

        return out;
    },

    getPremultAlpha: function ( finalColor, alpha ) {

        if ( alpha === undefined )
            return finalColor;

        var premultAlpha = this.createVariable( 'vec4' );

        this.getNode( 'PreMultAlpha' ).inputs( {
            color: finalColor,
            alpha: alpha
        } ).outputs( {
            color: premultAlpha
        } );

        return premultAlpha;
    },


    getColorsRGB: function ( finalColor ) {
        var finalSrgbColor = this.createVariable( 'vec3' );
        this.getNode( 'LinearTosRGB' ).inputs( {
            color: finalColor
        } ).outputs( {
            color: finalSrgbColor
        } );

        return finalSrgbColor;
    },


    // Declare variable / varying to handle vertex color
    // return a variable that contains the following operation
    // newDiffuseColor = diffuseColor * vertexColor
    // TODO: this code should move in the shader instead
    getVertexColor: function ( diffuseColor ) {

        if ( diffuseColor === undefined )
            return undefined;

        var vertexColor = this.getOrCreateVarying( 'vec4', 'vVertexColor' );
        var vertexColorUniform = this.getOrCreateUniform( 'float', 'uArrayColorEnabled' );
        var tmp = this.createVariable( 'vec4' );

        var str = [ '',
            '%color.rgb = %diffuse.rgb;',
            'if ( %hasVertexColor == 1.0)',
            '  %color *= %vertexColor.rgba;'
        ].join( '\n' );

        this.getNode( 'InlineCode' ).code( str ).inputs( {
            diffuse: diffuseColor,
            hasVertexColor: vertexColorUniform,
            vertexColor: vertexColor
        } ).outputs( {
            color: tmp
        } ).comment( 'diffuse color = diffuse color * vertex color' );

        return tmp;
    },

    getDiffuseColorFromTextures: function () {

        var texturesInput = [];
        var textures = this._texturesByName;

        for ( var keyTexture in textures ) {
            var texture = textures[ keyTexture ];

            if ( texture.shadow )
                continue;

            texturesInput.push( this.getTextureByName( keyTexture ).variable );
        }

        // if multi texture multiply them all with diffuse
        // but if only one, return the first
        if ( texturesInput.length > 1 ) {

            var texAccum = this.createVariable( 'vec3', 'texDiffuseAccum' );

            this.getNode( 'Mult' ).inputs( texturesInput ).outputs( texAccum );
            return texAccum;

        } else if ( texturesInput.length === 1 ) {

            return texturesInput[ 0 ];
        }

        return undefined;
    },

    getFirstValidTexture: function () {
        var textures = this._textures;
        for ( var i = 0, nb = textures.length; i < nb; ++i ) {
            var tex = textures[ i ];
            if ( tex ) return this.getTextureByName( tex.getName() ).variable;
        }
        return undefined;
    },

    getShadowTextureFromLightNum: function ( lightNum ) {
        for ( var i = 0; i < this._shadowsTextures.length; i++ ) {
            var shadowTexture = this._shadowsTextures[ i ];
            if ( shadowTexture && shadowTexture.hasLightNumber( lightNum ) ) {
                return shadowTexture;
            }
        }
    },

    createShadowingLight: function ( light, inputs, lightedOutput ) {

        var shadowTexture = this.getShadowTextureFromLightNum( light.getLightNumber() );
        if ( shadowTexture ) return undefined;

        // Varyings
        var vertexWorld = this.getOrCreateVarying( 'vec3', 'vModelVertex' );
        var normalWorld = this.getOrCreateNormalizedFrontModelNormal();

        // asserted we have a shadow we do the shadow node allocation
        // and mult with lighted output
        var shadowedOutput = this.createVariable( 'float' );

        // shadow Attribute uniforms
        var shadowUniforms = this.getOrCreateStateAttributeUniforms( this._shadows[ lightIndex ], 'shadow' );
        var shadowInputs = MACROUTILS.objectMix( inputs, shadowUniforms );

        // shadowTexture  Attribute uniforms AND varying
        // TODO: better handle multi texture shadow (CSM/PSM/etc.)
        for ( k = 0; k < shadowTextures.length; k++ ) {
            shadowTexture = shadowTextures[ k ];
            if ( shadowTexture ) {
                shadowInputs = this.createShadowTextureInputVarying( shadowTexture, shadowInputs, vertexWorld, normalWorld, k, lightNum );
            }

        }
        // TODO: shadow Attributes in node, is this the legit way
        this.getNode( 'ShadowReceive' ).inputs( inputs ).outputs( {
            float: shadowedOutput
        } ).setShadowAttribute( shadow );

        // allow overwrite by inheriting compiler where shadow inputs ( NDotL notably) can be used for non standard shadows
        return this.connectShadowLightNode( light, lightedOutput, shadowedOutput, shadowInputs );

    },

    connectShadowLightNode: function ( light, lightedOutput, shadowedOutput ) {

        var lightAndShadowTempOutput = this.createVariable( 'vec3', 'lightAndShadowTempOutput' );

        this.getNode( 'Mult' ).inputs( lightedOutput, shadowedOutput ).outputs( lightAndShadowTempOutput );

        return lightAndShadowTempOutput;

    },

    createShadowTextureInputVarying: function ( shadowTexture, inputs, vertexWorld, normalWorld, tUnit, lightNum ) {
        var shadowTexSamplerName = 'Texture' + tUnit;


        // we declare first this uniform so that the Int one
        var tex = this.getOrCreateSampler( 'sampler2D', shadowTexSamplerName );

        // per texture uniforms
        var uniforms = shadowTexture.getOrCreateUniforms( tUnit );
        var backupInt = uniforms[ shadowTexSamplerName ];
        // remove the uniform texture unit uniform
        delete uniforms[ shadowTexSamplerName ];


        // get subset of shadow texture uniform corresponding to light
        var object = {};

        var prefixUniform = 'shadowTexture';

        for ( var keyUniform in uniforms ) {
            var lightIndexed = keyUniform.split( '_' );

            var k;

            if ( lightIndexed.length === 2 ) {

                if ( Number( lightIndexed[ 1 ] ) === lightNum ) {

                    k = prefixUniform + lightIndexed[ 0 ];
                    object[ k ] = this.getOrCreateUniform( uniforms[ keyUniform ] );
                }

            } else {

                k = prefixUniform + keyUniform;
                object[ k ] = this.getOrCreateUniform( uniforms[ keyUniform ] );

            }


        }

        var shadowTextureUniforms = object;


        // tUnit, lightNum
        uniforms[ shadowTexSamplerName ] = backupInt;

        var inputsShadow = MACROUTILS.objectMix( inputs, shadowTextureUniforms );

        inputsShadow.shadowTexture = tex;

        var shadowVarying = {
            vertexWorld: vertexWorld,
            normalWorld: normalWorld,
            lightEyeDir: inputsShadow.lightEyeDir
        };
        inputsShadow = MACROUTILS.objectMix( inputsShadow, shadowVarying );
        return inputsShadow;
    },

    getOrCreateMaterialNormal: function () {
        return this.getOrCreateNormalizedFrontViewNormal();
    },

    getOrCreateMaterialDiffuseColor: function () {
        return this.getOrCreateUniform( this._material.getOrCreateUniforms().diffuse );
    },

    getOrCreateMaterialSpecularColor: function () {
        return this.getOrCreateUniform( this._material.getOrCreateUniforms().specular );
    },

    getOrCreateMaterialSpecularHardness: function () {
        return this.getOrCreateUniform( this._material.getOrCreateUniforms().shininess );
    },

    getOrCreateMaterialAmbient: function () {
        return this.getOrCreateUniform( this._material.getOrCreateUniforms().ambient );
    },

    getInputsFromLight: function ( light ) {
        var lightUniforms = light.getOrCreateUniforms();

        var inputs = {
            normal: this.getOrCreateMaterialNormal(),
            eyeVector: this.getOrCreateNormalizedViewEyeDirection(),

            materialdiffuse: this.getOrCreateMaterialDiffuseColor(),
            materialspecular: this.getOrCreateMaterialSpecularColor(),
            materialshininess: this.getOrCreateMaterialSpecularHardness(),

            lightdiffuse: this.getOrCreateUniform( lightUniforms.diffuse ),
            lightposition: this.getOrCreateUniform( lightUniforms.position ),
            lightmatrix: this.getOrCreateUniform( lightUniforms.matrix )
        };

        var lightType = light.getLightType();
        if ( lightType === Light.POINT ) {
            inputs.lightspecular = this.getOrCreateUniform( lightUniforms.specular );
            inputs.lightattenuation = this.getOrCreateUniform( lightUniforms.attenuation );

        } else if ( lightType === Light.SPOT ) {
            inputs.lightspecular = this.getOrCreateUniform( lightUniforms.specular );
            inputs.lightattenuation = this.getOrCreateUniform( lightUniforms.attenuation );
            inputs.lightdirection = this.getOrCreateUniform( lightUniforms.direction );
            inputs.lightspotCutOff = this.getOrCreateUniform( lightUniforms.spotCutOff );
            inputs.lightspotBlend = this.getOrCreateUniform( lightUniforms.spotBlend );
            inputs.lightinvMatrix = this.getOrCreateUniform( lightUniforms.invMatrix );

        } else if ( lightType === Light.DIRECTION ) {
            inputs.lightspecular = this.getOrCreateUniform( lightUniforms.specular );

        } else if ( lightType === Light.HEMI ) {
            inputs.lightground = this.getOrCreateUniform( lightUniforms.ground );
        }

        return inputs;
    },

    getOutputsFromLight: function () {
        var outputs = {
            color: this.createVariable( 'vec3' ),
            lighted: this.createVariable( 'bool' ),
        };

        return outputs;
    },

    getEnumLightToNodeName: function () {
        return {
            DIRECTION: 'SunLight',
            SPOT: 'SpotLight',
            POINT: 'PointLight',
            HEMI: 'HemiLight'
        };
    },

    createLighting: function () {
        var lightSum = [];

        var enumToNodeName = this.getEnumLightToNodeName();
        for ( var i = 0; i < this._lights.length; i++ ) {

            var light = this._lights[ i ];

            var nodeName = enumToNodeName[ light.getLightType() ];
            var inputs = this.getInputsFromLight( light );
            var outputs = this.getOutputsFromLight( light );

            this.getNode( nodeName ).inputs( inputs ).outputs( outputs );

            var outLighted = {
                lighted: outputs.lighted
            };

            var shadowedOutput = this.createShadowingLight( light, outLighted, outputs.color ) || outputs.color;
            lightSum.push( shadowedOutput );
        }

        this.addAmbientLighting( lightSum );

        if ( lightSum.length === 0 ) return this.getOrCreateConstantZero( 'vec3' );
        if ( lightSum.length === 1 ) return lightSum[ 0 ];

        var output = this.createVariable( 'vec3' );
        this.getNode( 'Add' ).inputs( lightSum ).outputs( output );
        return output;
    },

    addAmbientLighting: function ( toBeAdded ) {
        for ( var i = 0; i < this._lights.length; i++ ) {
            var light = this._lights[ i ];

            var ambient = this.createVariable( 'vec3' );
            var lightambient = this.getOrCreateUniform( light.getOrCreateUniforms().ambient );
            var materialambient = this.getOrCreateMaterialAmbient();
            this.getNode( 'Mult' ).inputs( materialambient, lightambient ).outputs( ambient );

            toBeAdded.push( ambient );
        }
    },

    createTextureRGBA: function ( texture, textureSampler, texCoord ) {
        // but we could later implement srgb inside and read differents flag
        // as read only in the texture

        var texel = this.createVariable( 'vec4' );
        this.getNode( 'TextureRGBA' ).inputs( {
            sampler: textureSampler,
            uv: texCoord
        } ).outputs( {
            color: texel
        } );

        return texel;
    }
};

var wrapperFragmentOnly = function ( fn, name ) {
    return function () {
        if ( !this._fragmentShaderMode )
            this.logError( 'This function should not be called from vertex shader : ' + name );
        return fn.apply( this, arguments );
    };
};


for ( var fnName in CompilerFragment ) {
    CompilerFragment[ fnName ] = wrapperFragmentOnly( CompilerFragment[ fnName ], fnName );
}

module.exports = CompilerFragment;
