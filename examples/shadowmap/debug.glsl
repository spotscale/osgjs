#define OPT_ARG_jitter
#define OPT_INSTANCE_ARG_jitter
#define OPT_ARG_outDistance
#define OPT_INSTANCE_ARG_outDistance

#pragma include "tapPCF.glsl"

#pragma DECLARE_FUNCTION DERIVATIVES:enable
float shadowReceive(const in bool lighted,
                    const in vec3 normalWorld,
                    const in vec3 vertexWorld,
                    const in sampler2D shadowTexture,
                    const in vec2 shadowSize,

                    const in vec3 shadowProjection,
                    const in vec4 shadowViewRight,
                    const in vec4 shadowViewUp,
                    const in vec4 shadowViewLook,

                    const in vec2 shadowDepthRange,
                    const in float shadowBias) {

    // 0 for early out
    bool earlyOut = false;

    // Calculate shadow amount
    float shadow = 1.0;

    if (!lighted) {
        shadow = 0.0;
        earlyOut = true;
    }

    if (shadowDepthRange.x == shadowDepthRange.y) {
        earlyOut = true;
    }

    vec4 shadowVertexEye;
    vec4 shadowNormalEye;
    float shadowReceiverZ = 0.0;
    vec4 shadowVertexProjected;
    vec2 shadowUV;
    float N_Dot_L;
    float invDepthRange;

    if (!earlyOut) {

        //shadowVertexEye =  shadowViewMatrix *  vec4(vertexWorld, 1.0);
        
        shadowVertexEye.x = dot(shadowViewRight.xyz, vertexWorld.xyz) + shadowViewRight.w;
        shadowVertexEye.y = dot(shadowViewUp.xyz, vertexWorld.xyz) + shadowViewUp.w;
        shadowVertexEye.z = dot(shadowViewLook.xyz, vertexWorld.xyz) + shadowViewLook.w;
        shadowVertexEye.w = 1.0;

        vec3 shadowLightDir = vec3(0.0, 0.0, 1.0); // in shadow view light is camera
        vec4 normalFront = vec4(normalWorld, 0.0);
        //shadowNormalEye =  shadowViewMatrix * normalFront;
        //N_Dot_L = dot(shadowNormalEye.xyz, shadowLightDir);

        // derivated, only need z.
        //vec3 shadowLightDir = vec3(0.0, 0.0, 1.0); // in shadow view light is camera
        //shadowNormalEye =  shadowViewMatrix * normalFront;
        //shadowNormalEye.x = dot(shadowViewRight.xyz, normalWorld.xyz);
        //shadowNormalEye.y = dot(shadowViewUp.xyz, normalWorld.xyz);
        shadowNormalEye.z = dot(shadowViewLook.xyz, normalWorld.xyz);
        //shadowNormalEye.w = 0.0;

        //N_Dot_L = dot(shadowNormalEye.xyz, shadowLightDir);
        N_Dot_L = shadowNormalEye.z;

        if (!earlyOut) {
            invDepthRange = 1.0 / (shadowDepthRange.y - shadowDepthRange.x);
        
            //shadowVertexProjected = shadowProjectionMatrix * shadowVertexEye;
            
            // derivated optimisation
            shadowVertexProjected.x = shadowProjection.x * shadowVertexEye.x;
            shadowVertexProjected.y = shadowProjection.y * shadowVertexEye.y;
            shadowVertexProjected.z = - shadowVertexEye.z - (2.0 * shadowDepthRange.x * shadowVertexEye.w);
            shadowVertexProjected.w = - shadowVertexEye.z;

            if (shadowVertexProjected.w < 0.0) {
                earlyOut = true; // notably behind camera
            }

        }

        if (!earlyOut) {

            shadowUV.xy = shadowVertexProjected.xy / shadowVertexProjected.w;
            shadowUV.xy = shadowUV.xy * 0.5 + 0.5;// mad like

            if (any(bvec4 ( shadowUV.x > 1., shadowUV.x < 0., shadowUV.y > 1., shadowUV.y < 0.))) {
                earlyOut = true;// limits of light frustum
            }

            // most precision near 0, make sure we are near 0 and in [0,1]
            shadowReceiverZ = - shadowVertexEye.z;
            shadowReceiverZ =  (shadowReceiverZ - shadowDepthRange.x) * invDepthRange;

            if(shadowReceiverZ < 0.0) {
                earlyOut = true; // notably behind camera
            }

        }
    }

    return earlyOut ? 0.0 : texture2DCompare(shadowTexture, shadowUV, shadowReceiverZ, vec4(0.0, 0.0, 1.0, 1.0));

}
