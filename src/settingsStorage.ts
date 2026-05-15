import { DEFAULT_MODEL_URL, DEFAULT_SETTINGS } from "./defaults";
import type { TemplateSettings, Vec3 } from "./types";

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

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preset));
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
