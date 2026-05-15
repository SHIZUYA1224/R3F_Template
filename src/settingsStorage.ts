import { DEFAULT_MODEL_URL, DEFAULT_SETTINGS } from "./defaults";
import type {
  AnimationLoopMode,
  CameraMode,
  EnvironmentPreset,
  TemplateSettings,
  ToneMappingMode,
  TransformMode,
  Vec3,
} from "./types";

const STORAGE_KEY = "r3f-glb-template-settings";

export interface StoredTemplatePreset {
  settings: TemplateSettings;
  savedAt: string;
}

export function readStoredSettings() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(stored) as unknown;
    return normalizeSettings(isRecord(parsed) && "settings" in parsed ? parsed.settings : parsed);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function writeStoredSettings(settings: TemplateSettings) {
  const preset: StoredTemplatePreset = {
    settings: settingsForStorage(settings),
    savedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preset));
  } catch {
    // The viewer should keep working even if browser storage is unavailable.
  }
}

export function settingsForStorage(settings: TemplateSettings): TemplateSettings {
  if (!settings.modelUrl.startsWith("blob:")) {
    return settings;
  }

  return {
    ...settings,
    modelUrl: DEFAULT_MODEL_URL,
    animationName: "",
  };
}

export function normalizeImportedSettings(value: unknown): TemplateSettings {
  return normalizeSettings(isRecord(value) && "settings" in value ? value.settings : value);
}

function normalizeSettings(value: unknown): TemplateSettings {
  const raw = isRecord(value) ? value : {};
  const next = { ...DEFAULT_SETTINGS, ...raw } as TemplateSettings;

  next.position = readVec3(raw.position, DEFAULT_SETTINGS.position);
  next.rotation = readVec3(raw.rotation, DEFAULT_SETTINGS.rotation);
  next.scale = readVec3(raw.scale, DEFAULT_SETTINGS.scale);
  next.keyLightPosition = readVec3(raw.keyLightPosition, DEFAULT_SETTINGS.keyLightPosition);
  next.modelUrl = typeof raw.modelUrl === "string" && raw.modelUrl ? raw.modelUrl : DEFAULT_MODEL_URL;
  next.cameraMode = readOption(raw.cameraMode, ["perspective", "orthographic"], DEFAULT_SETTINGS.cameraMode);
  next.transformMode = readOption(raw.transformMode, ["translate", "rotate", "scale"], DEFAULT_SETTINGS.transformMode);
  next.animationLoop = readOption(raw.animationLoop, ["repeat", "once"], DEFAULT_SETTINGS.animationLoop);
  next.toneMapping = readOption(raw.toneMapping, ["none", "linear", "aces"], DEFAULT_SETTINGS.toneMapping);
  next.environmentPreset = readOption(
    raw.environmentPreset,
    ["apartment", "city", "dawn", "forest", "lobby", "night", "park", "studio", "sunset", "warehouse"],
    DEFAULT_SETTINGS.environmentPreset,
  );

  next.uniformScale = readNumber(raw.uniformScale, DEFAULT_SETTINGS.uniformScale, 0.001, 100);
  next.fitMargin = readNumber(raw.fitMargin, DEFAULT_SETTINGS.fitMargin, 0.1, 10);
  next.fov = readNumber(raw.fov, DEFAULT_SETTINGS.fov, 1, 120);
  next.orthographicZoom = readNumber(raw.orthographicZoom, DEFAULT_SETTINGS.orthographicZoom, 1, 500);
  next.minDistance = readNumber(raw.minDistance, DEFAULT_SETTINGS.minDistance, 0.001, 500);
  next.maxDistance = Math.max(
    next.minDistance,
    readNumber(raw.maxDistance, DEFAULT_SETTINGS.maxDistance, 0.001, 1000),
  );
  next.gridSize = readNumber(raw.gridSize, DEFAULT_SETTINGS.gridSize, 0.1, 500);
  next.gridCellSize = readNumber(raw.gridCellSize, DEFAULT_SETTINGS.gridCellSize, 0.001, 50);
  next.gridFadeDistance = readNumber(raw.gridFadeDistance, DEFAULT_SETTINGS.gridFadeDistance, 0, 500);
  next.axesSize = readNumber(raw.axesSize, DEFAULT_SETTINGS.axesSize, 0.001, 100);
  next.floorY = readNumber(raw.floorY, DEFAULT_SETTINGS.floorY, -100, 100);
  next.ambientIntensity = readNumber(raw.ambientIntensity, DEFAULT_SETTINGS.ambientIntensity, 0, 20);
  next.keyLightIntensity = readNumber(raw.keyLightIntensity, DEFAULT_SETTINGS.keyLightIntensity, 0, 50);
  next.exposure = readNumber(raw.exposure, DEFAULT_SETTINGS.exposure, 0, 10);
  next.fogNear = readNumber(raw.fogNear, DEFAULT_SETTINGS.fogNear, 0, 1000);
  next.fogFar = Math.max(next.fogNear + 0.001, readNumber(raw.fogFar, DEFAULT_SETTINGS.fogFar, 0.001, 2000));
  next.roughness = readNumber(raw.roughness, DEFAULT_SETTINGS.roughness, 0, 1);
  next.metalness = readNumber(raw.metalness, DEFAULT_SETTINGS.metalness, 0, 1);
  next.animationSpeed = readNumber(raw.animationSpeed, DEFAULT_SETTINGS.animationSpeed, 0, 10);

  next.backgroundColor = readColor(raw.backgroundColor, DEFAULT_SETTINGS.backgroundColor);
  next.floorColor = readColor(raw.floorColor, DEFAULT_SETTINGS.floorColor);
  next.materialColor = readColor(raw.materialColor, DEFAULT_SETTINGS.materialColor);

  next.useDraco = readBoolean(raw.useDraco, DEFAULT_SETTINGS.useDraco);
  next.autoCenter = readBoolean(raw.autoCenter, DEFAULT_SETTINGS.autoCenter);
  next.groundAlign = readBoolean(raw.groundAlign, DEFAULT_SETTINGS.groundAlign);
  next.showBounds = readBoolean(raw.showBounds, DEFAULT_SETTINGS.showBounds);
  next.showTransformGizmo = readBoolean(raw.showTransformGizmo, DEFAULT_SETTINGS.showTransformGizmo);
  next.fitOnLoad = readBoolean(raw.fitOnLoad, DEFAULT_SETTINGS.fitOnLoad);
  next.autoRotate = readBoolean(raw.autoRotate, DEFAULT_SETTINGS.autoRotate);
  next.enablePan = readBoolean(raw.enablePan, DEFAULT_SETTINGS.enablePan);
  next.enableZoom = readBoolean(raw.enableZoom, DEFAULT_SETTINGS.enableZoom);
  next.showGrid = readBoolean(raw.showGrid, DEFAULT_SETTINGS.showGrid);
  next.showAxes = readBoolean(raw.showAxes, DEFAULT_SETTINGS.showAxes);
  next.showFloor = readBoolean(raw.showFloor, DEFAULT_SETTINGS.showFloor);
  next.castShadow = readBoolean(raw.castShadow, DEFAULT_SETTINGS.castShadow);
  next.receiveShadow = readBoolean(raw.receiveShadow, DEFAULT_SETTINGS.receiveShadow);
  next.environmentEnabled = readBoolean(raw.environmentEnabled, DEFAULT_SETTINGS.environmentEnabled);
  next.environmentBackground = readBoolean(raw.environmentBackground, DEFAULT_SETTINGS.environmentBackground);
  next.fogEnabled = readBoolean(raw.fogEnabled, DEFAULT_SETTINGS.fogEnabled);
  next.wireframe = readBoolean(raw.wireframe, DEFAULT_SETTINGS.wireframe);
  next.doubleSided = readBoolean(raw.doubleSided, DEFAULT_SETTINGS.doubleSided);
  next.overrideMaterial = readBoolean(raw.overrideMaterial, DEFAULT_SETTINGS.overrideMaterial);
  next.animationPlaying = readBoolean(raw.animationPlaying, DEFAULT_SETTINGS.animationPlaying);
  next.showStats = readBoolean(raw.showStats, DEFAULT_SETTINGS.showStats);
  next.animationName = typeof raw.animationName === "string" ? raw.animationName : DEFAULT_SETTINGS.animationName;

  return next;
}

function readVec3(value: unknown, fallback: Vec3): Vec3 {
  if (!Array.isArray(value) || value.length !== 3) {
    return fallback;
  }

  const numbers = value.map((item) => Number(item));
  if (!numbers.every(Number.isFinite)) {
    return fallback;
  }

  return numbers as Vec3;
}

function readNumber(value: unknown, fallback: number, min: number, max: number) {
  const next = Number(value);
  if (!Number.isFinite(next)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, next));
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function readColor(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function readOption<T extends CameraMode | TransformMode | AnimationLoopMode | ToneMappingMode | EnvironmentPreset>(
  value: unknown,
  options: T[],
  fallback: T,
) {
  return typeof value === "string" && options.includes(value as T) ? (value as T) : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
