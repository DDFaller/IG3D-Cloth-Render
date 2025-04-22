precision highp float;

uniform sampler2D curveTexture;
uniform float resolution;
uniform float fiberCount;
uniform float fiberRadiusMin;
uniform float fiberRadiusMax;
uniform float fiberTwistRate;
uniform float migrationFrequency;
uniform bool enableMigration;

attribute vec3 aCurrPosition;
const float PI = 3.14159265359;

vec3 estimateTangent(int segmentIndex) {
  vec3 p0 = texelFetch(curveTexture, ivec2(segmentIndex, 0), 0).xyz;
  vec3 p1 = texelFetch(curveTexture, ivec2(segmentIndex + 1, 0), 0).xyz;
  return normalize(p1 - p0);
}

vec3 estimateNormal(vec3 tangent) {
  return normalize(cross(tangent, vec3(0.0, 1.0, 0.0)));
}

vec3 estimateBinormal(vec3 tangent, vec3 normal) {
  return normalize(cross(tangent, normal));
}

void main() {
  int id = gl_VertexID;

  int plyIndex = id / int(resolution);
  int segmentIndex = id % int(resolution);
  float t = float(segmentIndex) / float(resolution);

  float initialAngle = 2.0 * PI * float(plyIndex) / fiberCount;
  float twistAngle = fiberTwistRate * 2.0 * PI * t;
  float combinedAngle = initialAngle + twistAngle;

  vec3 p = texelFetch(curveTexture, ivec2(segmentIndex, 0), 0).xyz;

  vec3 tangent = estimateTangent(segmentIndex);
  vec3 normal = estimateNormal(tangent);
  vec3 binormal = estimateBinormal(tangent, normal);

  float radius = fiberRadiusMax;
  if (enableMigration) {
    float Ri = 1.0;
    radius = 0.5 * Ri * (
      fiberRadiusMax +
      fiberRadiusMin +
      (fiberRadiusMax - fiberRadiusMin) * cos(initialAngle + migrationFrequency * twistAngle)
    );
  }

  vec3 offset = radius * cos(combinedAngle) * normal +
                radius * sin(combinedAngle) * binormal;

  vec3 finalPos = p + offset;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(aCurrPosition, 1.0);
}
