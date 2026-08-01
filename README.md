# torrent-generator

Current release: `2.0.0`.

[![JSR](https://jsr.io/badges/@deno-torrent/torrent-generator)](https://jsr.io/@deno-torrent/torrent-generator)
[![JSR Score](https://jsr.io/badges/@deno-torrent/torrent-generator/score)](https://jsr.io/@deno-torrent/torrent-generator)

Generate standard BitTorrent `.torrent` files from a file or directory with Deno and TypeScript. The library supports
single-file and multi-file torrents, multiple trackers (BEP-12), web seeds (BEP-19), private torrents, deterministic
file ordering, and automatic piece-size selection.

本库用于在 Deno 和 TypeScript 中从文件或目录生成标准 BitTorrent `.torrent` 文件，支持单文件种子、多文件种子、多
Tracker（BEP-12）、Web Seed（BEP-19）、私有种子、稳定文件排序和自动分块大小选择。

## Requirements

- Deno 2.x
- A filesystem entry readable by the current process

## Install

```ts
import { generateTorrent, PieceSizeEnum } from "jsr:@deno-torrent/torrent-generator@2"
```

## Quick start

```ts
import { generateTorrent } from "jsr:@deno-torrent/torrent-generator@2"

const output = await Deno.open("output.torrent", {
  create: true,
  truncate: true,
  write: true,
})

try {
  await generateTorrent({
    entry: "./my-content",
    writer: output,
    trackers: [new URL("udp://tracker.example.com:6969/announce")],
  })
} finally {
  output.close()
}
```

`entry` may be a regular file or a directory. A regular file produces a single-file torrent. A directory always produces
a multi-file torrent, including a directory containing only one file.

## API

### `generateTorrent(options: GeneratorOption): Promise<void>`

| Option             | Type             | Required | Default                            | Description                                           |
| ------------------ | ---------------- | -------- | ---------------------------------- | ----------------------------------------------------- |
| `entry`            | `string`         | Yes      | —                                  | File or directory path to include.                    |
| `writer`           | `Writer`         | Yes      | —                                  | Async destination for the encoded torrent bytes.      |
| `trackers`         | `readonly URL[]` | Yes      | —                                  | Tracker announce URLs.                                |
| `pieceSizeEnum`    | `PieceSizeEnum`  | No       | `SIZE_AUTO`                        | Piece length preset.                                  |
| `ignoreHiddenFile` | `boolean`        | No       | `false`                            | Excludes files whose base name starts with `.`.       |
| `isPrivate`        | `boolean`        | No       | `false`                            | Adds the private torrent flag to the info dictionary. |
| `webSeeds`         | `readonly URL[]` | No       | `[]`                               | HTTP/FTP web-seed URLs.                               |
| `source`           | `string`         | No       | —                                  | Optional source identifier.                           |
| `comment`          | `string`         | No       | —                                  | Optional human-readable comment.                      |
| `createdBy`        | `string`         | No       | `deno-torrent-generator@<version>` | Creator identifier.                                   |
| `createdAt`        | `number`         | No       | Current Unix time                  | Creation timestamp in seconds.                        |

Tracker and web-seed URLs are sorted by their serialized URL before encoding so equivalent inputs produce stable
metadata. Multi-file entries are ordered by path depth and then lexicographically.

### `PieceSizeEnum`

Available presets are `SIZE_AUTO`, `SIZE_16MB`, `SIZE_32MB`, `SIZE_64MB`, `SIZE_128MB`, `SIZE_256MB`, `SIZE_512MB`,
`SIZE_1GB`, `SIZE_2GB`, `SIZE_4GB`, `SIZE_8GB`, and `SIZE_16GB`.

`SIZE_AUTO` selects the smallest preset larger than the total content size and caps the result at `SIZE_512MB`.

### `Writer`

Any object implementing `write(p: Uint8Array): Promise<number>` can be used. `Deno.FsFile` satisfies this interface, as
does an in-memory writer for tests.

## Errors and limitations

- A missing `entry` propagates the filesystem `Deno.errors.NotFound` error.
- An empty directory, or a directory where all files are excluded, throws an error because no files remain to encode.
- The generator reads the input files sequentially and computes SHA-1 piece hashes; it does not keep the complete input
  content in memory.
- The output is written as standard bencode using `@deno-torrent/bencode` 2.x. Consumers normally only need the
  generated `.torrent` bytes and do not need to import the bencode dependency directly.

Intentional non-goals / 明确非目标：

- The library does not download content or contact trackers.
- The library does not validate that a tracker or web-seed URL is reachable.
- The library does not publish torrents or manage magnet links.

## Debug logging

```ts
import { disableDebug, enableDebug } from "jsr:@deno-torrent/torrent-generator@2"

enableDebug()
// ... generateTorrent(...)
disableDebug()
```

Debug logging is disabled by default.

## Development and tests

```bash
deno task fmt
deno task lint
deno task check
deno task test
```

The test suite covers Torrent generation, single-file and multi-file metadata, bencode output structure, deterministic
output, optional fields, piece-size boundaries, filesystem errors, and `MultiFileReader` boundaries.

## JSR publishing

The package version is maintained only in `deno.json`. Push a matching tag such as `v2.0.0` to start the GitHub Actions
publishing workflow. The workflow verifies the tag, runs all quality checks, performs `deno publish --dry-run`, and
publishes through GitHub OIDC. No long-lived JSR token is required.

Before publishing, link the package to this GitHub repository in the JSR package settings.

## Breaking changes in 2.0.0

- The package version is now `2.0.0`.
- The bencode dependency was upgraded from 1.x to 2.x. The public `generateTorrent` API remains unchanged.
- A directory containing exactly one file is now correctly encoded as a multi-file torrent. Re-generate torrents created
  from such directories by earlier versions.

Migration:

```ts
import { generateTorrent } from "jsr:@deno-torrent/torrent-generator@2"
```

No source-level migration is required for normal `generateTorrent` usage.

## License

[MIT](./LICENSE) © 2024 deno-torrent

---

## 中文说明

### 安装

```ts
import { generateTorrent, PieceSizeEnum } from "jsr:@deno-torrent/torrent-generator@2"
```

### 快速开始

```ts
import { generateTorrent } from "jsr:@deno-torrent/torrent-generator@2"

const output = await Deno.open("output.torrent", { create: true, truncate: true, write: true })
try {
  await generateTorrent({
    entry: "./my-content",
    writer: output,
    trackers: [new URL("udp://tracker.example.com:6969/announce")],
  })
} finally {
  output.close()
}
```

`entry` 可以是文件或目录。普通文件生成单文件种子；目录始终生成多文件种子，即使目录中只有一个文件。

### 运行测试

```bash
deno task fmt
deno task lint
deno task check
deno task test
```

### 错误处理与限制

不存在的路径会传播 `Deno.errors.NotFound`。空目录或过滤后没有剩余文件的目录会抛出错误。库只负责读取文件、计算 Piece Hash
和生成 Torrent，不下载内容、不连接 Tracker，也不发布种子。

### JSR 发布

唯一版本号位于 `deno.json`。推送与版本一致的 Tag（例如 `v2.0.0`）后，GitHub Actions
会执行检查、`deno publish --dry-run`，并通过 GitHub OIDC 发布，无需长期 Token。

### 2.0.0 破坏性变更

bencode 依赖升级到 2.x，公共 `generateTorrent` API
保持不变。目录仅包含一个文件时现在会正确生成多文件种子；旧版本生成的此类种子建议重新生成。

## 许可证

[MIT](./LICENSE) © 2024 deno-torrent
