// tubeVertexShader.glsl
precision highp float;

uniform float time;
uniform float fiberTwistRate;
uniform float hairWiggleStrength;
uniform float hairWiggleFrequency;

attribute float aFiberType;

varying float vFiberType;
varying vec3 vNormal;

void main() {
  vFiberType = aFiberType;

  // Transform vertex position for hair fibers
  vec3 transformed = position;

  if (int(aFiberType) == 2) {
    float wave = sin(position.y * hairWiggleFrequency + time) * hairWiggleStrength;
    transformed.x += normal.x * wave;
    transformed.y += normal.y * wave;
    transformed.z += normal.z * wave;
  }

  // Optional twist effect
  float twistAngle = fiberTwistRate * position.y;
  float c = cos(twistAngle);
  float s = sin(twistAngle);
  mat3 twist = mat3(
    c, 0.0, -s,
    0.0, 1.0, 0.0,
    s, 0.0, c
  );
  transformed = twist * transformed;

  vNormal = normalize(normalMatrix * normal);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}
