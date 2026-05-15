import {
  Bounds,
  ContactShadows,
  Environment,
  Grid,
  Html,
  OrbitControls,
  Stats,
  TransformControls,
  useAnimations,
  useBounds,
  useGLTF,
} from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Component, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  ACESFilmicToneMapping,
  Box3,
  Color,
  DoubleSide,
  FrontSide,
  Group,
  LinearToneMapping,
  LoopOnce,
  LoopRepeat,
  Material,
  Mesh,
  NoToneMapping,
  Object3D,
  OrthographicCamera,
  PerspectiveCamera,
  Side,
  Vector3,
} from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { TemplateSettings, Vec3 } from "../types";

interface SceneCanvasProps {
  settings: TemplateSettings;
  fitSignal: number;
  onAnimationsChange: (names: string[]) => void;
  onTransformCommit: (transform: Pick<TemplateSettings, "position" | "rotation" | "scale">) => void;
}

interface AdjustableMaterial extends Material {
  color?: Color;
  roughness?: number;
  metalness?: number;
  wireframe?: boolean;
}

interface StoredMaterialProps {
  color?: Color;
  roughness?: number;
  metalness?: number;
  wireframe?: boolean;
  side: Side;
}

interface LoadedModelProps {
  settings: TemplateSettings;
  onAnimationsChange: (names: string[]) => void;
  onTransformCommit: (transform: Pick<TemplateSettings, "position" | "rotation" | "scale">) => void;
}

export function SceneCanvas({ settings, fitSignal, onAnimationsChange, onTransformCommit }: SceneCanvasProps) {
  const cameraPosition: Vec3 = [4, 3, 6];

  return (
    <Canvas
      key={settings.cameraMode}
      shadows
      orthographic={settings.cameraMode === "orthographic"}
      camera={
        settings.cameraMode === "orthographic"
          ? { position: cameraPosition, zoom: settings.orthographicZoom, near: 0.01, far: 1000 }
          : { position: cameraPosition, fov: settings.fov, near: 0.01, far: 1000 }
      }
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false }}
    >
      <RendererSettings settings={settings} />
      <color attach="background" args={[settings.backgroundColor]} />
      {settings.fogEnabled ? <fog attach="fog" args={[settings.backgroundColor, settings.fogNear, settings.fogFar]} /> : null}

      <ambientLight intensity={settings.ambientIntensity} />
      <directionalLight
        castShadow={settings.castShadow}
        position={settings.keyLightPosition}
        intensity={settings.keyLightIntensity}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={80}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      {settings.environmentEnabled ? (
        <Environment
          preset={settings.environmentPreset}
          background={settings.environmentBackground}
          environmentIntensity={1}
        />
      ) : null}

      <Suspense fallback={<LoadingModel />}>
        <ModelLoadBoundary source={settings.modelUrl} onAnimationsChange={onAnimationsChange}>
          <Bounds fit={settings.fitOnLoad} observe clip margin={settings.fitMargin}>
            <LoadedModel
              settings={settings}
              onAnimationsChange={onAnimationsChange}
              onTransformCommit={onTransformCommit}
            />
            <FitController signal={fitSignal} />
          </Bounds>
        </ModelLoadBoundary>
      </Suspense>

      {settings.showFloor ? <GroundPlane settings={settings} /> : null}
      {settings.showGrid ? <SceneGrid settings={settings} /> : null}
      {settings.showAxes ? <axesHelper args={[settings.axesSize]} /> : null}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        autoRotate={settings.autoRotate}
        autoRotateSpeed={0.8}
        enablePan={settings.enablePan}
        enableZoom={settings.enableZoom}
        minDistance={settings.minDistance}
        maxDistance={settings.maxDistance}
      />
      {settings.showStats ? <Stats /> : null}
    </Canvas>
  );
}

class ModelLoadBoundary extends Component<
  { children: React.ReactNode; source: string; onAnimationsChange: (names: string[]) => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onAnimationsChange([]);
  }

  componentDidUpdate(previousProps: { source: string }) {
    if (previousProps.source !== this.props.source && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return <MissingModel />;
    }

    return this.props.children;
  }
}

function LoadedModel({ settings, onAnimationsChange, onTransformCommit }: LoadedModelProps) {
  const gltf = useGLTF(settings.modelUrl, settings.useDraco);
  const [target, setTarget] = useState<Group | null>(null);
  const setTargetRef = useCallback((node: Group | null) => setTarget(node), []);

  const scene = useMemo(() => {
    const cloned = cloneSkeleton(gltf.scene) as Object3D;

    cloned.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh || !mesh.material) {
        return;
      }

      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const clonedMaterials = materials.map((material) => cloneMaterialWithOriginals(material));
      mesh.material = Array.isArray(mesh.material) ? clonedMaterials : clonedMaterials[0];
    });

    return cloned;
  }, [gltf.scene]);

  const { actions, mixer } = useAnimations(gltf.animations, scene);

  useEffect(() => {
    onAnimationsChange(gltf.animations.map((clip) => clip.name).filter(Boolean));
  }, [gltf.animations, onAnimationsChange]);

  useEffect(() => {
    scene.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh || !mesh.material) {
        return;
      }

      mesh.castShadow = settings.castShadow;
      mesh.receiveShadow = settings.receiveShadow;

      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((material) => applyMaterialSettings(material, settings));
    });
  }, [
    scene,
    settings.castShadow,
    settings.receiveShadow,
    settings.wireframe,
    settings.doubleSided,
    settings.overrideMaterial,
    settings.materialColor,
    settings.roughness,
    settings.metalness,
  ]);

  useEffect(() => {
    mixer.timeScale = settings.animationSpeed;
  }, [mixer, settings.animationSpeed]);

  useEffect(() => {
    Object.values(actions).forEach((action) => action?.stop());

    const selectedAction = settings.animationName ? actions[settings.animationName] : undefined;
    if (!selectedAction) {
      return;
    }

    selectedAction.reset();
    selectedAction.setLoop(settings.animationLoop === "repeat" ? LoopRepeat : LoopOnce, settings.animationLoop === "repeat" ? Infinity : 1);
    selectedAction.clampWhenFinished = settings.animationLoop === "once";
    selectedAction.paused = !settings.animationPlaying;
    selectedAction.play();

    return () => {
      selectedAction.fadeOut(0.12);
    };
  }, [actions, settings.animationLoop, settings.animationName]);

  useEffect(() => {
    const selectedAction = settings.animationName ? actions[settings.animationName] : undefined;
    if (selectedAction) {
      selectedAction.paused = !settings.animationPlaying;
    }
  }, [actions, settings.animationName, settings.animationPlaying]);

  const offset = useMemo(() => getModelOffset(scene, settings.autoCenter, settings.groundAlign), [scene, settings.autoCenter, settings.groundAlign]);
  const scale = settings.scale.map((value) => value * settings.uniformScale) as Vec3;
  const rotation = settings.rotation.map((value) => (value * Math.PI) / 180) as Vec3;

  return (
    <>
      <group ref={setTargetRef} position={settings.position} rotation={rotation} scale={scale}>
        <group position={offset}>
          <primitive object={scene} />
        </group>
      </group>
      {settings.showTransformGizmo && target ? (
        <TransformControls
          object={target}
          mode={settings.transformMode}
          size={0.82}
          onMouseUp={() => onTransformCommit(readTransform(target))}
        />
      ) : null}
    </>
  );
}

function RendererSettings({ settings }: { settings: TemplateSettings }) {
  const { camera, gl } = useThree();

  useEffect(() => {
    gl.toneMapping =
      settings.toneMapping === "aces"
        ? ACESFilmicToneMapping
        : settings.toneMapping === "linear"
          ? LinearToneMapping
          : NoToneMapping;
    gl.toneMappingExposure = settings.exposure;
  }, [gl, settings.exposure, settings.toneMapping]);

  useEffect(() => {
    if (camera instanceof PerspectiveCamera) {
      camera.fov = settings.fov;
      camera.updateProjectionMatrix();
    }

    if (camera instanceof OrthographicCamera) {
      camera.zoom = settings.orthographicZoom;
      camera.updateProjectionMatrix();
    }
  }, [camera, settings.fov, settings.orthographicZoom]);

  return null;
}

function FitController({ signal }: { signal: number }) {
  const bounds = useBounds();

  useEffect(() => {
    if (signal === 0) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      bounds.refresh().clip().fit();
    });

    return () => cancelAnimationFrame(frame);
  }, [bounds, signal]);

  return null;
}

function GroundPlane({ settings }: { settings: TemplateSettings }) {
  return (
    <>
      <mesh receiveShadow rotation-x={-Math.PI / 2} position-y={settings.floorY - 0.003}>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial color={settings.floorColor} roughness={0.82} metalness={0.02} />
      </mesh>
      <ContactShadows
        position={[0, settings.floorY + 0.002, 0]}
        opacity={0.32}
        scale={18}
        blur={2.8}
        far={5}
        frames={1}
      />
    </>
  );
}

function SceneGrid({ settings }: { settings: TemplateSettings }) {
  return (
    <Grid
      position={[0, settings.floorY + 0.004, 0]}
      args={[settings.gridSize, settings.gridSize]}
      cellSize={settings.gridCellSize}
      cellThickness={0.55}
      cellColor="#6c7480"
      sectionSize={settings.gridCellSize * 4}
      sectionThickness={1}
      sectionColor="#a3afbf"
      fadeDistance={settings.gridFadeDistance}
      fadeStrength={1.25}
      infiniteGrid
    />
  );
}

function LoadingModel() {
  return (
    <group>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[0.9, 0.9, 0.9]} />
        <meshStandardMaterial color="#6ab7ff" wireframe />
      </mesh>
      <Html center position={[0, 1.35, 0]} className="scene-label">
        Loading
      </Html>
    </group>
  );
}

function MissingModel() {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.55, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ff9f43" wireframe />
      </mesh>
      <Html center position={[0, 1.4, 0]} className="scene-label">
        GLB not found
      </Html>
    </group>
  );
}

function cloneMaterialWithOriginals(material: Material) {
  const cloned = material.clone() as AdjustableMaterial;
  const original: StoredMaterialProps = {
    color: cloned.color?.clone(),
    roughness: cloned.roughness,
    metalness: cloned.metalness,
    wireframe: cloned.wireframe,
    side: cloned.side,
  };

  cloned.userData = {
    ...cloned.userData,
    originalMaterialProps: original,
  };

  return cloned;
}

function applyMaterialSettings(material: Material, settings: TemplateSettings) {
  const adjustable = material as AdjustableMaterial;
  const original = adjustable.userData.originalMaterialProps as StoredMaterialProps | undefined;

  adjustable.side = settings.doubleSided ? DoubleSide : original?.side ?? FrontSide;

  if (typeof adjustable.wireframe === "boolean") {
    adjustable.wireframe = settings.wireframe || original?.wireframe === true;
  }

  if (adjustable.color) {
    if (settings.overrideMaterial) {
      adjustable.color.set(settings.materialColor);
    } else if (original?.color) {
      adjustable.color.copy(original.color);
    }
  }

  if (typeof adjustable.roughness === "number") {
    adjustable.roughness = settings.overrideMaterial ? settings.roughness : original?.roughness ?? adjustable.roughness;
  }

  if (typeof adjustable.metalness === "number") {
    adjustable.metalness = settings.overrideMaterial ? settings.metalness : original?.metalness ?? adjustable.metalness;
  }

  adjustable.needsUpdate = true;
}

function getModelOffset(scene: Object3D, autoCenter: boolean, groundAlign: boolean): Vec3 {
  const box = new Box3().setFromObject(scene);

  if (box.isEmpty()) {
    return [0, 0, 0];
  }

  const center = box.getCenter(new Vector3());
  return [
    autoCenter ? -center.x : 0,
    groundAlign ? -box.min.y : autoCenter ? -center.y : 0,
    autoCenter ? -center.z : 0,
  ];
}

function readTransform(group: Group): Pick<TemplateSettings, "position" | "rotation" | "scale"> {
  return {
    position: [group.position.x, group.position.y, group.position.z],
    rotation: [
      (group.rotation.x * 180) / Math.PI,
      (group.rotation.y * 180) / Math.PI,
      (group.rotation.z * 180) / Math.PI,
    ],
    scale: [group.scale.x, group.scale.y, group.scale.z],
  };
}
