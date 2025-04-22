precision highp float;

uniform vec3 uColor;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vPlyIndex;
varying float vFiberType;

float random(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    // ---- Base color with smooth variation per ply ----
    float hueVariation = random(vec2(vPlyIndex, vPlyIndex + 1.0)) * 0.05; // small hue shift
    float brightness = 0.9 + random(vPosition.xy + vPlyIndex) * 0.1; // slight brightness noise

    vec3 baseColor = uColor + hueVariation;
    baseColor *= brightness;

    // ---- Directional lighting effect ----
    vec3 lightDir = normalize(vec3(0.0, 0.0, 1.0)); // light coming from camera
    float facing = dot(normalize(vNormal), lightDir);
    float specularHighlight = pow(max(facing, 0.0), 8.0); // specular strength

    // ---- Influence of fiber type on tone ----
    float fiberTone = 1.0;
    if (int(vFiberType) == 1) {
        fiberTone = 1.2; // loop = slightly more saturated
    } else if (int(vFiberType) == 2) {
        fiberTone = 0.85; // hair = slightly desaturated
    }

    vec3 finalColor = baseColor * fiberTone + specularHighlight * 0.2;

    gl_FragColor = vec4(finalColor, 1.0);
}
