import { assertEquals, assertMatch, assertStrictEquals } from "@std/assert"
import { PieceSizeEnum } from "../mod.ts"
import {
  calcPieceSize,
  getDefaultCreatedBy,
  getLatestTag,
  isHiddenFile,
} from "../src/util.ts"

// ─── getLatestTag ─────────────────────────────────────────────────────────────

Deno.test("getLatestTag: returns a semver-formatted string", async () => {
  const tag = await getLatestTag()
  assertMatch(tag, /^\d+\.\d+\.\d+/)
})

Deno.test("getLatestTag: each component is a non-negative integer", async () => {
  const tag = await getLatestTag()
  const parts = tag.split(".").map(Number)
  assertEquals(parts.length, 3)
  for (const part of parts) {
    assertEquals(part >= 0, true)
  }
})

// ─── calcPieceSize – SIZE_AUTO ────────────────────────────────────────────────

Deno.test("calcPieceSize: SIZE_AUTO selects smallest preset > fileSize", () => {
  const MB = 1024 * 1024
  // Each size is 1 byte below the corresponding preset boundary
  assertStrictEquals(calcPieceSize(16 * MB - 1, PieceSizeEnum.SIZE_AUTO), PieceSizeEnum.SIZE_16MB)
  assertStrictEquals(calcPieceSize(32 * MB - 1, PieceSizeEnum.SIZE_AUTO), PieceSizeEnum.SIZE_32MB)
  assertStrictEquals(calcPieceSize(64 * MB - 1, PieceSizeEnum.SIZE_AUTO), PieceSizeEnum.SIZE_64MB)
  assertStrictEquals(calcPieceSize(128 * MB - 1, PieceSizeEnum.SIZE_AUTO), PieceSizeEnum.SIZE_128MB)
  assertStrictEquals(calcPieceSize(256 * MB - 1, PieceSizeEnum.SIZE_AUTO), PieceSizeEnum.SIZE_256MB)
})

Deno.test("calcPieceSize: SIZE_AUTO is capped at SIZE_512MB", () => {
  const MB = 1024 * 1024
  // Files >= 512 MB should not exceed the 512 MB cap
  assertStrictEquals(calcPieceSize(512 * MB, PieceSizeEnum.SIZE_AUTO), PieceSizeEnum.SIZE_512MB)
  assertStrictEquals(calcPieceSize(1024 * MB, PieceSizeEnum.SIZE_AUTO), PieceSizeEnum.SIZE_512MB)
  assertStrictEquals(calcPieceSize(4096 * MB, PieceSizeEnum.SIZE_AUTO), PieceSizeEnum.SIZE_512MB)
})

// ─── calcPieceSize – explicit preset ─────────────────────────────────────────

Deno.test("calcPieceSize: explicit preset is returned unchanged regardless of fileSize", () => {
  const MB = 1024 * 1024
  const sizes = [
    PieceSizeEnum.SIZE_16MB,
    PieceSizeEnum.SIZE_32MB,
    PieceSizeEnum.SIZE_64MB,
    PieceSizeEnum.SIZE_128MB,
    PieceSizeEnum.SIZE_256MB,
    PieceSizeEnum.SIZE_512MB,
    PieceSizeEnum.SIZE_1GB,
  ]
  for (const preset of sizes) {
    assertStrictEquals(calcPieceSize(16 * MB, preset), preset)
    assertStrictEquals(calcPieceSize(8192 * MB, preset), preset)
  }
})

// ─── getDefaultCreatedBy ──────────────────────────────────────────────────────

Deno.test("getDefaultCreatedBy: starts with the expected prefix", async () => {
  const value = await getDefaultCreatedBy()
  assertEquals(value.startsWith("deno-torrent-generator@"), true)
})

Deno.test("getDefaultCreatedBy: version suffix is semver-formatted", async () => {
  const value = await getDefaultCreatedBy()
  const version = value.replace("deno-torrent-generator@", "")
  assertMatch(version, /^\d+\.\d+\.\d+/)
})

// ─── isHiddenFile ─────────────────────────────────────────────────────────────

Deno.test("isHiddenFile: detects dot-prefixed file names", () => {
  assertEquals(isHiddenFile(".DS_Store"), true)
  assertEquals(isHiddenFile(".gitignore"), true)
  assertEquals(isHiddenFile(".env"), true)
})

Deno.test("isHiddenFile: returns false for normal files", () => {
  assertEquals(isHiddenFile("readme.txt"), false)
  assertEquals(isHiddenFile("main.ts"), false)
  assertEquals(isHiddenFile("no-dot"), false)
})

Deno.test("isHiddenFile: handles paths with leading directories", () => {
  assertEquals(isHiddenFile("/path/to/.hidden"), true)
  assertEquals(isHiddenFile("/path/to/visible.txt"), false)
})

Deno.test("isHiddenFile: empty string is not hidden", () => {
  assertEquals(isHiddenFile(""), false)
})
