import { PieceSizeEnum } from '../mod.ts'
import { calcPieceSize, getDefaultCraetedBy, getLatestTag, isHiddenFile } from '../src/util.ts'
import { assertEquals } from './deps.ts'

// 测试获取最新的tag
Deno.test('test getLatestTag', async () => {
  const tag = await getLatestTag()
  // tag必须是0.0.0这种格式
  const reg = /^\d+\.\d+\.\d+$/
  assertEquals(reg.test(tag), true)

  // tag必须大于0.0.0
  const [major, minor, patch] = tag.split('.').map((v) => parseInt(v))
  assertEquals(major >= 0, true)
  assertEquals(minor >= 0, true)
  assertEquals(patch >= 0, true)
})

// 测试计算分块大小
Deno.test('test calcPieceSize', () => {
  assertEquals(calcPieceSize(15 * 1024 * 1024, PieceSizeEnum.SIZE_AUTO), PieceSizeEnum.SIZE_16KB.valueOf())
  assertEquals(calcPieceSize(31 * 1024 * 1024, PieceSizeEnum.SIZE_AUTO), PieceSizeEnum.SIZE_32KB.valueOf())
  assertEquals(calcPieceSize(63 * 1024 * 1024, PieceSizeEnum.SIZE_AUTO), PieceSizeEnum.SIZE_64KB.valueOf())
  assertEquals(calcPieceSize(127 * 1024 * 1024, PieceSizeEnum.SIZE_AUTO), PieceSizeEnum.SIZE_128KB.valueOf())
  assertEquals(calcPieceSize(255 * 1024 * 1024, PieceSizeEnum.SIZE_AUTO), PieceSizeEnum.SIZE_256KB.valueOf())
  assertEquals(calcPieceSize(511 * 1024 * 1024, PieceSizeEnum.SIZE_AUTO), PieceSizeEnum.SIZE_512KB.valueOf())
  assertEquals(calcPieceSize(1023 * 1024 * 1024, PieceSizeEnum.SIZE_AUTO), PieceSizeEnum.SIZE_512KB.valueOf())
  assertEquals(calcPieceSize(2047 * 1024 * 1024, PieceSizeEnum.SIZE_AUTO), PieceSizeEnum.SIZE_512KB.valueOf())
  assertEquals(calcPieceSize(4095 * 1024 * 1024, PieceSizeEnum.SIZE_AUTO), PieceSizeEnum.SIZE_512KB.valueOf())
  assertEquals(calcPieceSize(8191 * 1024 * 1024, PieceSizeEnum.SIZE_AUTO), PieceSizeEnum.SIZE_512KB.valueOf())
  assertEquals(calcPieceSize(16383 * 1024 * 1024, PieceSizeEnum.SIZE_AUTO), PieceSizeEnum.SIZE_512KB.valueOf())

  assertEquals(calcPieceSize(16 * 1024 * 1024, PieceSizeEnum.SIZE_16KB), PieceSizeEnum.SIZE_16KB.valueOf())
  assertEquals(calcPieceSize(32 * 1024 * 1024, PieceSizeEnum.SIZE_16KB), PieceSizeEnum.SIZE_16KB.valueOf())
  assertEquals(calcPieceSize(64 * 1024 * 1024, PieceSizeEnum.SIZE_16KB), PieceSizeEnum.SIZE_16KB.valueOf())
  assertEquals(calcPieceSize(128 * 1024 * 1024, PieceSizeEnum.SIZE_16KB), PieceSizeEnum.SIZE_16KB.valueOf())
  assertEquals(calcPieceSize(256 * 1024 * 1024, PieceSizeEnum.SIZE_16KB), PieceSizeEnum.SIZE_16KB.valueOf())
  assertEquals(calcPieceSize(512 * 1024 * 1024, PieceSizeEnum.SIZE_16KB), PieceSizeEnum.SIZE_16KB.valueOf())
  assertEquals(calcPieceSize(1024 * 1024 * 1024, PieceSizeEnum.SIZE_16KB), PieceSizeEnum.SIZE_16KB.valueOf())
  assertEquals(calcPieceSize(2048 * 1024 * 1024, PieceSizeEnum.SIZE_16KB), PieceSizeEnum.SIZE_16KB.valueOf())
  assertEquals(calcPieceSize(4096 * 1024 * 1024, PieceSizeEnum.SIZE_16KB), PieceSizeEnum.SIZE_16KB.valueOf())
  assertEquals(calcPieceSize(8192 * 1024 * 1024, PieceSizeEnum.SIZE_16KB), PieceSizeEnum.SIZE_16KB.valueOf())
  assertEquals(calcPieceSize(16384 * 1024 * 1024, PieceSizeEnum.SIZE_16KB), PieceSizeEnum.SIZE_16KB.valueOf())
})

// 测试获取默认created by
Deno.test('test getDefaultCraetedBy', async () => {
  const defaultCreatedBy = 'deno-torrent-generator@'
  assertEquals((await getDefaultCraetedBy()).includes(defaultCreatedBy), true)
})

// 测试隐藏文件判断
Deno.test('test isHiddenFile', () => {
  const hiddenFile = '.DS_Store'
  assertEquals(isHiddenFile(hiddenFile), true)
  assertEquals(isHiddenFile('test.txt'), false)
  assertEquals(isHiddenFile('test'), false)
  assertEquals(isHiddenFile(''), false)
})
