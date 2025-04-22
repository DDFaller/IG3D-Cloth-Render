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
    // ---- Cor base com variação suave por ply ----
    float hueVariation = random(vec2(vPlyIndex, vPlyIndex + 1.0)) * 0.05; // pequena variação
    float brightness = 0.9 + random(vPosition.xy + vPlyIndex) * 0.1;

    vec3 baseColor = uColor + hueVariation;
    baseColor *= brightness;

    // ---- Efeito de iluminação direcional ----
    vec3 lightDir = normalize(vec3(0.0, 0.0, 1.0)); // luz de frente (câmera)
    float facing = dot(normalize(vNormal), lightDir);
    float specularHighlight = pow(max(facing, 0.0), 8.0);

    // ---- Influência do tipo de fibra ----
    float fiberTone = 1.0;
    if (int(vFiberType) == 1) {
        fiberTone = 1.2; // loop = mais saturado
    } else if (int(vFiberType) == 2) {
        fiberTone = 0.85; // hair = menos saturado
    }

    vec3 finalColor = baseColor * fiberTone + specularHighlight * 0.2;

    gl_FragColor = vec4(finalColor, 1.0);
}
