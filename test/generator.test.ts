import { join } from 'std/path/join.ts'
import { generateTorrent, PieceSizeEnum } from '../mod.ts'
import { Buffer } from '../src/deps.ts'
import { assertEquals } from './deps.ts'

// 测试生成种子文件
Deno.test('test generate torrent file', async () => {
  const entry = join(Deno.cwd(), 'test', 'entry')
  const expectTorrent = join(Deno.cwd(), 'test', 'torrent', 'expect.torrent')
  const actualBytes = new Buffer()

  // 固定日期,避免每次生成的种子文件不一致
  const timestamp = new Date('2030-01-01T00:00:00.000Z').getUTCMilliseconds()

  await generateTorrent({
    entry: entry,
    writer: actualBytes,
    pieceSizeEnum: PieceSizeEnum.SIZE_AUTO,
    ignoreHiddenFile: false,
    isPrivate: false,
    trackers: [new URL('http://example.com'), new URL('http://example2.com')],
    webSeeds: [new URL('http://example.com'), new URL('http://example2.com')],
    source: 'http://example.com',
    comment: 'comment',
    createdBy: 'createdBy',
    createdAt: Math.floor(timestamp / 1000)
  })

  // 读取Unit8Array
  const expectBytes = await Deno.readFile(expectTorrent)

  // 对比二进制数据
  assertEquals(actualBytes.bytes(), expectBytes)
})
