import { Buffer, MultiFileReader, basename, crypto, walk } from './deps.ts'
import { logd } from './log.ts'
import { PieceSizeEnum } from './types.ts'
/**
 * 递归遍历目录,获取目录下的所有文件,如果entry是文件,则返回[entry]
 * @param entry 目录或者文件路径
 * @param ignoreHiddenFile 是否忽略隐藏文件
 * @returns 文件路径数组
 */
export async function obtainFiles(entry: string, ignoreHiddenFile: boolean) {
  if (Deno.statSync(entry).isFile) return [entry]

  const files: string[] = []
  const iterator = walk(entry, {
    includeFiles: true,
    includeDirs: false
  })

  for await (const item of iterator) {
    if (ignoreHiddenFile && isHiddenFile(item.path)) continue
    files.push(item.path)
  }

  return files
}

/**
 * 按照指定的块大小分割文件,计算每块的SHA1值(20字节),将所有块的SHA1值拼接成一个字符串
 * Divide the file according to the specified block size, calculate the SHA1 value (20 bytes) for each block, and concatenate the SHA1 values of all blocks into a string
 */
export async function sha1sum(files: string[], pieceSize: number, alignPiece = false): Promise<Uint8Array> {
  if (pieceSize === 0) {
    throw new Error('pieceSize must be greater than 0')
  }

  const sha1Buffer = new Buffer()
  const pieceCount = Math.ceil((await fileSizeSum(files)) / pieceSize)

  logd(`分块大小: ${pieceSize},分块数量: ${pieceCount},文件总数: ${files.length},文件是否对齐: ${alignPiece}`)

  const multiFilReader = new MultiFileReader(files)

  while (true) {
    const chunk = await multiFilReader.readChunk(pieceSize)

    if (chunk === null) {
      break
    }

    // 使用crypto计算chunk的SHA1值
    const sha1 = await crypto.subtle.digest('SHA-1', chunk)
    // 将SHA1值写入sha1Buffer
    await sha1Buffer.write(new Uint8Array(sha1))
  }

  return sha1Buffer.bytes()
}

/**
 * 计算所有文件的大小
 * @param files
 * @returns
 */
export async function fileSizeSum(files: string[]): Promise<number> {
  let size = 0
  for (const file of files) {
    size += await Deno.stat(file).then((stat) => stat.size)
  }
  return size
}

/**
 * 根据文件的大小选择合适的分块大小
 * Choose the appropriate piece size according to the total size of the file
 *
 * @param fileSize 文件的大小
 * @return 分块大小
 */
export function calcPieceSize(fileSize: number, pieceSizeEnum: PieceSizeEnum): number {
  if (pieceSizeEnum == PieceSizeEnum.SIZE_AUTO) {
    const PIECE_SIZES = Object.values(PieceSizeEnum)
      .filter((item) => item !== PieceSizeEnum.SIZE_AUTO.valueOf())
      .map((item) => item.valueOf() as number)
      .sort((a, b) => a - b)
    // 初始化为最大的分块大小
    let pieceSize = PIECE_SIZES[PIECE_SIZES.length - 1]

    // 根据文件的大小选择合适的分块大小,使用Bittorrent分块大小规则
    for (const item of PIECE_SIZES) {
      if (fileSize < item) {
        pieceSize = item
        break
      }
    }

    return Math.min(pieceSize, PieceSizeEnum.SIZE_512KB.valueOf())
  }

  return pieceSizeEnum.valueOf()
}

/**
 * 获取最新的tag
 */
export async function getLatestTag() {
  const DEFAULT_TAG = '0.0.0'

  const command = new Deno.Command(Deno.execPath(), {
    args: ['git', 'describe', '--tags', '--abbrev=0']
  })
  const { code, stdout } = await command.output()

  if (code !== 0) return DEFAULT_TAG

  return new TextDecoder().decode(stdout).trim()
}

/**
 * 获取默认的created by
 * @returns 默认的created by,格式为 deno-torrent-generator@{latest tag}
 */
export async function getDefaultCraetedBy() {
  return `deno-torrent-generator@${await getLatestTag()}`
}

/**
 * 检测文件是否是隐藏文件
 * @param file 文件路径
 * @returns 是否是隐藏文件
 */
export function isHiddenFile(file: string) {
  return basename(file).startsWith('.')
}
