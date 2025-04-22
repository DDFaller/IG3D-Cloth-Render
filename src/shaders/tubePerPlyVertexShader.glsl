precision highp float;

uniform float uTime;
uniform float uFiberRadiusMax;
uniform float uFiberRadiusMin;
uniform float uTwistRate;
uniform float uFiberCount;
uniform sampler2D uCurveTex;
uniform float uCurveTexSize;
uniform float uCurveTexWidth;
uniform float uCurveTexHeight;
uniform float uCoreRadius;
uniform float uEllipseCos;
uniform float uEllipseSin;
uniform float uMigrationFrequency;
uniform float uWiggleFrequency;
uniform float uWiggleStrength;

attribute float aCurveT;
attribute float aRadialT;
attribute float aPlyIndex;
attribute float aCurveIndex;
attribute float aFiberType;

varying vec3 vColor;
varying float vPlyIndex;
varying float vFiberType;

const float PI = 3.14159265359;

vec3 getCurvePoint(float index) {
    float x = mod(index, uCurveTexWidth);
    float y = floor(index / uCurveTexWidth);
    vec2 uv = vec2(
        (x + 0.5) / uCurveTexWidth,
        (y + 0.5) / uCurveTexHeight
    );
    return texture2D(uCurveTex, uv).xyz;
}

void main() {
    // Base da curva
    vec3 center = getCurvePoint(aCurveIndex);
    vec3 prev = getCurvePoint(aCurveIndex - 1.0);
    vec3 next = getCurvePoint(aCurveIndex + 1.0);
    vec3 tangent = normalize(next - prev);

    // Frame local (N, B)
    vec3 up = vec3(0.0, 1.0, 0.0);
    if (abs(dot(up, tangent)) > 0.99) {
        up = vec3(1.0, 0.0, 0.0);
    }
    vec3 normal = normalize(up - dot(up, tangent) * tangent);
    vec3 binormal = normalize(cross(tangent, normal));

    // Ângulos base
    float anglePly = 2.0 * PI * aPlyIndex / uFiberCount;
    float angleRadial = 2.0 * PI * aRadialT;
    float twistAngle = uTwistRate * 2.0 * PI * aCurveT;
    float totalAngle = angleRadial + twistAngle;
    float theta = aCurveT * uTwistRate * 2.0 * PI;

    // ------------------------------
    // Ply center ao redor do core (com torção aplicada)
    // ------------------------------
    float combinedPlyAngle = anglePly + twistAngle;

    vec3 plyCenter = uCoreRadius * (
        cos(combinedPlyAngle) * normal * uEllipseCos +
        sin(combinedPlyAngle) * binormal * uEllipseSin
    );

    // ------------------------------
    // Fiber offset (Migration, Loop, Hair)
    // ------------------------------
    vec3 fiberOffset = vec3(0.0);

    if (int(aFiberType) == 0) {
        // Migration
        float radius = 0.5 * (
            uFiberRadiusMax + uFiberRadiusMin +
            (uFiberRadiusMax - uFiberRadiusMin) * cos(combinedPlyAngle * uMigrationFrequency)
        );

        fiberOffset = radius * (
            cos(combinedPlyAngle) * normal * uEllipseCos +
            sin(combinedPlyAngle) * binormal * uEllipseSin
        );

    } else if (int(aFiberType) == 1) {
        // Loop
        float radius = 0.5 * (
            uFiberRadiusMax * 1.6 + uFiberRadiusMin +
            (uFiberRadiusMax * 1.6 - uFiberRadiusMin) * sin(twistAngle)
        );

        fiberOffset = radius * (
            cos(combinedPlyAngle) * normal * uEllipseCos +
            sin(combinedPlyAngle) * binormal * uEllipseSin
        );

    } else if (int(aFiberType) == 2) {
        // Hair
        float wiggle = abs(sin(uTime * uWiggleFrequency + aCurveT * uWiggleFrequency));
        float maxWiggleRadius = uFiberRadiusMax * 1.5;
        float minWiggleRadius = uFiberRadiusMin * 0.2;
        float radius = mix(maxWiggleRadius, minWiggleRadius, wiggle * uWiggleStrength);

        fiberOffset = radius * (
            cos(theta + anglePly) * normal +
            sin(theta + anglePly) * binormal
        );
    }

    // ------------------------------
    // Radial offset (segmento tubular)
    // ------------------------------
    vec3 radialOffset = uFiberRadiusMax * (
        cos(totalAngle) * normal * uEllipseCos +
        sin(totalAngle) * binormal * uEllipseSin
    );

    // ------------------------------
    // Posição final do vértice
    // ------------------------------
    vec3 pos = center + plyCenter + fiberOffset + radialOffset;

    vColor = vec3(aCurveT, aRadialT, 1.0 - aCurveT);
    vPlyIndex = aPlyIndex;
    vFiberType = aFiberType;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
