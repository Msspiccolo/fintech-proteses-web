import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, Center } from "@react-three/drei";
import * as THREE from "three";

export type ProsthesisModelId = "knee" | "hip" | "hand" | "leg" | "foot" | "arm";

export interface ProsthesisModel {
  id: ProsthesisModelId;
  name: string;
  description: string;
  category: string;
  basePrice: number;
}

export const PROSTHESIS_MODELS: ProsthesisModel[] = [
  {
    id: "knee",
    name: "Joelho Modulares",
    description:
      "Articulação de joelho - Com pivô central em titânio e sleeve em polímero médico. Feito com peças resistentes, e com tamanho personalizado!",
    category: "Membro inferior",
    basePrice: 18500,
  },
  {
    id: "hip",
    name: "Quadril Anatômico Biolox  Delta",
    description: "Cabeça esférica com haste femoral e acabamento poroso para osteointegração.",
    category: "Membro inferior",
    basePrice: 24900,
  },
  {
    id: "leg",
    name: "Perna Transtibial L1 ao L3",
    description: "Prótese com soquete anatômico e pilão de fibra de carbono e adaptador universal.",
    category: "Membro inferior",
    basePrice: 21500,
  },
  {
    id: "foot",
    name: "Pé Dinâmico Direito",
    description:
      "Possue lâmina de retorno de energia feita com fibra de carbono e compátivel para caminhada ativa",
    category: "Membro inferior",
    basePrice: 14200,
  },
  {
    id: "hand",
    name: "Mão Biônica completa",
    description: "Cinco dedos articulados com garra adaptativa e pulso rotativo.",
    category: "Membro superior",
    basePrice: 32800,
  },
  {
    id: "arm",
    name: "Braço Transradial nível A2",
    description: "Possui um soquete de encaixe com terminal universal para ferramentas modulares.",
    category: "Membro superior",
    basePrice: 19800,
  },
];

const TITANIUM = "#c7ccd1";
const POLYMER = "#1f2937";
const ACCENT = "#3b82f6";

function KneeMesh() {
  return (
    <group>
      <mesh castShadow position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 0.9, 32]} />
        <meshStandardMaterial color={TITANIUM} metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh castShadow position={[0, 0.35, 0]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color={POLYMER} metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0.32, 0.35, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.7, 16]} />
        <meshStandardMaterial color={ACCENT} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[0, -0.35, 0]}>
        <cylinderGeometry args={[0.22, 0.18, 1, 32]} />
        <meshStandardMaterial color={TITANIUM} metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh castShadow position={[0, -0.9, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.1, 32]} />
        <meshStandardMaterial color={POLYMER} roughness={0.6} />
      </mesh>
    </group>
  );
}

function HipMesh() {
  return (
    <group>
      <mesh castShadow position={[0, 0.7, 0]}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial color={TITANIUM} metalness={0.9} roughness={0.15} />
      </mesh>
      <mesh castShadow position={[0, 0.15, 0]} rotation={[0, 0, 0.15]}>
        <cylinderGeometry args={[0.14, 0.22, 1.2, 32]} />
        <meshStandardMaterial color={TITANIUM} metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[0.05, -0.55, 0]} rotation={[0, 0, 0.1]}>
        <cylinderGeometry args={[0.22, 0.14, 0.7, 32]} />
        <meshStandardMaterial color={POLYMER} roughness={0.55} />
      </mesh>
    </group>
  );
}

function LegMesh() {
  return (
    <group>
      <mesh castShadow position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.28, 0.32, 0.7, 32]} />
        <meshStandardMaterial color={POLYMER} roughness={0.5} />
      </mesh>
      <mesh castShadow position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 1.1, 32]} />
        <meshStandardMaterial color={TITANIUM} metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh castShadow position={[0, -0.7, 0]}>
        <boxGeometry args={[0.45, 0.12, 0.9]} />
        <meshStandardMaterial color={ACCENT} metalness={0.4} roughness={0.5} />
      </mesh>
    </group>
  );
}

function FootMesh() {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.5, 0);
    s.quadraticCurveTo(-0.5, 0.2, -0.3, 0.25);
    s.quadraticCurveTo(0.2, 0.3, 0.6, 0.08);
    s.quadraticCurveTo(0.7, -0.02, 0.6, -0.05);
    s.quadraticCurveTo(0.1, -0.08, -0.5, 0);
    return s;
  }, []);
  return (
    <group>
      <mesh castShadow position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.4, 32]} />
        <meshStandardMaterial color={TITANIUM} metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <extrudeGeometry
          args={[
            shape,
            {
              depth: 0.25,
              bevelEnabled: true,
              bevelThickness: 0.02,
              bevelSize: 0.02,
              bevelSegments: 3,
            },
          ]}
        />
        <meshStandardMaterial color={POLYMER} roughness={0.5} />
      </mesh>
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <extrudeGeometry
          args={[
            shape,
            {
              depth: 0.15,
              bevelEnabled: true,
              bevelThickness: 0.02,
              bevelSize: 0.02,
              bevelSegments: 3,
            },
          ]}
        />
        <meshStandardMaterial color="#0f172a" roughness={0.7} />
      </mesh>
    </group>
  );
}

function Finger({ x, len = 0.5 }: { x: number; len?: number }) {
  return (
    <group position={[x, 0.35, 0]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} castShadow position={[0, i * (len / 3), 0]}>
          <boxGeometry args={[0.08, len / 3 - 0.02, 0.08]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? TITANIUM : POLYMER}
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

function HandMesh() {
  return (
    <group>
      <mesh castShadow position={[0, 0.15, 0]}>
        <boxGeometry args={[0.55, 0.4, 0.18]} />
        <meshStandardMaterial color={POLYMER} roughness={0.5} />
      </mesh>
      <Finger x={-0.2} len={0.55} />
      <Finger x={-0.07} len={0.65} />
      <Finger x={0.06} len={0.6} />
      <Finger x={0.19} len={0.5} />
      <group position={[-0.35, 0.1, 0]} rotation={[0, 0, -0.6]}>
        <Finger x={0} len={0.4} />
      </group>
      <mesh castShadow position={[0, -0.25, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.3, 32]} />
        <meshStandardMaterial color={TITANIUM} metalness={0.85} roughness={0.2} />
      </mesh>
    </group>
  );
}

function ArmMesh() {
  return (
    <group>
      <mesh castShadow position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.28, 0.22, 0.6, 32]} />
        <meshStandardMaterial color={POLYMER} roughness={0.5} />
      </mesh>
      <mesh castShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[0.16, 0.2, 0.9, 32]} />
        <meshStandardMaterial color={TITANIUM} metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh castShadow position={[0, -0.6, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.25, 32]} />
        <meshStandardMaterial color={ACCENT} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0, -0.85, 0]}>
        <boxGeometry args={[0.35, 0.15, 0.35]} />
        <meshStandardMaterial color={TITANIUM} metalness={0.85} roughness={0.25} />
      </mesh>
    </group>
  );
}

function ModelMesh({ id }: { id: ProsthesisModelId }) {
  switch (id) {
    case "knee":
      return <KneeMesh />;
    case "hip":
      return <HipMesh />;
    case "leg":
      return <LegMesh />;
    case "foot":
      return <FootMesh />;
    case "hand":
      return <HandMesh />;
    case "arm":
      return <ArmMesh />;
  }
}

interface Prosthesis3DPreviewProps {
  modelId: ProsthesisModelId;
  autoRotate?: boolean;
  className?: string;
}

export function Prosthesis3DPreview({
  modelId,
  autoRotate = true,
  className,
}: Prosthesis3DPreviewProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return <div className={className} style={{ background: "#0b1220" }} />;
  }
  return (
    <div className={className}>
      <Canvas shadows dpr={[1, 2]} camera={{ position: [2.2, 1.4, 2.2], fov: 40 }}>
        <color attach="background" args={["#0b1220"]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[3, 5, 2]} intensity={1.2} castShadow />
        <Suspense fallback={null}>
          <Center>
            <ModelMesh id={modelId} />
          </Center>
          <ContactShadows position={[0, -1.05, 0]} opacity={0.5} scale={6} blur={2.5} far={2} />
          <Environment preset="city" />
        </Suspense>
        <OrbitControls
          enablePan={false}
          autoRotate={autoRotate}
          autoRotateSpeed={1.2}
          minDistance={2}
          maxDistance={6}
        />
      </Canvas>
    </div>
  );
}
