/**
 * Generator integration tests.
 *
 * The in-memory writer collects bytes produced by generateTorrent so we can
 * inspect them without touching the filesystem (other than reading test-entry
 * files).  The golden-file test regenerates the fixture on the first run and
 * compares on subsequent runs, so it is resilient to bencode implementation
 * changes between releases – just delete `test/torrent/expect.torrent` to
 * reset it.
 */

import { decode } from "@deno-torrent/bencode"
import type { BencodeValue } from "@deno-torrent/bencode"
import { assertEquals, assertGreater, assertInstanceOf, assertRejects } from "@std/assert"
import { join } from "@std/path"
import { generateTorrent, PieceSizeEnum } from "../mod.ts"

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Minimal in-memory Writer that accumulates all written bytes. */
class MemoryWriter {
  readonly #parts: Uint8Array[] = []

  async write(p: Uint8Array): Promise<number> {
    this.#parts.push(new Uint8Array(p))
    return await Promise.resolve(p.length)
  }

  bytes(): Uint8Array {
    const total = this.#parts.reduce((s, p) => s + p.length, 0)
    const buf = new Uint8Array(total)
    let offset = 0
    for (const part of this.#parts) {
      buf.set(part, offset)
      offset += part.length
    }
    return buf
  }
}

const ENTRY = join(Deno.cwd(), "test", "entry")
const GOLDEN = join(Deno.cwd(), "test", "torrent", "expect.torrent")

/** Shared options used by all generator tests for determinism. */
/** Returns a fresh option object with a fixed timestamp for determinism. */
function baseOptions() {
  return {
    entry: ENTRY,
    pieceSizeEnum: PieceSizeEnum.SIZE_AUTO,
    ignoreHiddenFile: false,
    isPrivate: false,
    trackers: [new URL("http://example.com"), new URL("http://example2.com")],
    webSeeds: [new URL("http://example.com"), new URL("http://example2.com")],
    source: "http://example.com",
    comment: "comment",
    createdBy: "createdBy",
    createdAt: 0, // Fixed Unix timestamp for reproducible output
  }
}

// ─── Output sanity ────────────────────────────────────────────────────────────

Deno.test("generateTorrent: output is a non-empty bencode dictionary", async () => {
  const w = new MemoryWriter()
  await generateTorrent({ ...baseOptions(), writer: w })
  const bytes = w.bytes()

  assertGreater(bytes.length, 0)
  // Bencode dict: starts with 'd' (0x64), ends with 'e' (0x65)
  assertEquals(bytes[0], 0x64, "expected bencode dict start byte 'd'")
  assertEquals(bytes[bytes.length - 1], 0x65, "expected bencode dict end byte 'e'")
  assertInstanceOf(decode(bytes), Map)
})

// ─── Structural fields ────────────────────────────────────────────────────────

function containsString(bytes: Uint8Array, s: string): boolean {
  const needle = new TextEncoder().encode(s)
  outer: for (let i = 0; i <= bytes.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (bytes[i + j] !== needle[j]) continue outer
    }
    return true
  }
  return false
}

function decodeDictionary(bytes: Uint8Array): Map<string, BencodeValue> {
  const value = decode(bytes)
  if (!(value instanceof Map)) throw new Error("expected a bencode dictionary")
  return value as Map<string, BencodeValue>
}

function infoDictionary(bytes: Uint8Array): Map<string, BencodeValue> {
  const info = decodeDictionary(bytes).get("info")
  if (!(info instanceof Map)) throw new Error("expected an info dictionary")
  return info as Map<string, BencodeValue>
}

Deno.test("generateTorrent: output contains tracker URL", async () => {
  const w = new MemoryWriter()
  await generateTorrent({ ...baseOptions(), writer: w })
  assertEquals(decodeDictionary(w.bytes()).get("announce"), "http://example.com/")
})

Deno.test("generateTorrent: output contains creation comment", async () => {
  const w = new MemoryWriter()
  await generateTorrent({ ...baseOptions(), writer: w })
  assertEquals(decodeDictionary(w.bytes()).get("comment"), "comment")
})

Deno.test("generateTorrent: output contains created-by string", async () => {
  const w = new MemoryWriter()
  await generateTorrent({ ...baseOptions(), writer: w })
  assertEquals(decodeDictionary(w.bytes()).get("created by"), "createdBy")
})

Deno.test("generateTorrent: output contains source URL", async () => {
  const w = new MemoryWriter()
  await generateTorrent({ ...baseOptions(), writer: w })
  assertEquals(containsString(w.bytes(), "http://example.com"), true)
})

Deno.test("generateTorrent: encodes tracker, web-seed, and metadata fields structurally", async () => {
  const w = new MemoryWriter()
  await generateTorrent({ ...baseOptions(), writer: w })
  const torrent = decodeDictionary(w.bytes())

  assertEquals(torrent.get("announce-list"), [
    ["http://example.com/"],
    ["http://example2.com/"],
  ])
  assertEquals(torrent.get("url-list"), [
    "http://example.com/",
    "http://example2.com/",
  ])
  assertEquals(torrent.get("source"), "http://example.com")
  assertEquals(torrent.get("creation date"), 0)
})

// ─── Determinism ──────────────────────────────────────────────────────────────

Deno.test("generateTorrent: two identical runs produce identical bytes", async () => {
  const w1 = new MemoryWriter()
  const w2 = new MemoryWriter()
  await generateTorrent({ ...baseOptions(), writer: w1 })
  await generateTorrent({ ...baseOptions(), writer: w2 })
  assertEquals(w1.bytes(), w2.bytes())
})

// ─── Private flag ─────────────────────────────────────────────────────────────

Deno.test("generateTorrent: private torrent contains 'private' key", async () => {
  const w = new MemoryWriter()
  await generateTorrent({ ...baseOptions(), writer: w, isPrivate: true })
  assertEquals(infoDictionary(w.bytes()).get("private"), 1)
})

Deno.test("generateTorrent: non-private torrent output is shorter than private", async () => {
  const priv = new MemoryWriter()
  const pub = new MemoryWriter()
  await generateTorrent({ ...baseOptions(), writer: priv, isPrivate: true })
  await generateTorrent({ ...baseOptions(), writer: pub, isPrivate: false })
  assertGreater(priv.bytes().length, pub.bytes().length)
})

// ─── Single-file mode ─────────────────────────────────────────────────────────

Deno.test("generateTorrent: single-file entry produces valid output", async () => {
  const singleFile = join(ENTRY, "hello.txt")
  const w = new MemoryWriter()
  await generateTorrent({ ...baseOptions(), entry: singleFile, writer: w })
  const bytes = w.bytes()
  assertGreater(bytes.length, 0)
  assertEquals(bytes[0], 0x64)
  assertEquals(bytes[bytes.length - 1], 0x65)
  assertEquals(containsString(bytes, "hello.txt"), true)
  const info = infoDictionary(bytes)
  assertEquals(info.get("length"), 13)
  assertEquals(info.has("files"), false)
})

Deno.test("generateTorrent: directory with one file produces multi-file metadata", async () => {
  const w = new MemoryWriter()
  await generateTorrent({ ...baseOptions(), entry: join(ENTRY, "dir1"), writer: w })
  const bytes = w.bytes()

  assertEquals(containsString(bytes, "1.txt"), true)
  assertEquals(containsString(bytes, "files"), true)
  assertEquals(containsString(bytes, "path"), true)
  assertEquals(infoDictionary(bytes).has("length"), false)
})

Deno.test("generateTorrent: missing entry rejects with NotFound", async () => {
  const w = new MemoryWriter()
  await assertRejects(
    () => generateTorrent({ ...baseOptions(), entry: join(ENTRY, "missing-entry"), writer: w }),
    Deno.errors.NotFound,
  )
})

Deno.test("generateTorrent: empty directory rejects because no files remain", async () => {
  const directory = await Deno.makeTempDir({ prefix: "torrent-generator-empty-" })
  try {
    const w = new MemoryWriter()
    await assertRejects(
      () => generateTorrent({ ...baseOptions(), entry: directory, writer: w }),
      Error,
      "No files found",
    )
  } finally {
    await Deno.remove(directory, { recursive: true })
  }
})

Deno.test("generateTorrent: ignoreHiddenFile excludes hidden files", async () => {
  const directory = await Deno.makeTempDir({ prefix: "torrent-generator-hidden-" })
  try {
    await Deno.writeTextFile(join(directory, ".hidden"), "hidden")
    await Deno.writeTextFile(join(directory, "visible.txt"), "visible")

    const w = new MemoryWriter()
    await generateTorrent({
      ...baseOptions(),
      entry: directory,
      ignoreHiddenFile: true,
      writer: w,
    })
    const info = infoDictionary(w.bytes())
    const files = info.get("files")
    if (!Array.isArray(files)) throw new Error("expected multi-file metadata")
    assertEquals(files.length, 1)
  } finally {
    await Deno.remove(directory, { recursive: true })
  }
})

Deno.test("generateTorrent: invalid piece size rejects with RangeError", async () => {
  const w = new MemoryWriter()
  await assertRejects(
    () => generateTorrent({ ...baseOptions(), pieceSizeEnum: -1 as PieceSizeEnum, writer: w }),
    RangeError,
  )
})

Deno.test("generateTorrent: propagates writer errors", async () => {
  const writer = {
    write(): Promise<number> {
      return Promise.reject(new Error("writer failed"))
    },
  }
  await assertRejects(
    () => generateTorrent({ ...baseOptions(), writer }),
    Error,
    "writer failed",
  )
})

// ─── Golden-file test ─────────────────────────────────────────────────────────

Deno.test("generateTorrent: output matches golden fixture", async () => {
  const w = new MemoryWriter()
  await generateTorrent({ ...baseOptions(), writer: w })
  const actual = w.bytes()

  const expected = await Deno.readFile(GOLDEN)

  assertEquals(
    actual,
    expected,
    "Output differs from golden fixture. Delete test/torrent/expect.torrent to regenerate.",
  )
})

// ─── Type check ───────────────────────────────────────────────────────────────

Deno.test("MemoryWriter: write returns a Promise<number>", async () => {
  const w = new MemoryWriter()
  const result = w.write(new Uint8Array([1, 2, 3]))
  assertInstanceOf(result, Promise)
  assertEquals(await result, 3)
})
