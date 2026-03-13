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

import { assertEquals, assertGreater, assertInstanceOf } from "@std/assert"
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

Deno.test("generateTorrent: output contains tracker URL", async () => {
  const w = new MemoryWriter()
  await generateTorrent({ ...baseOptions(), writer: w })
  assertEquals(containsString(w.bytes(), "http://example.com"), true)
})

Deno.test("generateTorrent: output contains creation comment", async () => {
  const w = new MemoryWriter()
  await generateTorrent({ ...baseOptions(), writer: w })
  assertEquals(containsString(w.bytes(), "comment"), true)
})

Deno.test("generateTorrent: output contains created-by string", async () => {
  const w = new MemoryWriter()
  await generateTorrent({ ...baseOptions(), writer: w })
  assertEquals(containsString(w.bytes(), "createdBy"), true)
})

Deno.test("generateTorrent: output contains source URL", async () => {
  const w = new MemoryWriter()
  await generateTorrent({ ...baseOptions(), writer: w })
  assertEquals(containsString(w.bytes(), "http://example.com"), true)
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
  assertEquals(containsString(w.bytes(), "private"), true)
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
})

// ─── Golden-file test ─────────────────────────────────────────────────────────

Deno.test("generateTorrent: output matches golden fixture", async () => {
  const w = new MemoryWriter()
  await generateTorrent({ ...baseOptions(), writer: w })
  const actual = w.bytes()

  let expected: Uint8Array
  try {
    expected = await Deno.readFile(GOLDEN)
  } catch {
    // First run: write the golden file
    await Deno.mkdir(join(Deno.cwd(), "test", "torrent"), { recursive: true })
    await Deno.writeFile(GOLDEN, actual)
    return // Pass on first run
  }

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
