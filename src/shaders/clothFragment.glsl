precision mediump float;

varying float vPlyIndex;
varying vec3 vTangent;

void main() {
  vec3 color = vec3(
    fract(vPlyIndex * 0.3),
    fract(vPlyIndex * 0.6),
    fract(vPlyIndex * 0.9)
  );

  gl_FragColor = vec4(normalize(vTangent) * 0.5 + 0.5, 1.0);
}
