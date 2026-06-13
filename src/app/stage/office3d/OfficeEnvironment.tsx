// office3d/OfficeEnvironment.tsx — procedural environment map for PBR reflections
'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { SKY_COLORS } from './constants';

/**
 * Generates a gradient sky texture on a canvas, then converts it to a
 * PMREM-processed environment map via a cube camera render.
 * This gives all MeshStandardMaterial surfaces subtle reflections
 * without needing an external HDR file.
 */
function createGradientEnvMap(
    renderer: THREE.WebGLRenderer,
    topColor: string,
    bottomColor: string,
): THREE.Texture {
    // Build a tiny scene with a gradient sphere
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Vertical gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, topColor);
    gradient.addColorStop(1, bottomColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const gradientTexture = new THREE.CanvasTexture(canvas);
    gradientTexture.colorSpace = THREE.SRGBColorSpace;
    gradientTexture.mapping = THREE.EquirectangularReflectionMapping;

    // Use PMREMGenerator to create a proper prefiltered env map
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envMap = pmrem.fromEquirectangular(gradientTexture).texture;

    // Cleanup intermediates
    gradientTexture.dispose();
    pmrem.dispose();

    return envMap;
}

export function OfficeEnvironment({
    period,
}: {
    period: 'day' | 'dusk' | 'night';
}) {
    const gl = useThree(s => s.gl);
    const { scene } = useThree();

    const envMap = useMemo(
        () => createGradientEnvMap(gl, SKY_COLORS[period].top, SKY_COLORS[period].bottom),
        [gl, period],
    );

    // Apply to scene and cleanup on change/unmount
    useEffect(() => {
        // Three.js scene is external mutable renderer state; apply environment imperatively.
        // eslint-disable-next-line react-hooks/immutability
        scene.environment = envMap;
        return () => {
            scene.environment = null;
            envMap.dispose();
        };
    }, [scene, envMap]);

    return null;
}
