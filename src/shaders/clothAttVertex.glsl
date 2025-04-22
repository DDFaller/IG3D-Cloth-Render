precision highp float;

uniform float resolution;
uniform float fiberCount;
uniform float fiberRadiusMin;
uniform float fiberRadiusMax;
uniform float fiberTwistRate;
uniform float ellipseCos;
uniform float ellipseSin;
uniform float migrationFrequency;
uniform bool enableMigration;
uniform float hairAcceptanceThreshold;
uniform float hairWiggleFrequency;
uniform float hairWiggleStrength;
uniform float hairSharpnessIn;
uniform float hairSharpnessOut;

attribute vec3 aPreviousPosition;
attribute vec3 aCurrPosition;
attribute vec3 aNextPosition;
attribute float aPlyIndex;
attribute float aCurveT;
attribute float aNextCurveT;
attribute float aFiberType;

varying float vPlyIndex;
varying vec3 vTangent;
varying float vFiberType;
varying float vShouldDiscardHair;

const float PI = 3.14159265359;

vec3 estimateTangent(vec3 prev, vec3 next) {
  return normalize(next - prev);
}

vec3 estimateNormal(vec3 tangent) {
  vec3 base = vec3(0.0, 0.0, 1.0);
  vec3 projection = dot(base, tangent) * tangent;
  vec3 normal = base - projection;
  return normalize(normal);
}

vec3 estimateBinormal(vec3 tangent, vec3 normal) {
  return normalize(cross(tangent, normal));
}

float noisy(float x){
  return fract(sin(x * 91.3458) * 47453.5453);
}

void main() {
  float t = mod(float(gl_VertexID), resolution) / max((resolution - 1.0), 1.0);
  float tCurve = mix(aCurveT, aNextCurveT, t);
  float initialAngle = 2.0 * PI * aPlyIndex / fiberCount;
  float twistAngle = fiberTwistRate * 2.0 * PI * tCurve;
  float combinedAngle = initialAngle + twistAngle;

  vec3 p = mix(aCurrPosition, aNextPosition, t);
  vec3 tangent = estimateTangent(aCurrPosition, aNextPosition);
  vec3 normal = estimateNormal(tangent);   // N̂
  vec3 binormal = estimateBinormal(tangent, normal); // B̂ = T̂ × N̂

  float radius = fiberRadiusMax;
  vec3 offset = vec3(0.0);
  
  //Avoid undefined problems
  vShouldDiscardHair = 0.0;
  if (enableMigration) {
    float Ri = 1.0;
    float localRmax = fiberRadiusMax;

    // Loop fiber: increase max radius
    if (int(aFiberType) == 1) {
      localRmax *= 1.6;
    }

    if (int(aFiberType) == 0 || int(aFiberType) == 1) {
      radius = 0.5 * Ri * (
        localRmax +
        fiberRadiusMin +
        (localRmax - fiberRadiusMin) * cos(initialAngle + migrationFrequency * twistAngle)
      );

      offset = radius * cos(combinedAngle) * normal * ellipseCos +
               radius * sin(combinedAngle) * binormal * ellipseSin;
    }

    // Hair fiber behavior
    if (int(aFiberType) == 2) {
      float Rhair_max = fiberRadiusMax * 1.4;
      float twistRateHair = fiberTwistRate * 1.7;
      float combinedHairAngle = initialAngle + twistRateHair * 2.0 * PI * tCurve;

      float periodicRaw = sin(2.0 * PI * hairWiggleFrequency * tCurve); // periodicidade do "wiggle"
      float isGrowing = step(tCurve, 0.5); // 1 se tCurve < 0.5
      float wiggle = abs(periodicRaw);

      // Aplicar sharpness personalizado
      float shapedWiggle = mix(
        pow(wiggle, hairSharpnessIn),
        1.0 - pow(1.0 - wiggle, hairSharpnessOut),
        isGrowing
      );

      float radiusHair = mix(Rhair_max, fiberRadiusMin, shapedWiggle);
      if (shapedWiggle < hairAcceptanceThreshold) {
        vShouldDiscardHair = 1.0;
      }

      offset = hairWiggleStrength * (
        radiusHair * cos(combinedHairAngle) * normal * ellipseCos +
        radiusHair * sin(combinedHairAngle) * binormal * ellipseSin
      );
    }
  }

  vec3 finalPos = p + offset;

  vPlyIndex = aPlyIndex;
  vTangent = tangent;
  vFiberType = aFiberType;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
  gl_PointSize = 5.0;
}
