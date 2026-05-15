import {
  Box,
  Camera,
  Check,
  CirclePlay,
  Clipboard,
  Download,
  Eye,
  FileJson,
  Grid3X3,
  Info,
  Lightbulb,
  Move3D,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import { ENVIRONMENT_OPTIONS, MODEL_PATH_PRESETS } from "../defaults";
import { settingsForStorage } from "../settingsStorage";
import type { CameraView, ModelReport, ModelStatus, TemplateSettings, Vec3, VectorSettingKey } from "../types";

interface ControlPanelProps {
  settings: TemplateSettings;
  animations: string[];
  modelLabel: string;
  modelReport: ModelReport | null;
  modelStatus: ModelStatus;
  modelError: string | null;
  onPatchSettings: (patch: Partial<TemplateSettings>) => void;
  onVectorChange: (key: VectorSettingKey, index: number, value: number) => void;
  onFileSelect: (file: File) => void;
  onLoadPath: (path: string) => void;
  onReloadModel: () => void;
  onImportSettings: (file: File) => void;
  onViewPreset: (preset: CameraView) => void;
  onFit: () => void;
  onResetTransform: () => void;
  onResetAll: () => void;
}

const vectorLabels = ["X", "Y", "Z"];

export function ControlPanel({
  settings,
  animations,
  modelLabel,
  modelReport,
  modelStatus,
  modelError,
  onPatchSettings,
  onVectorChange,
  onFileSelect,
  onLoadPath,
  onReloadModel,
  onImportSettings,
  onViewPreset,
  onFit,
  onResetTransform,
  onResetAll,
}: ControlPanelProps) {
  const transformSnippet = buildTransformSnippet(settings);
  const presetJson = buildPresetJson(settings);

  return (
    <aside className="control-panel" aria-label="GLB controls">
      <header className="panel-header">
        <div>
          <span className="panel-kicker">Blender GLB</span>
          <h1>Viewport Controls</h1>
        </div>
        <button type="button" className="icon-button" onClick={onResetAll} title="Reset all controls">
          <RotateCcw size={18} aria-hidden="true" />
        </button>
      </header>

      <PanelSection title="Model" icon={<Box size={17} aria-hidden="true" />} defaultOpen>
        <label className="file-drop">
          <Upload size={18} aria-hidden="true" />
          <span>{modelLabel}</span>
          <input
            type="file"
            accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) {
                onFileSelect(file);
              }
              event.currentTarget.value = "";
            }}
          />
        </label>

        <TextField
          label="Model path"
          value={settings.modelUrl.startsWith("blob:") ? "" : settings.modelUrl}
          placeholder="/models/model.glb"
          onCommit={(value) => onLoadPath(value || "/models/model.glb")}
        />

        <div className="preset-row">
          {MODEL_PATH_PRESETS.map((path) => (
            <button key={path} type="button" onClick={() => onLoadPath(path)}>
              {path.replace("/models/", "")}
            </button>
          ))}
        </div>

        <Toggle
          label="DRACO decoder"
          checked={settings.useDraco}
          onChange={(useDraco) => onPatchSettings({ useDraco })}
        />
        <div className="button-row">
          <button type="button" onClick={onReloadModel}>
            <RefreshCw size={16} aria-hidden="true" />
            Reload
          </button>
          <button type="button" onClick={onFit}>
            <Camera size={16} aria-hidden="true" />
            Fit
          </button>
        </div>
      </PanelSection>

      <PanelSection title="Info" icon={<Info size={17} aria-hidden="true" />} defaultOpen>
        <ModelInfo report={modelReport} status={modelStatus} error={modelError} />
      </PanelSection>

      <PanelSection title="Transform" icon={<Move3D size={17} aria-hidden="true" />} defaultOpen>
        <VectorField label="Position" value={settings.position} settingKey="position" step={0.01} onChange={onVectorChange} />
        <VectorField label="Rotation" value={settings.rotation} settingKey="rotation" step={1} onChange={onVectorChange} />
        <VectorField label="Scale" value={settings.scale} settingKey="scale" step={0.01} min={0.001} onChange={onVectorChange} />
        <RangeField
          label="Uniform scale"
          value={settings.uniformScale}
          min={0.01}
          max={10}
          step={0.01}
          onChange={(uniformScale) => onPatchSettings({ uniformScale })}
        />
        <div className="toggle-grid">
          <Toggle
            label="Auto center"
            checked={settings.autoCenter}
            onChange={(autoCenter) => onPatchSettings({ autoCenter })}
          />
          <Toggle
            label="Ground align"
            checked={settings.groundAlign}
            onChange={(groundAlign) => onPatchSettings({ groundAlign })}
          />
          <Toggle
            label="Bounds"
            checked={settings.showBounds}
            onChange={(showBounds) => onPatchSettings({ showBounds })}
          />
        </div>
        <div className="button-row">
          <button type="button" onClick={onResetTransform}>
            <RotateCcw size={16} aria-hidden="true" />
            Transform
          </button>
          <button type="button" onClick={onFit}>
            <Camera size={16} aria-hidden="true" />
            Fit
          </button>
        </div>
        <Toggle
          label="Transform gizmo"
          checked={settings.showTransformGizmo}
          onChange={(showTransformGizmo) => onPatchSettings({ showTransformGizmo })}
        />
        <Segmented
          label="Gizmo mode"
          value={settings.transformMode}
          options={[
            ["translate", "Move"],
            ["rotate", "Rotate"],
            ["scale", "Scale"],
          ]}
          onChange={(transformMode) => onPatchSettings({ transformMode })}
        />
      </PanelSection>

      <PanelSection title="Camera" icon={<Camera size={17} aria-hidden="true" />}>
        <div className="view-preset-row">
          {[
            ["isometric", "Iso"],
            ["front", "Front"],
            ["right", "Right"],
            ["left", "Left"],
            ["back", "Back"],
            ["top", "Top"],
            ["bottom", "Bottom"],
          ].map(([preset, label]) => (
            <button key={preset} type="button" onClick={() => onViewPreset(preset as CameraView)}>
              {label}
            </button>
          ))}
        </div>
        <Segmented
          label="Projection"
          value={settings.cameraMode}
          options={[
            ["perspective", "Perspective"],
            ["orthographic", "Ortho"],
          ]}
          onChange={(cameraMode) => onPatchSettings({ cameraMode })}
        />
        <RangeField label="FOV" value={settings.fov} min={18} max={85} step={1} onChange={(fov) => onPatchSettings({ fov })} />
        <RangeField
          label="Ortho zoom"
          value={settings.orthographicZoom}
          min={20}
          max={220}
          step={1}
          onChange={(orthographicZoom) => onPatchSettings({ orthographicZoom })}
        />
        <div className="toggle-grid">
          <Toggle label="Auto rotate" checked={settings.autoRotate} onChange={(autoRotate) => onPatchSettings({ autoRotate })} />
          <Toggle label="Pan" checked={settings.enablePan} onChange={(enablePan) => onPatchSettings({ enablePan })} />
          <Toggle label="Zoom" checked={settings.enableZoom} onChange={(enableZoom) => onPatchSettings({ enableZoom })} />
        </div>
        <RangeField
          label="Min distance"
          value={settings.minDistance}
          min={0.1}
          max={20}
          step={0.1}
          onChange={(minDistance) => onPatchSettings({ minDistance })}
        />
        <RangeField
          label="Max distance"
          value={settings.maxDistance}
          min={5}
          max={160}
          step={1}
          onChange={(maxDistance) => onPatchSettings({ maxDistance })}
        />
        <Toggle
          label="Fit on load"
          checked={settings.fitOnLoad}
          onChange={(fitOnLoad) => onPatchSettings({ fitOnLoad })}
        />
        <RangeField
          label="Fit margin"
          value={settings.fitMargin}
          min={0.8}
          max={4}
          step={0.05}
          onChange={(fitMargin) => onPatchSettings({ fitMargin })}
        />
      </PanelSection>

      <PanelSection title="Lights" icon={<Lightbulb size={17} aria-hidden="true" />}>
        <RangeField
          label="Ambient"
          value={settings.ambientIntensity}
          min={0}
          max={3}
          step={0.01}
          onChange={(ambientIntensity) => onPatchSettings({ ambientIntensity })}
        />
        <RangeField
          label="Key light"
          value={settings.keyLightIntensity}
          min={0}
          max={8}
          step={0.05}
          onChange={(keyLightIntensity) => onPatchSettings({ keyLightIntensity })}
        />
        <VectorField
          label="Key position"
          value={settings.keyLightPosition}
          settingKey="keyLightPosition"
          step={0.1}
          onChange={onVectorChange}
        />
        <div className="toggle-grid">
          <Toggle label="Cast shadow" checked={settings.castShadow} onChange={(castShadow) => onPatchSettings({ castShadow })} />
          <Toggle
            label="Receive shadow"
            checked={settings.receiveShadow}
            onChange={(receiveShadow) => onPatchSettings({ receiveShadow })}
          />
        </div>
        <Toggle
          label="Environment"
          checked={settings.environmentEnabled}
          onChange={(environmentEnabled) => onPatchSettings({ environmentEnabled })}
        />
        <SelectField
          label="Env preset"
          value={settings.environmentPreset}
          options={ENVIRONMENT_OPTIONS.map((value) => [value, value])}
          onChange={(environmentPreset) => onPatchSettings({ environmentPreset })}
        />
        <Toggle
          label="Env background"
          checked={settings.environmentBackground}
          onChange={(environmentBackground) => onPatchSettings({ environmentBackground })}
        />
      </PanelSection>

      <PanelSection title="Scene" icon={<Grid3X3 size={17} aria-hidden="true" />}>
        <ColorField label="Background" value={settings.backgroundColor} onChange={(backgroundColor) => onPatchSettings({ backgroundColor })} />
        <div className="toggle-grid">
          <Toggle label="Grid" checked={settings.showGrid} onChange={(showGrid) => onPatchSettings({ showGrid })} />
          <Toggle label="Axes" checked={settings.showAxes} onChange={(showAxes) => onPatchSettings({ showAxes })} />
          <Toggle label="Floor" checked={settings.showFloor} onChange={(showFloor) => onPatchSettings({ showFloor })} />
          <Toggle label="Fog" checked={settings.fogEnabled} onChange={(fogEnabled) => onPatchSettings({ fogEnabled })} />
        </div>
        <RangeField label="Grid size" value={settings.gridSize} min={2} max={80} step={1} onChange={(gridSize) => onPatchSettings({ gridSize })} />
        <RangeField
          label="Grid cell"
          value={settings.gridCellSize}
          min={0.05}
          max={5}
          step={0.05}
          onChange={(gridCellSize) => onPatchSettings({ gridCellSize })}
        />
        <RangeField
          label="Grid fade"
          value={settings.gridFadeDistance}
          min={4}
          max={80}
          step={1}
          onChange={(gridFadeDistance) => onPatchSettings({ gridFadeDistance })}
        />
        <RangeField label="Axes size" value={settings.axesSize} min={0.5} max={12} step={0.1} onChange={(axesSize) => onPatchSettings({ axesSize })} />
        <RangeField label="Floor Y" value={settings.floorY} min={-5} max={5} step={0.01} onChange={(floorY) => onPatchSettings({ floorY })} />
        <ColorField label="Floor color" value={settings.floorColor} onChange={(floorColor) => onPatchSettings({ floorColor })} />
        <RangeField label="Fog near" value={settings.fogNear} min={0} max={80} step={1} onChange={(fogNear) => onPatchSettings({ fogNear })} />
        <RangeField label="Fog far" value={settings.fogFar} min={1} max={160} step={1} onChange={(fogFar) => onPatchSettings({ fogFar })} />
      </PanelSection>

      <PanelSection title="Material" icon={<Eye size={17} aria-hidden="true" />}>
        <div className="toggle-grid">
          <Toggle label="Wireframe" checked={settings.wireframe} onChange={(wireframe) => onPatchSettings({ wireframe })} />
          <Toggle label="Double side" checked={settings.doubleSided} onChange={(doubleSided) => onPatchSettings({ doubleSided })} />
          <Toggle
            label="Override"
            checked={settings.overrideMaterial}
            onChange={(overrideMaterial) => onPatchSettings({ overrideMaterial })}
          />
          <Toggle label="Stats" checked={settings.showStats} onChange={(showStats) => onPatchSettings({ showStats })} />
        </div>
        <ColorField label="Color" value={settings.materialColor} onChange={(materialColor) => onPatchSettings({ materialColor })} />
        <RangeField label="Roughness" value={settings.roughness} min={0} max={1} step={0.01} onChange={(roughness) => onPatchSettings({ roughness })} />
        <RangeField label="Metalness" value={settings.metalness} min={0} max={1} step={0.01} onChange={(metalness) => onPatchSettings({ metalness })} />
        <SelectField
          label="Tone map"
          value={settings.toneMapping}
          options={[
            ["aces", "ACES"],
            ["linear", "Linear"],
            ["none", "None"],
          ]}
          onChange={(toneMapping) => onPatchSettings({ toneMapping })}
        />
        <RangeField label="Exposure" value={settings.exposure} min={0.1} max={3} step={0.01} onChange={(exposure) => onPatchSettings({ exposure })} />
      </PanelSection>

      <PanelSection title="Animation" icon={<CirclePlay size={17} aria-hidden="true" />}>
        <SelectField
          label="Clip"
          value={settings.animationName}
          options={[["", "None"], ...animations.map((name) => [name, name] as [string, string])]}
          onChange={(animationName) => onPatchSettings({ animationName })}
        />
        <div className="toggle-grid">
          <Toggle
            label="Playing"
            checked={settings.animationPlaying}
            onChange={(animationPlaying) => onPatchSettings({ animationPlaying })}
          />
          <Toggle
            label="Loop"
            checked={settings.animationLoop === "repeat"}
            onChange={(repeat) => onPatchSettings({ animationLoop: repeat ? "repeat" : "once" })}
          />
        </div>
        <RangeField
          label="Speed"
          value={settings.animationSpeed}
          min={0}
          max={3}
          step={0.01}
          onChange={(animationSpeed) => onPatchSettings({ animationSpeed })}
        />
      </PanelSection>

      <PanelSection title="Export" icon={<SlidersHorizontal size={17} aria-hidden="true" />}>
        <div className="snippet-box">
          <code>{transformSnippet}</code>
        </div>
        <div className="button-row">
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(transformSnippet);
            }}
          >
            <Clipboard size={16} aria-hidden="true" />
            JSX
          </button>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(presetJson);
            }}
          >
            <FileJson size={16} aria-hidden="true" />
            JSON
          </button>
          <button type="button" onClick={() => downloadPreset(presetJson)}>
            <Download size={16} aria-hidden="true" />
            Preset
          </button>
          <label className="file-button">
            <Upload size={16} aria-hidden="true" />
            Preset
            <input
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file) {
                  onImportSettings(file);
                }
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </PanelSection>
    </aside>
  );
}

function ModelInfo({
  report,
  status,
  error,
}: {
  report: ModelReport | null;
  status: ModelStatus;
  error: string | null;
}) {
  if (status === "error") {
    return <div className="status-box is-error">{error || "Could not load the selected GLB."}</div>;
  }

  if (status === "loading") {
    return <div className="status-box">Loading model</div>;
  }

  if (!report) {
    return <div className="status-box">Ready</div>;
  }

  const dimensions = report.dimensions.map((value) => formatNumber(value)).join(" x ");
  const center = report.center.map((value) => formatNumber(value)).join(", ");

  return (
    <div className="info-grid">
      <InfoItem label="Meshes" value={String(report.meshes)} />
      <InfoItem label="Materials" value={String(report.materials)} />
      <InfoItem label="Vertices" value={String(report.vertices)} />
      <InfoItem label="Triangles" value={String(report.triangles)} />
      <InfoItem label="Animations" value={String(report.animations)} />
      <InfoItem label="Radius" value={formatNumber(report.radius)} />
      <InfoItem label="Size" value={dimensions} wide />
      <InfoItem label="Center" value={center} wide />
    </div>
  );
}

function InfoItem({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "info-item is-wide" : "info-item"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PanelSection({
  title,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="panel-section" open={defaultOpen}>
      <summary>
        {icon}
        <span>{title}</span>
      </summary>
      <div className="section-body">{children}</div>
    </details>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="toggle-field">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} />
      <span className="toggle-visual" aria-hidden="true">
        {checked ? <Check size={12} /> : null}
      </span>
      <span>{label}</span>
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="number-field">
      <span>{label}</span>
      <input
        type="number"
        value={formatNumber(value)}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(parseNumber(event.currentTarget.value, value))}
      />
    </label>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="range-field">
      <div className="range-header">
        <span>{label}</span>
        <input
          type="number"
          value={formatNumber(value)}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(parseNumber(event.currentTarget.value, value))}
        />
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(parseNumber(event.currentTarget.value, value))}
      />
    </div>
  );
}

function VectorField({
  label,
  value,
  settingKey,
  min,
  step,
  onChange,
}: {
  label: string;
  value: Vec3;
  settingKey: VectorSettingKey;
  min?: number;
  step: number;
  onChange: (key: VectorSettingKey, index: number, value: number) => void;
}) {
  return (
    <div className="vector-field">
      <span>{label}</span>
      <div className="vector-inputs">
        {value.map((item, index) => (
          <NumberField
            key={`${settingKey}-${vectorLabels[index]}`}
            label={vectorLabels[index]}
            value={item}
            min={min}
            step={step}
            onChange={(nextValue) => onChange(settingKey, index, nextValue)}
          />
        ))}
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="color-field">
      <span>{label}</span>
      <input type="color" value={value} onChange={(event) => onChange(event.currentTarget.value)} />
      <input type="text" value={value} onChange={(event) => onChange(event.currentTarget.value)} />
    </label>
  );
}

function TextField({
  label,
  value,
  placeholder,
  onCommit,
}: {
  label: string;
  value: string;
  placeholder: string;
  onCommit: (value: string) => void;
}) {
  return (
    <label className="text-field">
      <span>{label}</span>
      <input
        key={value}
        type="text"
        defaultValue={value}
        placeholder={placeholder}
        onBlur={(event) => onCommit(event.currentTarget.value.trim())}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (value: T) => void;
}) {
  return (
    <label className="select-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.currentTarget.value as T)}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (value: T) => void;
}) {
  return (
    <div className="segmented-field">
      <span>{label}</span>
      <div className="segmented-control">
        {options.map(([optionValue, optionLabel]) => (
          <button
            key={optionValue}
            type="button"
            className={optionValue === value ? "is-active" : ""}
            onClick={() => onChange(optionValue)}
          >
            {optionLabel}
          </button>
        ))}
      </div>
    </div>
  );
}

function parseNumber(value: string, fallback: number) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
}

function buildTransformSnippet(settings: TemplateSettings) {
  const position = settings.position.map((value) => formatNumber(value)).join(", ");
  const rotation = settings.rotation.map((value) => formatNumber((value * Math.PI) / 180)).join(", ");
  const scale = settings.scale.map((value) => formatNumber(value * settings.uniformScale)).join(", ");
  return `<primitive object={gltf.scene} position={[${position}]} rotation={[${rotation}]} scale={[${scale}]} />`;
}

function buildPresetJson(settings: TemplateSettings) {
  return JSON.stringify(
    {
      settings: settingsForStorage(settings),
      exportedAt: new Date().toISOString(),
    },
    null,
    2,
  );
}

function downloadPreset(json: string) {
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "r3f-glb-preset.json";
  anchor.click();
  URL.revokeObjectURL(url);
}
