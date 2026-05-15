# R3F GLB Template

Blenderから書き出したGLBをすぐ確認するための React Three Fiber テンプレートです。

## Quick Start

```bash
npm install
npm run dev
```

デフォルトでは `public/models/model.glb` を読み込みます。Blenderから同じ場所にGLBを書き出すか、ブラウザ上のGLBボタンにファイルを入れて確認できます。

## Blender Export

Blenderでは `File > Export > glTF 2.0` を使い、Format は `glTF Binary (.glb)` を選びます。最初は `Apply Modifiers` と `+Y Up` を有効にし、テクスチャ込みで1ファイルにまとめる運用が扱いやすいです。DRACO圧縮を使った場合はUIの `DRACO decoder` を有効にします。

## Included Controls

- GLBパス切替、ローカルGLBアップロード、ドラッグ&ドロップ
- 位置、回転、XYZスケール、均一スケール、中央寄せ、接地
- TransformControlsによる移動、回転、スケールのギズモ操作
- Perspective / Orthographic、FOV、ズーム、OrbitControls
- グリッド、軸、床、フォグ、背景色
- Ambient / Directional light、影、Environment preset
- Wireframe、Double side、マテリアル色・roughness・metalness上書き
- アニメーションクリップ選択、再生、ループ、速度
- JSX用のtransform snippetコピー

## Structure

```text
public/models/model.glb       # default GLB
src/components/SceneCanvas.tsx # R3F scene, loader, camera, helpers
src/components/ControlPanel.tsx # adjustment UI
src/defaults.ts               # template defaults
```

## Commands

```bash
npm run dev        # start Vite
npm run build      # typecheck and production build
npm run sample:model # regenerate the sample cube GLB
```
