# 🧵 Real-Time Fiber-Level Cloth Rendering in WebGL

This project explores fiber-level cloth rendering directly in the browser using **React Three Fiber (R3F)**, **Three.js**, and **WebGL**. Inspired by Wu and Yuksel’s 2017 paper, it aims to replicate procedural fiber geometry while adapting to the limitations of WebGL (e.g., no tessellation shaders).

## 📽️ Presentation and Report
- 📄 [Final Report (PDF)](./IG3D_DanielFaller.pdf)
- 🎞️ [Video Presentation](https://drive.google.com/file/d/1nay7CfuIb5muW8W6aiBGfQUvzYCHoj9P/view?usp=sharing)

## 🔧 Features
- Per-fiber type variation: **migration**, **loop**, and **hair**
- `plyCenter` and `radialOffset` attributes passed to GPU for procedural offsetting
- Real-time parameter adjustment (twist, resolution, radius, count)
- GUI controls using [Leva](https://leva.pmnd.rs/)
- Optional tube geometry mode with configurable `radialSegments`
- CPU-based pseudo-tessellation with Catmull-Rom curve interpolation

## 💡 Implementation Highlights
- **CPU-side Geometry Generation:** Fibers are generated procedurally in JS due to WebGL’s lack of tessellation support.
- **Dynamic Interpolation:** A resolution parameter controls automatic subdivision of control points, allowing smoother geometry.
- **Shader Customization:** Vertex shaders handle twist and offset; fragment shaders visualize fiber properties.

## ⚠️ Limitations
- ❌ No shadow maps or volumetric self-shadowing
- ❌ No Level of Detail (LoD)
- ❌ Limited performance scaling for large cloths

## 🚀 How to Run
1. Clone the repository:
   ```bash
   git clone https://github.com/DDFaller/IG3D-Cloth-Render.git
   cd IG3D-Cloth-Render
   ```

2. Install dependencies:
    ```bash
    npm install
    ```
3. Run dev server:
    ```bash
    npm run dev
    ```

### Reference
Wu, H. and Yuksel, C., “Real-time Rendering of Fiber-level Cloth,” ACM Transactions on Graphics (TOG), 2017.