// Unit tests for src/devtools/stage_debug_utils.js.
// Run with: node --test test/unit/

import { test } from "node:test";
import assert from "node:assert/strict";

import { buildBindGroups } from "../../src/devtools/stage_debug_utils.js";

// The plugin server hands payloads to the debugger as Node Buffers. Small ones
// come from a shared pool (non-zero byteOffset), and Buffer#slice() returns a
// view rather than a copy, so the bound bytes must still start at offset 0.
test("buildBindGroups copies a pooled Node Buffer into its own buffer", () => {
  const floats = new Float32Array([1906, 949, 1, 1]);
  const pooled = Buffer.from(Buffer.from(floats.buffer).toString("base64"), "base64");
  assert.ok(pooled.byteOffset > 0 || pooled.buffer.byteLength > pooled.byteLength,
    "expected a pooled Buffer (view into a larger allocation)");

  const database = {
    getObject: (id) => (id === 7
      ? { descriptor: { entries: [{ binding: 1, resource: { buffer: { __id: 3 } } }] } }
      : null),
  };
  const groups = buildBindGroups(database, [{ args: [0, { __id: 7 }], bufferData: [pooled] }]);
  const bound = groups[0][1];
  assert.equal(bound.byteOffset, 0);
  assert.equal(bound.buffer.byteLength, 16);
  assert.deepEqual(Array.from(new Float32Array(bound.buffer)), [1906, 949, 1, 1]);
});
