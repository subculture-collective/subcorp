// office3d/materials.ts — shared material instances to reduce GPU duplication
'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { COLORS } from './constants';

/** Hook that returns a stable set of reusable materials for the office scene.
 *  All materials are created once and shared across components via context-free props. */
export function useOfficeMaterials() {
    return useMemo(() => {
        // ─── Surfaces (desks, shelves, baseboards, partitions) ───
        const surface0 = new THREE.MeshStandardMaterial({
            color: COLORS.surface0,
            roughness: 0.7,
        });
        const surface1 = new THREE.MeshStandardMaterial({
            color: COLORS.surface1,
        });
        const surface2 = new THREE.MeshStandardMaterial({
            color: COLORS.surface2,
            roughness: 0.8,
        });

        // ─── Wall material ───
        const mantle = new THREE.MeshStandardMaterial({
            color: COLORS.mantle,
        });

        // ─── Dark screens / bezels ───
        const darkScreen = new THREE.MeshStandardMaterial({
            color: '#0a0a15',
        });

        // ─── Wood / organic ───
        const wood = new THREE.MeshStandardMaterial({
            color: '#4a3a2a',
            roughness: 0.8,
        });
        const darkWood = new THREE.MeshStandardMaterial({
            color: '#2a2030',
            roughness: 0.9,
        });

        // ─── Fabric ───
        const couchFabric = new THREE.MeshStandardMaterial({
            color: '#2a2040',
            roughness: 0.9,
        });

        // ─── Metal (server racks, legs) ───
        const serverBody = new THREE.MeshStandardMaterial({
            color: '#1a1a28',
            roughness: 0.7,
            metalness: 0.4,
        });
        const serverPanel = new THREE.MeshStandardMaterial({
            color: '#0a0a15',
            roughness: 0.8,
            metalness: 0.3,
        });

        // ─── Plant foliage ───
        const foliageDark = new THREE.MeshStandardMaterial({
            color: '#166534',
            roughness: 0.9,
        });
        const foliageLight = new THREE.MeshStandardMaterial({
            color: '#15803d',
            roughness: 0.9,
        });

        // ─── Coffee machine ───
        const coffeeBody = new THREE.MeshStandardMaterial({
            color: '#4a3a2a',
            roughness: 0.8,
        });
        const coffeeLid = new THREE.MeshStandardMaterial({
            color: '#6a4a2a',
        });

        // ─── Partition ───
        const partitionCap = new THREE.MeshStandardMaterial({
            color: COLORS.surface1,
        });

        // ─── Window glass (template — per-period instances are separate) ───
        // Not included here since glass color depends on time-of-day period

        return {
            surface0,
            surface1,
            surface2,
            mantle,
            darkScreen,
            wood,
            darkWood,
            couchFabric,
            serverBody,
            serverPanel,
            foliageDark,
            foliageLight,
            coffeeBody,
            coffeeLid,
            partitionCap,
        };
    }, []);
}

export type OfficeMaterials = ReturnType<typeof useOfficeMaterials>;
