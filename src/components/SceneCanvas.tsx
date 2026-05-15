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
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ACESFilmicToneMapping,
  Box3,
  BoxHelper,
  Color,
  DoubleSide,
  FrontSide,
  Group,
  LinearToneMapping,
  LoopOnce,
  LoopRepeat,
  Material,
  Matrix4,
  Mesh,
  NoToneMapping,
  Object3D,
  OrthographicCamera,
  PerspectiveCamera,
  Side,
  Vector3,
} from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { CameraView, CameraViewCommand, ModelReport, TemplateSettings, Vec3 } from "../types";

interface SceneCanvasProps {
  settings: TemplateSettings;
  modelRevision: number;
  modelReport: ModelReport | null;
  viewCommand: CameraViewCommand;
  fitSignal: number;
  onAnimationsChange: (names: string[]) => void;
  onModelReport: (report: ModelReport) => void;
  onModelError: (message: string) => void;
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
  sourceUrl: string;
  sourceLabel: string;
  fitSignal: number;
  onAnimationsChange: (names: string[]) => void;
  onModelReport: (report: ModelReport) => void;
  onTransformCommit: (transform: Pick<TemplateSettings, "position" | "rotation" | "scale">) => void;
}

export function SceneCanvas({
  settings,
  modelRevision,
  modelReport,
  viewCommand,
  fitSignal,
  onAnimationsChange,
  onModelReport,
  onModelError,
  onTransformCommit,
}: SceneCanvasProps) {
  const cameraPosition: Vec3 = [4, 3, 6];
  const sourceUrl = useMemo(() => withRevision(settings.modelUrl, modelRevision), [modelRevision, settings.modelUrl]);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

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
        <ModelLoadBoundary
          source={sourceUrl}
          onAnimationsChange={onAnimationsChange}
          onModelError={onModelError}
        >
          <LoadedModel
            settings={settings}
            sourceUrl={sourceUrl}
            sourceLabel={settings.modelUrl}
            fitSignal={fitSignal}
            onAnimationsChange={onAnimationsChange}
            onModelReport={onModelReport}
            onTransformCommit={onTransformCommit}
          />
        </ModelLoadBoundary>
      </Suspense>

      {settings.showFloor ? <GroundPlane settings={settings} /> : null}
      {settings.showGrid ? <SceneGrid settings={settings} /> : null}
      {settings.showAxes ? <axesHelper args={[settings.axesSize]} /> : null}
      <CameraViewController
        command={viewCommand}
        controlsRef={controlsRef}
        radius={modelReport?.radius ?? 2}
        position={settings.position}
        fitMargin={settings.fitMargin}
      />
      <OrbitControls
        ref={controlsRef}
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
  {
    children: React.ReactNode;
    source: string;
    onAnimationsChange: (names: string[]) => void;
    onModelError: (message: string) => void;
  },
  { hasError: boolean; message: string }
> {
  state = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error) {
    const message = formatModelLoadError(error.message, this.props.source);
    this.setState({ hasError: true, message });
    this.props.onAnimationsChange([]);
    this.props.onModelError(message);
  }

  componentDidUpdate(previousProps: { source: string }) {
    if (previousProps.source !== this.props.source && this.state.hasError) {
      this.setState({ hasError: false, message: "" });
    }
  }

  render() {
    if (this.state.hasError) {
      return <MissingModel message={this.state.message} />;
    }

    return this.props.children;
  }
}

function LoadedModel({
  settings,
  sourceUrl,
  sourceLabel,
  fitSignal,
  onAnimationsChange,
  onModelReport,
  onTransformCommit,
}: LoadedModelProps) {
  const gltf = useGLTF(sourceUrl, settings.useDraco);
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
    onModelReport(buildModelReport(scene, gltf.animations.length, sourceLabel));
  }, [gltf.animations.length, onModelReport, scene, sourceLabel]);

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
      <Bounds fit={settings.fitOnLoad} observe clip margin={settings.fitMargin}>
        <group ref={setTargetRef} position={settings.position} rotation={rotation} scale={scale}>
          <group position={offset}>
            <primitive object={scene} />
          </group>
        </group>
        <FitController signal={fitSignal} />
      </Bounds>
      {settings.showTransformGizmo && target ? (
        <TransformControls
          object={target}
          mode={settings.transformMode}
          size={0.82}
          onMouseUp={() => onTransformCommit(readTransform(target))}
        />
      ) : null}
      {settings.showBounds && target ? <BoundsHelper target={target} /> : null}
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

function CameraViewController({
  command,
  controlsRef,
  radius,
  position,
  fitMargin,
}: {
  command: CameraViewCommand;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  radius: number;
  position: Vec3;
  fitMargin: number;
}) {
  const { camera } = useThree();

  useEffect(() => {
    if (command.sequence === 0) {
      return;
    }

    const target = new Vector3(position[0], position[1] + Math.max(radius * 0.35, 0.15), position[2]);
    const direction = getViewDirection(command.preset);
    const distance = Math.max(radius * fitMargin * 2.3, 2.8);

    camera.position.copy(target).add(direction.multiplyScalar(distance));
    camera.up.copy(command.preset === "top" ? new Vector3(0, 0, -1) : command.preset === "bottom" ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0));
    camera.lookAt(target);
    camera.updateProjectionMatrix();

    controlsRef.current?.target.copy(target);
    controlsRef.current?.update();
  }, [camera, command.preset, command.sequence, controlsRef, fitMargin, position, radius]);

  return null;
}

function BoundsHelper({ target }: { target: Object3D }) {
  const helper = useMemo(() => new BoxHelper(target, "#8fd06c"), [target]);

  useFrame(() => {
    helper.update();
  });

  useEffect(() => {
    return () => {
      helper.dispose();
    };
  }, [helper]);

  return <primitive object={helper} />;
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

function MissingModel({ message }: { message: string }) {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.55, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ff9f43" wireframe />
      </mesh>
      <Html center position={[0, 1.4, 0]} className="scene-label">
        {message ? "GLB load error" : "GLB not found"}
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
  const box = getLocalBox(scene);

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

function buildModelReport(scene: Object3D, animations: number, source: string): ModelReport {
  const materials = new Set<string>();
  let meshes = 0;
  let vertices = 0;
  let triangles = 0;

  scene.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh || !mesh.geometry) {
      return;
    }

    meshes += 1;
    const geometry = mesh.geometry;
    const positionAttribute = geometry.getAttribute("position");
    const vertexCount = positionAttribute?.count ?? 0;
    vertices += vertexCount;
    triangles += geometry.index ? Math.floor(geometry.index.count / 3) : Math.floor(vertexCount / 3);

    const meshMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    meshMaterials.forEach((material) => {
      if (material) {
        materials.add(material.uuid);
      }
    });
  });

  const box = getLocalBox(scene);
  const size = box.isEmpty() ? new Vector3() : box.getSize(new Vector3());
  const center = box.isEmpty() ? new Vector3() : box.getCenter(new Vector3());
  const radius = box.isEmpty() ? 1 : Math.max(size.length() / 2, 0.1);

  return {
    source,
    meshes,
    materials: materials.size,
    vertices,
    triangles,
    animations,
    dimensions: [size.x, size.y, size.z],
    center: [center.x, center.y, center.z],
    radius,
  };
}

function getLocalBox(scene: Object3D) {
  scene.updateWorldMatrix(true, true);
  const box = new Box3().setFromObject(scene);

  if (!scene.parent || box.isEmpty()) {
    return box;
  }

  scene.parent.updateWorldMatrix(true, false);
  return box.applyMatrix4(new Matrix4().copy(scene.parent.matrixWorld).invert());
}

function withRevision(source: string, revision: number) {
  if (source.startsWith("blob:")) {
    return source;
  }

  const separator = source.includes("?") ? "&" : "?";
  return `${source}${separator}r=${revision}`;
}

function formatModelLoadError(message: string, source: string) {
  const cleanSource = source.replace(/[?&]r=\d+$/, "");

  if (message.includes("Unexpected token '<'") || message.includes("404") || message.includes("Could not load")) {
    return `Could not load ${cleanSource}. Check the path or place the file under public/models.`;
  }

  return message || `Could not load ${cleanSource}.`;
}

function getViewDirection(preset: CameraView) {
  const directions: Record<CameraView, Vector3> = {
    isometric: new Vector3(1, 0.75, 1),
    front: new Vector3(0, 0, 1),
    back: new Vector3(0, 0, -1),
    left: new Vector3(-1, 0, 0),
    right: new Vector3(1, 0, 0),
    top: new Vector3(0, 1, 0),
    bottom: new Vector3(0, -1, 0),
  };

  return directions[preset].normalize();
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
