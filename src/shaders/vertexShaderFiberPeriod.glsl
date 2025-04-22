precision highp float;

uniform float resolution;
uniform float fiberCount;
uniform float fiberRadiusMin;
uniform float fiberRadiusMax;
uniform float fiberTwistRate;
uniform float migrationFrequency;
uniform bool enableMigration;

// Novo parâmetro: número de períodos ao longo da curva
uniform float numPeriods; 

attribute vec3 aPreviousPosition;
attribute vec3 aCurrPosition;
attribute vec3 aNextPosition;
attribute float aPlyIndex;
attribute float aCurveT;
attribute float aNextCurveT;

varying float vPlyIndex;
varying vec3 vTangent;
varying float vCurveT;

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

// Gera tipo de fibra baseado no período atual
int determineFiberType(float t, float periods) {
  float periodIndex = floor(t * periods);
  float noiseSeed = mod(periodIndex * 17.0, 10.0); // hash básico

  if (noiseSeed < 7.0) return 0;       // Migration
  else if (noiseSeed < 9.0) return 1;  // Loop
  else return 2;                       // Hair
}

void main() {
  float t = mod(float(gl_VertexID), resolution) / max((resolution - 1.0), 1.0);
  float tCurve = mix(aCurveT, aNextCurveT, t);
  float twistAngle = fiberTwistRate * 2.0 * PI * tCurve;
  float initialAngle = 2.0 * PI * aPlyIndex / fiberCount;
  float combinedAngle = initialAngle + twistAngle;

  vec3 p = mix(aCurrPosition, aNextPosition, t);
  vec3 tangent = estimateTangent(aCurrPosition, aNextPosition);
  vec3 normal = estimateNormal(tangent);
  vec3 binormal = estimateBinormal(tangent, normal);

  float localRmax = fiberRadiusMax;
  int fiberType = determineFiberType(tCurve, numPeriods);

  // Ajuste de tipo
  if (fiberType == 1) {
    localRmax *= 1.5; // Loop fibers
  }

  float radius = localRmax;

  if (fiberType == 2) {
    // Hair fibers: corta parte final do período
    float localT = fract(tCurve * numPeriods);
    if (localT > 0.4) {
      gl_Position = vec4(0.0); // descarta (ou use discard no fragment)
      return;
    }

    float tailFactor = localT;
    vec3 randomDir = normalize(binormal + normal);
    radius = localRmax * (1.0 + tailFactor * 2.5);
    p += radius * randomDir; // desloca diretamente
  } else {
    radius = 0.5 * (
      localRmax + fiberRadiusMin +
      (localRmax - fiberRadiusMin) * cos(initialAngle + migrationFrequency * twistAngle)
    );

    vec3 offset = radius * cos(combinedAngle) * normal +
                  radius * sin(combinedAngle) * binormal;

    p += offset;
  }

  vPlyIndex = aPlyIndex;
  vTangent = tangent;
  vCurveT = tCurve;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = 4.0;
}
