import React, {
  Suspense,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { motion, useAnimationControls } from "framer-motion";

const easeOut = [0.22, 1, 0.36, 1];

function ShellMaterial({ hovered, thinking, clickedAt }) {
  const materialRef = useRef();

  useFrame(({ clock }) => {
    if (!materialRef.current) return;

    const t = clock.elapsedTime;
    const breathing = (Math.sin(t * 2.1) + 1) * 0.5;
    const clickWave = Math.max(0, 1 - (t - clickedAt.current) * 2.4);
    materialRef.current.emissiveIntensity =
      0.04 + breathing * 0.035 + (hovered ? 0.045 : 0) + clickWave * 0.05;
    materialRef.current.roughness = THREE.MathUtils.lerp(
      materialRef.current.roughness,
      hovered || thinking ? 0.3 : 0.42,
      0.08,
    );
  });

  return (
    <meshPhysicalMaterial
      ref={materialRef}
      color="#eef6f8"
      emissive="#8defff"
      emissiveIntensity={0.06}
      metalness={0.18}
      roughness={0.4}
      clearcoat={0.8}
      clearcoatRoughness={0.18}
      reflectivity={0.52}
      transparent
      opacity={0.76}
      depthWrite={false}
    />
  );
}

function CoreMaterial({ hovered, thinking, clickedAt }) {
  const materialRef = useRef();

  useFrame(({ clock }) => {
    if (!materialRef.current) return;

    const t = clock.elapsedTime;
    const thinkWave = thinking ? Math.sin(t * 6.4) * 0.22 : 0;
    const clickWave = Math.max(0, 1 - (t - clickedAt.current) * 2.7);
    materialRef.current.emissiveIntensity =
      1.4 + Math.sin(t * 2.8) * 0.22 + thinkWave + (hovered ? 0.8 : 0) + clickWave * 1.4;
  });

  return (
    <meshStandardMaterial
      ref={materialRef}
      color="#78f6ff"
      emissive="#15d9ff"
      emissiveIntensity={1.5}
      roughness={0.16}
      metalness={0.08}
      transparent
      opacity={0.94}
      toneMapped={false}
    />
  );
}

function roundedRectangleShape(width, height, radius) {
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();

  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);

  return shape;
}

function RoundedBox({ width, height, depth, radius, children, ...props }) {
  const geometry = useMemo(() => {
    const shape = roundedRectangleShape(width, height, radius);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSegments: 8,
      bevelSize: depth * 0.22,
      bevelThickness: depth * 0.18,
      curveSegments: 18,
    });

    geo.center();
    return geo;
  }, [depth, height, radius, width]);

  return (
    <mesh geometry={geometry} {...props}>
      {children}
    </mesh>
  );
}

function GlowMaterial({ hovered, thinking, color = "#41eaff", intensity = 1.8 }) {
  const materialRef = useRef();

  useFrame(({ clock }) => {
    if (!materialRef.current) return;

    const t = clock.elapsedTime;
    const thinkingPulse = thinking ? Math.sin(t * 8) * 0.4 : 0;
    materialRef.current.emissiveIntensity =
      intensity + Math.sin(t * 2.6) * 0.25 + thinkingPulse + (hovered ? 0.7 : 0);
  });

  return (
    <meshStandardMaterial
      ref={materialRef}
      color={color}
      emissive={color}
      emissiveIntensity={intensity}
      roughness={0.18}
      metalness={0.08}
      toneMapped={false}
    />
  );
}

function LedRing({ radius, y, color, speed, hovered, thinking }) {
  const ringRef = useRef();

  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    const t = clock.elapsedTime;
    ringRef.current.rotation.z = t * speed;
    ringRef.current.material.opacity =
      0.54 + Math.sin(t * (thinking ? 8.2 : 2.5) + radius) * 0.14 + (hovered ? 0.2 : 0);
    ringRef.current.scale.setScalar(1 + Math.sin(t * 2 + radius) * 0.015);
  });

  return (
    <mesh ref={ringRef} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.012, 8, 96]} />
      <meshBasicMaterial color={color} transparent opacity={0.62} toneMapped={false} />
    </mesh>
  );
}

function CompanionOrb({ hovered, thinking }) {
  const orbRef = useRef();

  useFrame(({ clock }) => {
    if (!orbRef.current) return;

    const t = clock.elapsedTime;
    orbRef.current.position.y = 0.2 + Math.sin(t * 2.2) * 0.08;
    orbRef.current.rotation.z = t * (thinking ? 2.2 : 1.1);
    orbRef.current.scale.setScalar(hovered ? 1.08 : 1);
  });

  return (
    <group ref={orbRef} position={[-1.08, 0.42, 0.05]} scale={0.25}>
      <mesh>
        <sphereGeometry args={[0.34, 32, 32]} />
        <meshPhysicalMaterial
          color="#27c9ff"
          emissive="#1fdcff"
          emissiveIntensity={1.1}
          roughness={0.2}
          metalness={0.12}
          transparent
          opacity={0.86}
          toneMapped={false}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.42, 0.035, 10, 64]} />
        <meshBasicMaterial color="#f5fdff" toneMapped={false} />
      </mesh>
      <mesh rotation={[0.7, 0.4, 0.35]}>
        <torusGeometry args={[0.42, 0.022, 10, 64]} />
        <meshBasicMaterial color="#72efff" transparent opacity={0.9} toneMapped={false} />
      </mesh>
      {[0, 1, 2, 3, 4].map((index) => (
        <mesh
          key={index}
          position={[
            Math.cos(index * 1.256) * 0.62,
            Math.sin(index * 1.256) * 0.62,
            0.04,
          ]}
        >
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshBasicMaterial color="#127dff" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function PulseRing({ clickedAt }) {
  const ringRef = useRef();

  useFrame(({ clock }) => {
    if (!ringRef.current) return;

    const t = clock.elapsedTime;
    const pulse = Math.max(0, 1 - (t - clickedAt.current) * 2.8);
    ringRef.current.scale.setScalar(1 + pulse * 0.28);
    ringRef.current.material.opacity = 0.68 + pulse * 0.3;
  });

  return (
    <mesh ref={ringRef} position={[0, 0.12, 0.45]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.18, 0.007, 8, 96]} />
      <meshBasicMaterial
        color="#7bf8ff"
        transparent
        opacity={0.72}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

function HolographicParticles({ hovered, thinking }) {
  const pointsRef = useRef();
  const particleCount = 64;

  // Fixed-size buffer geometry keeps the particle field cheap to animate.
  const { positions, phases, radii } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const phaseData = new Float32Array(particleCount);
    const radiusData = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i += 1) {
      const angle = (i / particleCount) * Math.PI * 2;
      const band = (i % 7) / 7;
      const radius = 1.24 + Math.sin(i * 8.17) * 0.3;
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = (band - 0.5) * 1.1;
      pos[i * 3 + 2] = Math.sin(angle) * radius;
      phaseData[i] = angle;
      radiusData[i] = radius;
    }

    return { positions: pos, phases: phaseData, radii: radiusData };
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;

    const t = clock.elapsedTime;
    const pos = pointsRef.current.geometry.attributes.position.array;
    const speed = thinking ? 0.78 : 0.34;
    const spread = hovered ? 1.08 : 1;

    for (let i = 0; i < particleCount; i += 1) {
      const orbit = phases[i] + t * speed * (i % 2 ? -1 : 1);
      const lift = Math.sin(t * 1.2 + phases[i] * 2) * 0.18;
      pos[i * 3] = Math.cos(orbit) * radii[i] * spread;
      pos[i * 3 + 1] = ((i % 7) / 7 - 0.5) * 1.12 + lift;
      pos[i * 3 + 2] = Math.sin(orbit) * radii[i] * spread;
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.material.opacity = hovered ? 0.72 : 0.48;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#68ecff"
        size={0.026}
        sizeAttenuation
        transparent
        opacity={0.5}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

function RobotScene({ pointer, hovered, thinking, clickPulse }) {
  const groupRef = useRef();
  const clickedAt = useRef(-100);
  const lastPulseCount = useRef(0);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;

    const t = clock.elapsedTime;
    if (clickPulse !== lastPulseCount.current) {
      lastPulseCount.current = clickPulse;
      clickedAt.current = t;
    }

    // Idle float, cursor-follow drift, and a gentle screen-facing tilt.
    groupRef.current.position.y = Math.sin(t * 1.18) * 0.13 + (thinking ? 0.035 : 0);
    groupRef.current.position.x = THREE.MathUtils.lerp(
      groupRef.current.position.x,
      pointer.current.x * 0.22,
      0.055,
    );
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      pointer.current.y * 0.14 + Math.sin(t * 0.9) * 0.025,
      0.05,
    );
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      pointer.current.x * 0.22 + Math.sin(t * (thinking ? 1.4 : 0.72)) * 0.035,
      0.05 + delta * 0.2,
    );
    groupRef.current.rotation.z = THREE.MathUtils.lerp(
      groupRef.current.rotation.z,
      -pointer.current.x * 0.16,
      0.05,
    );
  });

  return (
    <group ref={groupRef} scale={hovered ? 1.035 : 1} position={[0, -0.05, 0]}>
      <HolographicParticles hovered={hovered} thinking={thinking} />
      <CompanionOrb hovered={hovered} thinking={thinking} />

      <group position={[0, 0.78, 0]}>
        <RoundedBox width={1.2} height={0.86} depth={0.34} radius={0.2}>
          <meshPhysicalMaterial
            color="#eaf8ff"
            emissive="#7cecff"
            emissiveIntensity={hovered ? 0.16 : 0.08}
            metalness={0.08}
            roughness={0.28}
            clearcoat={0.8}
            clearcoatRoughness={0.2}
          />
        </RoundedBox>

        <RoundedBox width={0.98} height={0.62} depth={0.05} radius={0.16} position={[0, 0, 0.2]}>
          <meshPhysicalMaterial
            color="#0c2235"
            emissive="#061c2e"
            emissiveIntensity={0.45}
            metalness={0.1}
            roughness={0.22}
            clearcoat={0.6}
          />
        </RoundedBox>

        <mesh position={[-0.23, 0.02, 0.24]} scale={[1, 1.06, 0.12]}>
          <sphereGeometry args={[0.12, 32, 32]} />
          <GlowMaterial hovered={hovered} thinking={thinking} />
        </mesh>
        <mesh position={[0.23, 0.02, 0.24]} scale={[1, 1.06, 0.12]}>
          <sphereGeometry args={[0.12, 32, 32]} />
          <GlowMaterial hovered={hovered} thinking={thinking} />
        </mesh>

        {[
          [-0.41, 0.2, 0],
          [0.41, 0.2, Math.PI / 2],
          [-0.41, -0.2, -Math.PI / 2],
          [0.41, -0.2, Math.PI],
        ].map(([x, y, rotation]) => (
          <mesh key={`${x}-${y}`} position={[x, y, 0.236]} rotation={[0, 0, rotation]}>
            <boxGeometry args={[0.1, 0.018, 0.012]} />
            <meshBasicMaterial color="#9df7ff" transparent opacity={0.82} toneMapped={false} />
          </mesh>
        ))}
      </group>

      <mesh position={[-0.72, 0.72, -0.02]} rotation={[0, 0, -0.38]} scale={[0.76, 1, 0.8]}>
        <sphereGeometry args={[0.22, 32, 24]} />
        <ShellMaterial hovered={hovered} thinking={thinking} clickedAt={clickedAt} />
      </mesh>
      <mesh position={[0.72, 0.72, -0.02]} rotation={[0, 0, 0.38]} scale={[0.76, 1, 0.8]}>
        <sphereGeometry args={[0.22, 32, 24]} />
        <ShellMaterial hovered={hovered} thinking={thinking} clickedAt={clickedAt} />
      </mesh>

      <mesh position={[-0.83, 1.22, 0]} rotation={[0.2, 0, -0.42]} scale={[0.38, 1, 0.18]}>
        <sphereGeometry args={[0.24, 32, 20]} />
        <GlowMaterial hovered={hovered} thinking={thinking} color="#52cfff" intensity={0.9} />
      </mesh>
      <mesh position={[0.83, 1.22, 0]} rotation={[0.2, 0, 0.42]} scale={[0.38, 1, 0.18]}>
        <sphereGeometry args={[0.24, 32, 20]} />
        <GlowMaterial hovered={hovered} thinking={thinking} color="#52cfff" intensity={0.9} />
      </mesh>

      <group position={[0, -0.2, 0]}>
        <mesh scale={[0.94, 1.2, 0.74]}>
          <capsuleGeometry args={[0.34, 0.62, 18, 36]} />
          <meshPhysicalMaterial
            color="#d9eef8"
            emissive="#5bdfff"
            emissiveIntensity={0.06}
            metalness={0.12}
            roughness={0.34}
            clearcoat={0.72}
            clearcoatRoughness={0.2}
          />
        </mesh>

        <mesh position={[0, 0.31, 0.12]} scale={[1.25, 0.42, 0.28]}>
          <sphereGeometry args={[0.38, 48, 24]} />
          <meshPhysicalMaterial
            color="#4cb9ff"
            emissive="#20ccff"
            emissiveIntensity={hovered ? 0.38 : 0.2}
            roughness={0.2}
            metalness={0.16}
            clearcoat={0.8}
          />
        </mesh>

        <mesh position={[0, 0.32, 0.39]}>
          <sphereGeometry args={[0.14, 32, 32]} />
          <CoreMaterial hovered={hovered} thinking={thinking} clickedAt={clickedAt} />
        </mesh>

        <mesh position={[0, -0.22, 0.3]} scale={[0.58, 1.05, 0.08]}>
          <sphereGeometry args={[0.3, 32, 20]} />
          <meshPhysicalMaterial color="#b8ccd7" metalness={0.18} roughness={0.36} />
        </mesh>
      </group>

      <mesh position={[-0.78, 0.03, 0.04]} rotation={[0.12, 0, 1.04]} scale={[0.58, 0.94, 0.55]}>
        <capsuleGeometry args={[0.16, 0.48, 12, 24]} />
        <ShellMaterial hovered={hovered} thinking={thinking} clickedAt={clickedAt} />
      </mesh>
      <mesh position={[-1.0, -0.13, 0.11]} rotation={[0.1, 0.16, 1.23]} scale={[1.02, 0.52, 0.5]}>
        <capsuleGeometry args={[0.17, 0.5, 12, 24]} />
        <meshPhysicalMaterial color="#effbff" metalness={0.08} roughness={0.3} clearcoat={0.7} />
      </mesh>

      <mesh position={[0.8, -0.05, 0.03]} rotation={[0.08, 0, -0.32]} scale={[0.58, 0.92, 0.55]}>
        <capsuleGeometry args={[0.16, 0.5, 12, 24]} />
        <ShellMaterial hovered={hovered} thinking={thinking} clickedAt={clickedAt} />
      </mesh>
      <mesh position={[0.91, -0.39, 0.05]} rotation={[0.08, -0.1, -0.3]} scale={[0.56, 0.82, 0.5]}>
        <capsuleGeometry args={[0.15, 0.42, 12, 24]} />
        <meshPhysicalMaterial color="#eaf8ff" metalness={0.08} roughness={0.32} clearcoat={0.7} />
      </mesh>

      <PulseRing clickedAt={clickedAt} />
    </group>
  );
}

function SceneLighting() {
  return (
    <>
      {/* Soft medical-tech lighting: clean white key light with cyan instrument glow. */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[2.4, 3, 4]} intensity={1.25} color="#f4feff" />
      <pointLight position={[-2.2, 0.8, 2.4]} intensity={1.2} color="#39dfff" distance={5} />
      <pointLight position={[1.4, -1.3, 1.6]} intensity={0.72} color="#6f8dff" distance={4} />
    </>
  );
}

/**
 * FloatingHealthcareRobot
 *
 * A transparent, reusable AI healthcare mascot component.
 * It intentionally renders only the robot and its animations, so it can sit in
 * a hero, navbar assistant slot, dashboard corner, or future chat container.
 */
export default function FloatingHealthcareRobot({
  isOpen = true,
  thinking = false,
  className = "",
  sizeClassName = "h-72 w-72 sm:h-96 sm:w-96",
  onClick,
}) {
  const [hovered, setHovered] = useState(false);
  const [clickPulse, setClickPulse] = useState(0);
  const pointer = useRef({ x: 0, y: 0 });
  const controls = useAnimationControls();

  useEffect(() => {
    controls.start({
      opacity: isOpen ? 1 : 0,
      scale: isOpen ? 1 : 0.78,
      y: isOpen ? 0 : 18,
      filter: isOpen ? "blur(0px)" : "blur(8px)",
      transition: { duration: 0.58, ease: easeOut },
    });
  }, [controls, isOpen]);

  const handlePointerMove = useCallback((event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    pointer.current.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    pointer.current.y = -(((event.clientY - rect.top) / rect.height - 0.5) * 2);
  }, []);

  const handlePointerLeave = useCallback(() => {
    pointer.current.x = 0;
    pointer.current.y = 0;
    setHovered(false);
  }, []);

  const handleClick = useCallback(() => {
    setClickPulse((value) => value + 1);
    onClick?.();
  }, [onClick]);

  return (
    <motion.div
      animate={controls}
      initial={{ opacity: 0, scale: 0.78, y: 18, filter: "blur(8px)" }}
      className={`relative isolate outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/60 ${sizeClassName} ${className}`}
      onPointerMove={handlePointerMove}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={thinking ? "AI assistant thinking" : "Open AI assistant"}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleClick();
        }
      }}
    >
      <motion.div
        className="pointer-events-none absolute inset-[13%] rounded-full bg-cyan-300/20 blur-3xl"
        animate={{
          scale: hovered ? [1, 1.14, 1.06] : [0.95, 1.05, 0.95],
          opacity: hovered ? 0.72 : 0.42,
        }}
        transition={{ duration: hovered ? 1.3 : 3.2, repeat: Infinity, ease: "easeInOut" }}
      />

      <Canvas
        className="relative z-10 !h-full !w-full cursor-pointer"
        camera={{ position: [0, 0.18, 4.7], fov: 36, near: 0.1, far: 20 }}
        dpr={[1, 1.75]}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        }}
        shadows={false}
      >
        <Suspense fallback={null}>
          <SceneLighting />
          <RobotScene
            pointer={pointer}
            hovered={hovered}
            thinking={thinking}
            clickPulse={clickPulse}
          />
        </Suspense>
      </Canvas>
    </motion.div>
  );
}

export const MemoizedFloatingHealthcareRobot = memo(FloatingHealthcareRobot);
