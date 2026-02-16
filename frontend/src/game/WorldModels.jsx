import React, { useMemo, useRef } from 'react';
import { useGLTF, Html, Float, Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ============================================================
   Generic GLB Model loader — clones scene so React can reuse it
   ============================================================ */
function GLBModel({ url, position = [0, 0, 0], scale = 1, rotation = [0, 0, 0], label, labelColor = '#fff', castShadow = true }) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(), [scene]);
  return (
    <group position={position} rotation={rotation}>
      <primitive object={cloned} scale={scale} castShadow={castShadow} receiveShadow />
      {label && (
        <Html position={[0, 4, 0]} center distanceFactor={40}>
          <div style={{
            background: 'rgba(0,0,0,0.75)',
            padding: '4px 8px',
            borderRadius: '6px',
            color: labelColor,
            fontSize: '11px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            border: `1px solid ${labelColor}44`,
            textShadow: `0 0 6px ${labelColor}`,
          }}>
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}

/* ============================================================
   Animated model wrapper — plays all animations in the GLB
   ============================================================ */
function AnimatedGLBModel({ url, position = [0, 0, 0], scale = 1, rotation = [0, 0, 0], label, labelColor = '#fff' }) {
  const { scene, animations } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(), [scene]);
  const mixerRef = useRef();

  useMemo(() => {
    if (animations && animations.length > 0) {
      const mixer = new THREE.AnimationMixer(cloned);
      animations.forEach((clip) => {
        const action = mixer.clipAction(clip);
        action.play();
      });
      mixerRef.current = mixer;
    }
  }, [cloned, animations]);

  useFrame((_, delta) => {
    if (mixerRef.current) mixerRef.current.update(delta);
  });

  return (
    <group position={position} rotation={rotation}>
      <primitive object={cloned} scale={scale} castShadow receiveShadow />
      {label && (
        <Html position={[0, 4, 0]} center distanceFactor={40}>
          <div style={{
            background: 'rgba(0,0,0,0.75)',
            padding: '4px 8px',
            borderRadius: '6px',
            color: labelColor,
            fontSize: '11px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            border: `1px solid ${labelColor}44`,
            textShadow: `0 0 6px ${labelColor}`,
          }}>
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}

/* ============================================================
   WORLD MODELS — all your downloaded assets placed in the world
   ============================================================ */
export default function WorldModels() {
  return (
    <group>

      {/* ===================== CASTLES & BUILDINGS ===================== */}

      {/* Haunted Castle — dark ruins on the far east ridge */}
      <GLBModel
        url="/models/haunted_castle.glb"
        position={[80, 1, -70]}
        scale={4}
        rotation={[0, -Math.PI / 4, 0]}
        label="Haunted Castle"
        labelColor="#ff4444"
      />

      {/* Sea Keep — lonely watcher tower on the west coast */}
      <GLBModel
        url="/models/sea_keep_lonely_watcher.glb"
        position={[-75, 1, -80]}
        scale={3}
        rotation={[0, Math.PI / 6, 0]}
        label="Sea Keep"
        labelColor="#5ad7ff"
      />

      {/* Castle Byers — small fort tucked in the woods */}
      <GLBModel
        url="/models/castle_byers.glb"
        position={[-50, 1, 40]}
        scale={3}
        rotation={[0, Math.PI / 3, 0]}
        label="Castle Byers"
        labelColor="#ffd700"
      />

      {/* Stone Wall — defensive wall segments flanking the main castle */}
      <GLBModel
        url="/models/stone_castle_wall_material_01.glb"
        position={[12, 0.5, -38]}
        scale={4}
        label=""
      />
      <GLBModel
        url="/models/stone_castle_wall_material_01.glb"
        position={[-12, 0.5, -38]}
        scale={4}
        rotation={[0, Math.PI, 0]}
        label=""
      />

      {/* ===================== DIORAMAS & SCENERY ===================== */}

      {/* Grandma's House — cozy cottage in the south meadow */}
      <GLBModel
        url="/models/dae_diorama_-_grandmas_house.glb"
        position={[55, 1, 50]}
        scale={3}
        label="Grandma's House"
        labelColor="#ffaa55"
      />

      {/* Forest Loner — mysterious forest clearing, northwest */}
      <GLBModel
        url="/models/dae_diorama_-_forest_loner.glb"
        position={[-65, 1, 60]}
        scale={3}
        label="Dark Forest"
        labelColor="#44ff88"
      />

      {/* Second forest area — deeper in the northwest woods */}
      <GLBModel
        url="/models/dae_diorama_-_forest_loner%20(1).glb"
        position={[-85, 1, 30]}
        scale={3}
        label=""
      />

      {/* After the Rain — atmospheric garden, south-east */}
      <GLBModel
        url="/models/after_the_rain..._-_vr__sound.glb"
        position={[35, 1, 65]}
        scale={3}
        label="Rain Garden"
        labelColor="#88ccff"
      />

      {/* ===================== CHARACTERS & NPCS ===================== */}

      {/* Sci-Fi Girl — Vesper's physical form near the plaza edge */}
      <AnimatedGLBModel
        url="/models/scifi_girl_v.01.glb"
        position={[-18, 0.5, 18]}
        scale={2}
        rotation={[0, Math.PI / 4, 0]}
        label="Vesper"
        labelColor="#a78bfa"
      />

      {/* Truffle Man — friendly NPC merchant at market area */}
      <AnimatedGLBModel
        url="/models/truffle_man.glb"
        position={[30, 0.5, 25]}
        scale={2}
        label="Truffle Man"
        labelColor="#cd853f"
      />

      {/* ===================== CREATURES ===================== */}

      {/* Horses — grazing in the eastern field, well spread out */}
      <AnimatedGLBModel
        url="/models/realistic_animated_horse.glb"
        position={[50, 0.5, -20]}
        scale={2}
        label="Horse"
        labelColor="#8b6914"
      />
      <AnimatedGLBModel
        url="/models/horse.glb"
        position={[58, 0.5, -15]}
        scale={2}
        rotation={[0, -Math.PI / 3, 0]}
        label=""
      />
      <AnimatedGLBModel
        url="/models/horse%20(1).glb"
        position={[65, 0.5, -25]}
        scale={2}
        rotation={[0, Math.PI / 2, 0]}
        label=""
      />

      {/* Black Dragon — near the haunted castle on the east ridge */}
      <AnimatedGLBModel
        url="/models/black_dragon_with_idle_animation.glb"
        position={[70, 3, -75]}
        scale={4}
        rotation={[0, -Math.PI / 2, 0]}
        label="Black Dragon"
        labelColor="#ff2222"
      />

      {/* Pterodactyl — circling high above the world */}
      <Float speed={1.5} rotationIntensity={0.3} floatIntensity={3} floatingRange={[12, 25]}>
        <AnimatedGLBModel
          url="/models/animated_flying_pteradactal_dinosaur_loop.glb"
          position={[0, 30, 0]}
          scale={3}
          label="Pterodactyl"
          labelColor="#ff8800"
        />
      </Float>

      {/* ===================== TECH / SCI-FI ===================== */}

      {/* Mech Drone — patrolling the north perimeter */}
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1.5} floatingRange={[5, 10]}>
        <AnimatedGLBModel
          url="/models/mech_drone.glb"
          position={[-30, 8, -50]}
          scale={2}
          label="Scout Drone"
          labelColor="#00ffff"
        />
      </Float>

      {/* === ATMOSPHERIC LIGHTING === */}
      {/* Dragon fire area glow */}
      <pointLight position={[70, 5, -75]} intensity={3} color="#ff4400" distance={25} decay={2} />
      {/* Drone spotlight */}
      <pointLight position={[-30, 12, -50]} intensity={1.5} color="#00ffff" distance={20} decay={2} />
      {/* Haunted castle eerie glow */}
      <pointLight position={[80, 6, -70]} intensity={2} color="#6622aa" distance={30} decay={2} />
      {/* Rain garden ambient */}
      <pointLight position={[35, 4, 65]} intensity={1} color="#4488ff" distance={20} decay={2} />

    </group>
  );
}

/* Preloads removed for performance — models load on demand */
