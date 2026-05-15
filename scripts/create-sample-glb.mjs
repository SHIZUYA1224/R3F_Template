import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const output = resolve("public/models/model.glb");

const positions = new Float32Array([
  -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
  0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5,
  -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
  -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
  0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5,
  -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5,
]);

const normals = new Float32Array([
  0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
  0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
  0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
  0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
  1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
  -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
]);

const indices = new Uint16Array([
  0, 1, 2, 0, 2, 3,
  4, 5, 6, 4, 6, 7,
  8, 9, 10, 8, 10, 11,
  12, 13, 14, 12, 14, 15,
  16, 17, 18, 16, 18, 19,
  20, 21, 22, 20, 22, 23,
]);

const positionOffset = 0;
const normalOffset = positions.byteLength;
const indexOffset = positions.byteLength + normals.byteLength;
const bin = Buffer.concat([typedArrayBuffer(positions), typedArrayBuffer(normals), typedArrayBuffer(indices)]);

const gltf = {
  asset: {
    version: "2.0",
    generator: "R3F GLB Template sample generator",
  },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ name: "Sample Blender GLB", mesh: 0 }],
  meshes: [
    {
      name: "Sample Cube",
      primitives: [
        {
          attributes: { POSITION: 0, NORMAL: 1 },
          indices: 2,
          material: 0,
        },
      ],
    },
  ],
  materials: [
    {
      name: "Sample Blue",
      pbrMetallicRoughness: {
        baseColorFactor: [0.36, 0.72, 1, 1],
        roughnessFactor: 0.62,
        metallicFactor: 0.05,
      },
    },
  ],
  buffers: [{ byteLength: bin.byteLength }],
  bufferViews: [
    { buffer: 0, byteOffset: positionOffset, byteLength: positions.byteLength, target: 34962 },
    { buffer: 0, byteOffset: normalOffset, byteLength: normals.byteLength, target: 34962 },
    { buffer: 0, byteOffset: indexOffset, byteLength: indices.byteLength, target: 34963 },
  ],
  accessors: [
    {
      bufferView: 0,
      componentType: 5126,
      count: 24,
      type: "VEC3",
      min: [-0.5, -0.5, -0.5],
      max: [0.5, 0.5, 0.5],
    },
    { bufferView: 1, componentType: 5126, count: 24, type: "VEC3" },
    { bufferView: 2, componentType: 5123, count: 36, type: "SCALAR" },
  ],
};

const json = Buffer.from(JSON.stringify(gltf));
const jsonChunk = pad(json, 0x20);
const binChunk = pad(bin, 0x00);
const totalLength = 12 + 8 + jsonChunk.byteLength + 8 + binChunk.byteLength;
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(totalLength, 8);

const jsonHeader = Buffer.alloc(8);
jsonHeader.writeUInt32LE(jsonChunk.byteLength, 0);
jsonHeader.writeUInt32LE(0x4e4f534a, 4);

const binHeader = Buffer.alloc(8);
binHeader.writeUInt32LE(binChunk.byteLength, 0);
binHeader.writeUInt32LE(0x004e4942, 4);

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, Buffer.concat([header, jsonHeader, jsonChunk, binHeader, binChunk]));
console.log(`Wrote ${output}`);

function typedArrayBuffer(value) {
  return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
}

function pad(buffer, value) {
  const padding = (4 - (buffer.byteLength % 4)) % 4;
  return padding ? Buffer.concat([buffer, Buffer.alloc(padding, value)]) : buffer;
}
