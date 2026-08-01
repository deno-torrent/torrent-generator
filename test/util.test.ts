import { assertEquals, assertMatch, assertStrictEquals } from "@std/assert"
import { join } from "@std/path"
import { PieceSizeEnum } from "../mod.ts"
import {
  buildPieceFiles,
  calcPieceSize,
  getDefaultCreatedBy,
  getLatestTag,
  isHiddenFile,
  sha1sum,
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

Deno.test("calcPieceSize: SIZE_AUTO selects the first preset for empty content", () => {
  assertStrictEquals(calcPieceSize(0, PieceSizeEnum.SIZE_AUTO), PieceSizeEnum.SIZE_16MB)
})

Deno.test("calcPieceSize: SIZE_AUTO is capped at SIZE_512MB", () => {
  const MB = 1024 * 1024
  // Files >= 512 MB should not exceed the 512 MB cap
  assertStrictEquals(calcPieceSize(512 * MB, PieceSizeEnum.SIZE_AUTO), PieceSizeEnum.SIZE_512MB)
  assertStrictEquals(calcPieceSize(1024 * MB, PieceSizeEnum.SIZE_AUTO), PieceSizeEnum.SIZE_512MB)
  assertStrictEquals(calcPieceSize(4096 * MB, PieceSizeEnum.SIZE_AUTO), PieceSizeEnum.SIZE_512MB)
})

Deno.test("buildPieceFiles: inserts padding before each following non-empty file", async () => {
  const files = [
    join(Deno.cwd(), "test", "entry", "dir1", "1.txt"),
    join(Deno.cwd(), "test", "entry", "dir2", "2.txt"),
  ]
  const pieceFiles = await buildPieceFiles(files, 4)

  assertEquals(pieceFiles.map((file) => file.length), [1, 3, 1])
  assertEquals(pieceFiles.map((file) => file.padding), [false, true, false])
})

Deno.test("sha1sum: aligned mode hashes zero-filled padding", async () => {
  const directory = await Deno.makeTempDir({ prefix: "torrent-generator-align-" })
  try {
    const first = join(directory, "first")
    const second = join(directory, "second")
    await Deno.writeTextFile(first, "abc")
    await Deno.writeTextFile(second, "de")

    const actual = await sha1sum([first, second], 4, true)
    const firstDigest = new Uint8Array(await crypto.subtle.digest("SHA-1", new Uint8Array([97, 98, 99, 0])))
    const secondDigest = new Uint8Array(await crypto.subtle.digest("SHA-1", new TextEncoder().encode("de")))
    assertEquals(actual, new Uint8Array([...firstDigest, ...secondDigest]))
  } finally {
    await Deno.remove(directory, { recursive: true })
  }
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
