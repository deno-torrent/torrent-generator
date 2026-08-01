import { assertEquals, assertRejects } from "@std/assert"
import { join } from "@std/path"
import { MultiFileReader } from "../src/reader.ts"

const ENTRY = join(Deno.cwd(), "test", "entry")

async function readAll(reader: MultiFileReader, chunkSize: number): Promise<Uint8Array> {
  const parts: Uint8Array[] = []
  let chunk: Uint8Array | null
  while ((chunk = await reader.readChunk(chunkSize)) !== null) parts.push(chunk)

  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

Deno.test("MultiFileReader: reads files as one continuous stream", async () => {
  const reader = new MultiFileReader([
    join(ENTRY, "dir1", "1.txt"),
    join(ENTRY, "dir2", "2.txt"),
  ])

  try {
    assertEquals(await readAll(reader, 1), new TextEncoder().encode("12"))
    assertEquals(await reader.readChunk(1), null)
  } finally {
    reader.close()
  }
})

Deno.test("MultiFileReader: crosses file boundaries within one chunk", async () => {
  const reader = new MultiFileReader([
    join(ENTRY, "dir1", "1.txt"),
    join(ENTRY, "dir2", "2.txt"),
  ])

  try {
    assertEquals(await reader.readChunk(2), new TextEncoder().encode("12"))
  } finally {
    reader.close()
  }
})

Deno.test("MultiFileReader: rejects non-positive or fractional chunk sizes", async () => {
  const reader = new MultiFileReader([])
  await assertRejects(() => reader.readChunk(0), RangeError)
  await assertRejects(() => reader.readChunk(-1), RangeError)
  await assertRejects(() => reader.readChunk(1.5), RangeError)
})

Deno.test("MultiFileReader: returns null for an empty file list", async () => {
  const reader = new MultiFileReader([])
  assertEquals(await reader.readChunk(1), null)
})
