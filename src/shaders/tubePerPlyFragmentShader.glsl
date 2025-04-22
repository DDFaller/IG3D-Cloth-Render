precision highp float;

varying vec3 vColor;
varying float vFiberType;

void main() {
    vec3 color;
    if (int(vFiberType) == 0) color = vec3(1.0, 0.0, 0.0);   // Migration
    else if (int(vFiberType) == 1) color = vec3(0.0, 1.0, 0.0); // Loop
    else color = vec3(0.0, 0.0, 1.0); // Hair

    gl_FragColor = vec4(color, 1.0);
}