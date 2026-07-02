"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

function hexToVec3(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const int = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255];
}

interface WarpDriveShaderProps {
  /** Tint of the tunnel. Defaults to Cifra emerald. */
  color?: string;
  /** "fixed" = full-viewport ambient bg (z -1); "absolute" = fills its relative parent. */
  variant?: "fixed" | "absolute";
  /** Overall brightness multiplier (0–1). Lower = subtler. */
  intensity?: number;
  className?: string;
}

/** An interactive WebGL "warp tunnel" — retinted to read as streaming ciphertext, not a rainbow. */
export default function WarpDriveShader({
  color = "#10b981",
  variant = "fixed",
  intensity = 0.7,
  className = "",
}: WarpDriveShaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const clock = new THREE.Clock();

    const vertexShader = `void main() { gl_Position = vec4(position, 1.0); }`;

    const fragmentShader = `
      precision highp float;
      uniform vec2 iResolution;
      uniform float iTime;
      uniform vec2 iMouse;
      uniform vec3 uTint;
      uniform float uIntensity;

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
        vec2 mouse = (iMouse - 0.5 * iResolution.xy) / iResolution.y;
        float t = iTime * 0.4;
        uv -= mouse * 0.5;

        float r = length(uv) * 0.8;
        float offset = 0.008;
        // Two channels around the emerald tint for subtle depth.
        float core = pow(fract(0.5 / length(uv) + t * 2.0), 15.0);
        float edge = pow(fract(0.5 / length(uv + vec2(offset, 0.0)) + t * 2.0), 15.0);

        float fade = smoothstep(0.0, 0.14, r);
        vec3 col = (uTint * core + uTint * 0.5 * edge) * fade * uIntensity;
        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const [tr, tg, tb] = hexToVec3(color);
    const uniforms = {
      iTime: { value: 0 },
      iResolution: { value: new THREE.Vector2() },
      iMouse: { value: new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2) },
      uTint: { value: new THREE.Vector3(tr, tg, tb) },
      uIntensity: { value: intensity },
    };

    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms });
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const onResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height);
      uniforms.iResolution.value.set(width, height);
    };
    window.addEventListener("resize", onResize);
    onResize();

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      uniforms.iMouse.value.set(e.clientX - rect.left, container.clientHeight - (e.clientY - rect.top));
    };
    window.addEventListener("mousemove", onMouseMove);

    renderer.setAnimationLoop(() => {
      uniforms.iTime.value = clock.getElapsedTime();
      renderer.render(scene, camera);
    });

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      renderer.setAnimationLoop(null);
      const canvas = renderer.domElement;
      canvas?.parentNode?.removeChild(canvas);
      material.dispose();
      geometry.dispose();
      renderer.dispose();
    };
  }, [color, intensity]);

  const base =
    variant === "fixed"
      ? "fixed inset-0 -z-10 h-screen w-screen"
      : "absolute inset-0 h-full w-full";

  return <div ref={containerRef} className={`pointer-events-none ${base} ${className}`} aria-label="Animated background" />;
}
