// tubeFragmentShader.glsl
precision highp float;

varying float vFiberType;
varying vec3 vNormal;

void main() {
  vec3 baseColor;

  if (int(vFiberType) == 0) {
    baseColor = vec3(0.9, 0.5, 0.3); // migration: laranja
  } else if (int(vFiberType) == 1) {
    baseColor = vec3(0.2, 0.6, 0.9); // loop: azul
  } else {
    baseColor = vec3(0.8, 0.8, 0.2); // hair: amarelo
  }

  vec3 lightDir = normalize(vec3(0.3, 1.0, 0.7));
  float light = dot(vNormal, lightDir);
  light = clamp(light, 0.2, 1.0); // ambient + diffuse

  gl_FragColor = vec4(baseColor * light, 1.0);
}
