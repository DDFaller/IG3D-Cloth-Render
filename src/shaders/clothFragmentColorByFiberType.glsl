varying float vFiberType;
varying float vShouldDiscardHair;

void main() {
  vec3 color;
  int fiberType = int(vFiberType);
  if (fiberType == 0) {
    color = vec3(0.0, 0.0, 1.0); // Migration - Blue
  } else if (fiberType == 1) {
    color = vec3(1.0, 0.0, 0.0); // Loop - Red
  } else if (fiberType == 2 && vShouldDiscardHair == 0.0){
    color = vec3(0.0, 1.0, 0.0); // Hair - Green
  }
  else{
    discard;
  }
  gl_FragColor = vec4(color, 1.0);
}