// Defina a cena, câmera e renderizador
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Carregar o arquivo JSON com as curvas
fetch('http://localhost:8080/1_thread.json')
  .then(response => response.json())
  .then(data => {
    const curveData = data.curves[0];
    const points = curveData.points;

    const flatPoints = points.flat();
    const numPoints = points.length;
    const resolutionFactor = 40;
    const totalVerts = (numPoints - 1) * resolutionFactor;
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(new Array(totalVerts * 3).fill(0), 3)
    );

    const vertexShader = `
      precision mediump float;
      uniform vec3 curvePoints[6];
      uniform int numPoints;
      uniform float resolutionFactor;

      void main() {
        int segment = int(gl_VertexID / int(resolutionFactor));
        float localT = float(gl_VertexID % int(resolutionFactor)) / resolutionFactor;

        vec3 a = curvePoints[segment];
        vec3 b = curvePoints[segment + 1];
        vec3 pos = mix(a, b, localT);

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = 4.0; // Mostra como ponto
      }
    `;

    const fragmentShader = `
      precision mediump float;
      void main() {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); // Vermelho
      }
    `;
    console.log("Before error?")
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        curvePoints: { value: points.map(p => new THREE.Vector3(...p)) },
        numPoints: { value: numPoints },
        resolutionFactor: { value: resolutionFactor }
      }
    });
    const pointMesh = new THREE.Points(geometry, material);
    scene.add(pointMesh);
    
    // Posição da câmera
    camera.position.z = 6;
    
    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }
    
    animate();
    console.log("After error?")
  });

// Ajustar tamanho da tela
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});
