# [torrent-generator](https://deno.land/x/dt_torrent_generator) [![Custom badge](https://img.shields.io/endpoint?url=https%3A%2F%2Fdeno-visualizer.danopia.net%2Fshields%2Flatest-version%2Fx%2Fdt_torrent_generator%2Fmod.ts)](https://deno.land/x/dt_torrent_generator)

torrent-generator is a lightweight Deno library for generating torrent files

## Usage

### Encode

```typescript
  import { generateTorrent, PieceSizeEnum } from 'https://deno.land/x/dt_torrent_generator/mod.ts'

  // directory which you want to generate torrent file
  const entry = './your-directory'
  const fd = Deno.openSync('./sample.torrent', { create: true, write: true, truncate: true })

  await generateTorrent({
    entry: entry,
    writer: fd,
    pieceSizeEnum: PieceSizeEnum.SIZE_AUTO, // optional, default is auto
    ignoreHiddenFile: false, // optional, default is false
    isPrivate: false, // optional, default is false
    trackers: [new URL('http://example.com'), new URL('http://example2.com')], // must provide at least one tracker
    webSeeds: [new URL('http://example.com'), new URL('http://example2.com')], // optional, default is empty
    source: 'http://example.com', // optional, default is empty
    comment: 'comment', // optional, default is empty
    createdBy: 'createdBy', // optional, default is deno-torrent-generator@x.x.x
    createdAt: Math.floor(timestamp / 1000) // optional, default is current timestamp
  })

  // close file 
  fd.close()

```

## Test

```bash
deno task test

# Check file:///home/sloaix/work/deno-torrent/torrent-generator/test/generator.test.ts
# Check file:///home/sloaix/work/deno-torrent/torrent-generator/test/util.test.ts
# running 1 test from ./test/generator.test.ts
# test generate torrent file ... ok (23ms)
# running 4 tests from ./test/util.test.ts
# test getLatestTag ... ok (14ms)
# test calcPieceSize ... ok (4ms)
# test getDefaultCraetedBy ... ok (11ms)
# test isHiddenFile ... ok (5ms)
```
