precision highp float;

uniform float numPeriods;

varying float vCurveT; // veio do vertex
varying float vPlyIndex;

vec3 getColorForFiberType(int type) {
  if (type == 0) return vec3(0.0, 0.7, 1.0);     // Migration → azul
  if (type == 1) return vec3(1.0, 0.6, 0.2);     // Loop → laranja
  if (type == 2) return vec3(1.0, 0.0, 0.8);     // Hair → rosa
  return vec3(1.0);                              // Fallback → branco
}

// Mesmo algoritmo do vertex
int determineFiberType(float t, float periods) {
  float periodIndex = floor(t * periods);
  float noiseSeed = mod(periodIndex * 17.0, 10.0); // hash simples

  if (noiseSeed < 7.0) return 0;
  else if (noiseSeed < 9.0) return 1;
  else return 2;
}

void main() {
  int fiberType = determineFiberType(vCurveT, numPeriods);
  vec3 color = getColorForFiberType(fiberType);
  gl_FragColor = vec4(color, 1.0);
}
