import { RotateCcw, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ControlPanel } from "./components/ControlPanel";
import { SceneCanvas } from "./components/SceneCanvas";
import { DEFAULT_MODEL_URL, DEFAULT_SETTINGS } from "./defaults";
import type { TemplateSettings, Vec3, VectorSettingKey } from "./types";

function App() {
  const [settings, setSettings] = useState<TemplateSettings>(DEFAULT_SETTINGS);
  const [modelLabel, setModelLabel] = useState(DEFAULT_MODEL_URL);
  const [animations, setAnimations] = useState<string[]>([]);
  const [fitSignal, setFitSignal] = useState(0);
  const objectUrlRef = useRef<string | null>(null);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => revokeObjectUrl, [revokeObjectUrl]);

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
      setSettings((current) => ({
        ...current,
        modelUrl: nextUrl,
        animationName: "",
      }));
      setFitSignal((value) => value + 1);
    },
    [revokeObjectUrl],
  );

  const loadPath = useCallback(
    (path: string) => {
      revokeObjectUrl();
      setModelLabel(path);
      setAnimations([]);
      setSettings((current) => ({
        ...current,
        modelUrl: path,
        animationName: "",
      }));
      setFitSignal((value) => value + 1);
    },
    [revokeObjectUrl],
  );

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
    setSettings(DEFAULT_SETTINGS);
    setFitSignal((value) => value + 1);
  }, [revokeObjectUrl]);

  const handleAnimationsChange = useCallback((names: string[]) => {
    setAnimations(names);
    setSettings((current) => {
      if (!names.length || names.includes(current.animationName)) {
        return current;
      }
      return { ...current, animationName: names[0] };
    });
  }, []);

  const handleTransformCommit = useCallback((transform: Pick<TemplateSettings, "position" | "rotation" | "scale">) => {
    patchSettings({
      position: transform.position,
      rotation: transform.rotation,
      scale: transform.scale,
      uniformScale: 1,
    });
  }, [patchSettings]);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const file = [...event.dataTransfer.files].find((item) => /\.(glb|gltf)$/i.test(item.name));
      if (file) {
        loadFile(file);
      }
    },
    [loadFile],
  );

  return (
    <main className="app" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
      <section className="viewport-shell" aria-label="3D viewport">
        <SceneCanvas
          settings={settings}
          fitSignal={fitSignal}
          onAnimationsChange={handleAnimationsChange}
          onTransformCommit={handleTransformCommit}
        />
        <div className="viewport-bar">
          <div>
            <strong>R3F GLB Template</strong>
            <span>{modelLabel}</span>
          </div>
          <div className="viewport-actions">
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
        onPatchSettings={patchSettings}
        onVectorChange={updateVector}
        onFileSelect={loadFile}
        onLoadPath={loadPath}
        onFit={() => setFitSignal((value) => value + 1)}
        onResetTransform={resetTransform}
        onResetAll={resetAll}
      />
    </main>
  );
}

export default App;
