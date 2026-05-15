export type Vec3 = [number, number, number];

export type CameraMode = "perspective" | "orthographic";

export type TransformMode = "translate" | "rotate" | "scale";

export type AnimationLoopMode = "repeat" | "once";

export type ToneMappingMode = "none" | "linear" | "aces";

export type EnvironmentPreset =
  | "apartment"
  | "city"
  | "dawn"
  | "forest"
  | "lobby"
  | "night"
  | "park"
  | "studio"
  | "sunset"
  | "warehouse";

export type VectorSettingKey =
  | "position"
  | "rotation"
  | "scale"
  | "keyLightPosition";

export interface TemplateSettings {
  modelUrl: string;
  useDraco: boolean;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  uniformScale: number;
  autoCenter: boolean;
  groundAlign: boolean;
  showTransformGizmo: boolean;
  transformMode: TransformMode;
  fitOnLoad: boolean;
  fitMargin: number;
  cameraMode: CameraMode;
  fov: number;
  orthographicZoom: number;
  autoRotate: boolean;
  enablePan: boolean;
  enableZoom: boolean;
  minDistance: number;
  maxDistance: number;
  backgroundColor: string;
  showGrid: boolean;
  gridSize: number;
  gridCellSize: number;
  gridFadeDistance: number;
  showAxes: boolean;
  axesSize: number;
  showFloor: boolean;
  floorY: number;
  floorColor: string;
  castShadow: boolean;
  receiveShadow: boolean;
  ambientIntensity: number;
  keyLightIntensity: number;
  keyLightPosition: Vec3;
  environmentEnabled: boolean;
  environmentPreset: EnvironmentPreset;
  environmentBackground: boolean;
  toneMapping: ToneMappingMode;
  exposure: number;
  fogEnabled: boolean;
  fogNear: number;
  fogFar: number;
  wireframe: boolean;
  doubleSided: boolean;
  overrideMaterial: boolean;
  materialColor: string;
  roughness: number;
  metalness: number;
  animationName: string;
  animationPlaying: boolean;
  animationSpeed: number;
  animationLoop: AnimationLoopMode;
  showStats: boolean;
}
