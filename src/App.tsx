import { RefreshCw, RotateCcw, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ControlPanel } from "./components/ControlPanel";
import { SceneCanvas } from "./components/SceneCanvas";
import { DEFAULT_MODEL_URL, DEFAULT_SETTINGS } from "./defaults";
import { normalizeImportedSettings, readStoredSettings, writeStoredSettings } from "./settingsStorage";
import type {
  CameraView,
  CameraViewCommand,
  ModelReport,
  ModelStatus,
  TemplateSettings,
  Vec3,
  VectorSettingKey,
} from "./types";

function App() {
  const initialSettingsRef = useRef<TemplateSettings | null>(null);
  if (!initialSettingsRef.current) {
    initialSettingsRef.current = readStoredSettings();
  }

  const [settings, setSettings] = useState<TemplateSettings>(initialSettingsRef.current);
  const [modelLabel, setModelLabel] = useState(initialSettingsRef.current.modelUrl);
  const [animations, setAnimations] = useState<string[]>([]);
  const [modelReport, setModelReport] = useState<ModelReport | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus>("loading");
  const [modelError, setModelError] = useState<string | null>(null);
  const [modelRevision, setModelRevision] = useState(0);
  const [viewCommand, setViewCommand] = useState<CameraViewCommand>({ preset: "isometric", sequence: 0 });
  const [fitSignal, setFitSignal] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const objectUrlRef = useRef<string | null>(null);
  const dragDepthRef = useRef(0);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => revokeObjectUrl, [revokeObjectUrl]);

  useEffect(() => {
    writeStoredSettings(settings);
  }, [settings]);

  const patchSettings = useCallback((patch: Partial<TemplateSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const updateVector = useCallback(
    (key: VectorSettingKey, index: number, value: number) => {
      setSettings((current) => {
        const next = [...current[key]] as Vec3;
        next[index] = value;
        return { ...current, [key]: next };
      });
    },
    [],
  );

  const loadFile = useCallback(
    (file: File) => {
      revokeObjectUrl();
      const nextUrl = URL.createObjectURL(file);
      objectUrlRef.current = nextUrl;
      setModelLabel(file.name);
      setAnimations([]);
      setModelReport(null);
      setModelError(null);
      setModelStatus("loading");
      setSettings((current) => ({
        ...current,
        modelUrl: nextUrl,
        animationName: "",
      }));
      setModelRevision((value) => value + 1);
      setFitSignal((value) => value + 1);
    },
    [revokeObjectUrl],
  );

  const loadPath = useCallback(
    (path: string) => {
      revokeObjectUrl();
      setModelLabel(path);
      setAnimations([]);
      setModelReport(null);
      setModelError(null);
      setModelStatus("loading");
      setSettings((current) => ({
        ...current,
        modelUrl: path,
        animationName: "",
      }));
      setModelRevision((value) => value + 1);
      setFitSignal((value) => value + 1);
    },
    [revokeObjectUrl],
  );

  const reloadModel = useCallback(() => {
    setAnimations([]);
    setModelReport(null);
    setModelError(null);
    setModelStatus("loading");
    setModelRevision((value) => value + 1);
    setFitSignal((value) => value + 1);
  }, []);

  const resetTransform = useCallback(() => {
    patchSettings({
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      uniformScale: 1,
    });
  }, [patchSettings]);

  const resetAll = useCallback(() => {
    revokeObjectUrl();
    setModelLabel(DEFAULT_MODEL_URL);
    setAnimations([]);
    setModelReport(null);
    setModelError(null);
    setModelStatus("loading");
    setSettings(DEFAULT_SETTINGS);
    setModelRevision((value) => value + 1);
    setFitSignal((value) => value + 1);
  }, [revokeObjectUrl]);

  const handleAnimationsChange = useCallback((names: string[]) => {
    setAnimations(names);
    setSettings((current) => {
      if (!names.length) {
        return current.animationName ? { ...current, animationName: "" } : current;
      }

      if (names.includes(current.animationName)) {
        return current;
      }
      return { ...current, animationName: names[0] };
    });
  }, []);

  const handleModelReport = useCallback((report: ModelReport) => {
    setModelReport(report);
    setModelError(null);
    setModelStatus("ready");
  }, []);

  const handleModelError = useCallback((message: string) => {
    setModelReport(null);
    setModelError(message);
    setModelStatus("error");
  }, []);

  const handleTransformCommit = useCallback((transform: Pick<TemplateSettings, "position" | "rotation" | "scale">) => {
    patchSettings({
      position: transform.position,
      rotation: transform.rotation,
      scale: transform.scale,
      uniformScale: 1,
    });
  }, [patchSettings]);

  const handleImportSettings = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const nextSettings = normalizeImportedSettings(JSON.parse(text));
        revokeObjectUrl();
        setSettings(nextSettings);
        setModelLabel(nextSettings.modelUrl);
        setAnimations([]);
        setModelReport(null);
        setModelError(null);
        setModelStatus("loading");
        setModelRevision((value) => value + 1);
        setFitSignal((value) => value + 1);
      } catch (error) {
        setModelError(error instanceof Error ? error.message : "Invalid preset file");
        setModelStatus("error");
      }
    },
    [revokeObjectUrl],
  );

  const handleViewPreset = useCallback((preset: CameraView) => {
    setViewCommand((current) => ({
      preset,
      sequence: current.sequence + 1,
    }));
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragDepthRef.current = 0;
      setDragActive(false);
      const file = [...event.dataTransfer.files].find((item) => /\.(glb|gltf)$/i.test(item.name));
      if (file) {
        loadFile(file);
      }
    },
    [loadFile],
  );

  return (
    <main
      className="app"
      onDragEnter={(event) => {
        event.preventDefault();
        dragDepthRef.current += 1;
        setDragActive(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        setDragActive(dragDepthRef.current > 0);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <section className="viewport-shell" aria-label="3D viewport">
        <SceneCanvas
          settings={settings}
          modelRevision={modelRevision}
          modelReport={modelReport}
          viewCommand={viewCommand}
          fitSignal={fitSignal}
          onAnimationsChange={handleAnimationsChange}
          onModelReport={handleModelReport}
          onModelError={handleModelError}
          onTransformCommit={handleTransformCommit}
        />
        {dragActive ? <div className="drop-overlay">Drop GLB or glTF</div> : null}
        <div className="viewport-bar">
          <div>
            <strong>R3F GLB Template</strong>
            <span>{modelLabel}</span>
            <span className={`model-status is-${modelStatus}`}>
              {buildStatusText(modelStatus, modelReport, modelError)}
            </span>
          </div>
          <div className="viewport-actions">
            <button type="button" onClick={reloadModel}>
              <RefreshCw size={16} aria-hidden="true" />
              Reload
            </button>
            <button type="button" onClick={() => setFitSignal((value) => value + 1)}>
              <RotateCcw size={16} aria-hidden="true" />
              Fit
            </button>
            <label className="file-button">
              <Upload size={16} aria-hidden="true" />
              GLB
              <input
                type="file"
                accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) {
                    loadFile(file);
                  }
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        </div>
      </section>
      <ControlPanel
        settings={settings}
        animations={animations}
        modelLabel={modelLabel}
        modelReport={modelReport}
        modelStatus={modelStatus}
        modelError={modelError}
        onPatchSettings={patchSettings}
        onVectorChange={updateVector}
        onFileSelect={loadFile}
        onLoadPath={loadPath}
        onReloadModel={reloadModel}
        onImportSettings={(file) => {
          void handleImportSettings(file);
        }}
        onViewPreset={handleViewPreset}
        onFit={() => setFitSignal((value) => value + 1)}
        onResetTransform={resetTransform}
        onResetAll={resetAll}
      />
    </main>
  );
}

function buildStatusText(status: ModelStatus, report: ModelReport | null, error: string | null) {
  if (status === "error") {
    return error ? `Error: ${error}` : "Error";
  }

  if (status === "loading") {
    return "Loading";
  }

  if (!report) {
    return "Ready";
  }

  const [width, height, depth] = report.dimensions.map((value) => formatNumber(value));
  return `Ready / ${report.meshes} meshes / ${report.triangles} tris / ${width} x ${height} x ${depth}`;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

export default App;
