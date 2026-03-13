# torrent-generator

[![JSR](https://jsr.io/badges/@deno-torrent/torrent-generator)](https://jsr.io/@deno-torrent/torrent-generator)
[![JSR Score](https://jsr.io/badges/@deno-torrent/torrent-generator/score)](https://jsr.io/@deno-torrent/torrent-generator)

Deno library for generating BitTorrent `.torrent` files. Supports single/multi-file torrents, multiple trackers (BEP-12), web seeds (BEP-19), private torrents, and automatic piece size selection. Requires Deno ≥ 1.38.

---

原生 Deno 库，用于生成 BitTorrent `.torrent` 文件。支持单/多文件种子、多 Tracker（BEP-12）、Web 种子（BEP-19）、私有种子与自动分块。需要 Deno ≥ 1.38。

---

## English

### Install

```ts
import { generateTorrent, PieceSizeEnum } from "jsr:@deno-torrent/torrent-generator"
```

### Usage

```ts
import { generateTorrent, PieceSizeEnum } from "jsr:@deno-torrent/torrent-generator"

const out = await Deno.open("output.torrent", { write: true, create: true, truncate: true })
await generateTorrent({
  entry: "./my-content",       // file or directory
  writer: out,
  trackers: [
    new URL("udp://tracker1.example.com:6969/announce"),
    new URL("udp://tracker2.example.com:6969/announce"),
  ],
  pieceSizeEnum: PieceSizeEnum.SIZE_AUTO, // optional, default: auto
  ignoreHiddenFile: true,                 // optional, default: false
  isPrivate: true,                        // optional, default: false
  webSeeds: [new URL("https://mirror.example.com/my-content/")],
  source: "https://example.com/my-content",
  comment: "Release v1.0",
  createdBy: "my-tool@1.0.0",
  createdAt: Math.floor(Date.now() / 1000), // optional, default: now
})
out.close()
```

### API

#### `generateTorrent(options: GeneratorOption): Promise<void>`

| Option | Type | Required | Default | Description |
|---|---|---|---|---|
| `entry` | `string` | ✅ | — | File or directory path |
| `writer` | `Writer` | ✅ | — | Output destination |
| `trackers` | `URL[]` | ✅ | — | Tracker announce URLs |
| `pieceSizeEnum` | `PieceSizeEnum` | — | `SIZE_AUTO` | Piece size |
| `ignoreHiddenFile` | `boolean` | — | `false` | Skip dot-files |
| `isPrivate` | `boolean` | — | `false` | Private torrent flag |
| `webSeeds` | `URL[]` | — | `[]` | Web-seed URLs (BEP-19) |
| `source` | `string` | — | — | Source identifier |
| `comment` | `string` | — | — | Comment |
| `createdBy` | `string` | — | `deno-torrent-generator@x.y.z` | Creator string |
| `createdAt` | `number` | — | current time | Unix timestamp (seconds) |

#### `PieceSizeEnum`

`SIZE_AUTO` `SIZE_16MB` `SIZE_32MB` `SIZE_64MB` `SIZE_128MB` `SIZE_256MB` `SIZE_512MB` `SIZE_1GB` `SIZE_2GB` `SIZE_4GB` `SIZE_8GB` `SIZE_16GB`

`SIZE_AUTO` selects the smallest preset larger than the total content size, capped at `SIZE_512MB`.

#### `Writer`

Any object with `write(p: Uint8Array): Promise<number>`. `Deno.FsFile` satisfies this interface.

#### Debug logging

```ts
import { enableDebug, disableDebug } from "jsr:@deno-torrent/torrent-generator"
enableDebug()
// ... generateTorrent(...)
disableDebug()
```

### Test

```bash
deno task test
```

### License

[MIT](./LICENSE) © 2024 deno-torrent

---

## 中文

### 安装

```ts
import { generateTorrent, PieceSizeEnum } from "jsr:@deno-torrent/torrent-generator"
```

### 使用

```ts
import { generateTorrent, PieceSizeEnum } from "jsr:@deno-torrent/torrent-generator"

const out = await Deno.open("output.torrent", { write: true, create: true, truncate: true })
await generateTorrent({
  entry: "./my-content",       // 文件或目录路径
  writer: out,
  trackers: [
    new URL("udp://tracker1.example.com:6969/announce"),
    new URL("udp://tracker2.example.com:6969/announce"),
  ],
  pieceSizeEnum: PieceSizeEnum.SIZE_AUTO, // 可选，默认自动
  ignoreHiddenFile: true,                 // 可选，默认 false
  isPrivate: true,                        // 可选，默认 false
  webSeeds: [new URL("https://mirror.example.com/my-content/")],
  source: "https://example.com/my-content",
  comment: "发布 v1.0",
  createdBy: "my-tool@1.0.0",
  createdAt: Math.floor(Date.now() / 1000), // 可选，默认当前时间
})
out.close()
```

### API

#### `generateTorrent(options: GeneratorOption): Promise<void>`

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `entry` | `string` | ✅ | — | 文件或目录路径 |
| `writer` | `Writer` | ✅ | — | 输出写入目标 |
| `trackers` | `URL[]` | ✅ | — | Tracker 地址列表 |
| `pieceSizeEnum` | `PieceSizeEnum` | — | `SIZE_AUTO` | 分块大小 |
| `ignoreHiddenFile` | `boolean` | — | `false` | 忽略点文件 |
| `isPrivate` | `boolean` | — | `false` | 私有种子标志 |
| `webSeeds` | `URL[]` | — | `[]` | Web 种子（BEP-19） |
| `source` | `string` | — | — | 来源标识 |
| `comment` | `string` | — | — | 备注 |
| `createdBy` | `string` | — | `deno-torrent-generator@x.y.z` | 创建者 |
| `createdAt` | `number` | — | 当前时间 | 创建时间戳（秒） |

#### 分块大小枚举 `PieceSizeEnum`

`SIZE_AUTO` `SIZE_16MB` `SIZE_32MB` `SIZE_64MB` `SIZE_128MB` `SIZE_256MB` `SIZE_512MB` `SIZE_1GB` `SIZE_2GB` `SIZE_4GB` `SIZE_8GB` `SIZE_16GB`

`SIZE_AUTO` 自动选择首个大于内容总大小的预设值，上限为 `SIZE_512MB`。

#### 写入接口 `Writer`

任意实现 `write(p: Uint8Array): Promise<number>` 的对象均可。`Deno.FsFile` 直接满足此接口。

#### 调试日志

```ts
import { enableDebug, disableDebug } from "jsr:@deno-torrent/torrent-generator"
enableDebug()
// ... generateTorrent(...)
disableDebug()
```

### 运行测试

```bash
deno task test
```

### 许可证

[MIT](./LICENSE) © 2024 deno-torrent
