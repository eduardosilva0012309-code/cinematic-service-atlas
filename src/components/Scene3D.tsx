import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Lightformer, MeshDistortMaterial, Sparkles } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const GOLD = "#d4a64a";

function Core() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s, d) => {
    if (!ref.current) return;
    const dt = Math.min(d, 0.05);
    ref.current.rotation.y += dt * 0.15;
    ref.current.rotation.x = Math.sin(s.clock.elapsedTime * 0.2) * 0.3;
  });
  return (
    <Float speed={1.2} rotationIntensity={0.4} floatIntensity={1.2}>
      <mesh ref={ref} scale={1.6}>
        <icosahedronGeometry args={[1, 24]} />
        <MeshDistortMaterial color={GOLD} metalness={1} roughness={0.12} distort={0.35} speed={1.4} />
      </mesh>
    </Float>
  );
}

function Rings() {
  const g = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (!g.current) return;
    const t = s.clock.elapsedTime;
    g.current.children.forEach((c, i) => {
      c.rotation.x = t * (0.1 + i * 0.05) + i;
      c.rotation.y = t * (0.07 + i * 0.03);
    });
  });
  return (
    <group ref={g}>
      {[2.6, 3.3, 4.1].map((r, i) => (
        <mesh key={r}>
          <torusGeometry args={[r, 0.012 + i * 0.004, 16, 220]} />
          <meshStandardMaterial color={GOLD} metalness={1} roughness={0.2} emissive={GOLD} emissiveIntensity={0.25} />
        </mesh>
      ))}
    </group>
  );
}

function Shards() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const items = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => {
        const a = (i / 70) * Math.PI * 2;
        const r = 5 + ((i * 37) % 9);
        return { a, r, y: ((i * 53) % 14) - 7, s: 0.05 + ((i * 17) % 10) / 60, sp: 0.02 + ((i * 7) % 5) / 200 };
      }),
    [],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame((st) => {
    if (!ref.current) return;
    const t = st.clock.elapsedTime;
    items.forEach((it, i) => {
      const a = it.a + t * it.sp;
      dummy.position.set(Math.cos(a) * it.r, it.y + Math.sin(t * 0.5 + i) * 0.3, Math.sin(a) * it.r - 4);
      dummy.rotation.set(t * 0.3 + i, t * 0.2 + i, 0);
      dummy.scale.setScalar(it.s);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]}>
      <octahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={GOLD} metalness={1} roughness={0.25} />
    </instancedMesh>
  );
}

function Rig() {
  useFrame((s, d) => {
    const scroll = typeof window !== "undefined" ? window.scrollY / Math.max(1, window.innerHeight) : 0;
    const k = 1 - Math.exp(-2.5 * Math.min(d, 0.05));
    s.camera.position.x += (s.pointer.x * 1.2 - s.camera.position.x) * k;
    s.camera.position.y += (s.pointer.y * 0.8 - scroll * 0.9 - s.camera.position.y) * k;
    s.camera.position.z += (8 + scroll * 1.5 - s.camera.position.z) * k;
    s.camera.lookAt(0, -scroll * 0.9, 0);
  });
  return null;
}

export default function Scene3D() {
  return (
    <div className="fixed inset-0 -z-10" aria-hidden>
      <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0, 8], fov: 40 }} gl={{ antialias: true, alpha: true }}>
        <fog attach="fog" args={["#070605", 7, 22]} />
        <ambientLight intensity={0.15} />
        <spotLight position={[6, 8, 6]} angle={0.4} penumbra={1} intensity={60} color="#ffe2a8" />
        <pointLight position={[-6, -3, 2]} intensity={25} color="#b5762a" />
        <Core />
        <Rings />
        <Shards />
        <Sparkles count={160} scale={[16, 10, 10]} size={2.2} speed={0.3} color="#f5e6c4" opacity={0.7} />
        <Environment resolution={256}>
          <Lightformer intensity={3} position={[0, 5, -2]} scale={[10, 2, 1]} color="#fff1cc" />
          <Lightformer intensity={1.5} position={[-5, 0, 2]} rotation-y={Math.PI / 2} scale={[10, 1, 1]} color="#d4a64a" />
          <Lightformer intensity={1} position={[5, -1, 1]} rotation-y={-Math.PI / 2} scale={[8, 1, 1]} color="#7a4a1a" />
        </Environment>
        <Rig />
      </Canvas>
    </div>
  );
}
