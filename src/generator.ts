import { Bencoder, SEP, basename, relative, walk } from './deps.ts'
import { GeneratorOption, PieceSizeEnum, Torrent } from './types.ts'
import { calcPieceSize, fileSizeSum, getDefaultCraetedBy, isHiddenFile, sha1sum } from './util.ts'

/**
 * 递归遍历目录,获取所有文件
 * @param entry 目录或者文件路径
 * @param ignoreHiddenFile 是否忽略隐藏文件
 * @returns 文件路径数组
 */
async function obtainFiles(entry: string, ignoreHiddenFile: boolean) {
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

export async function generateTorrent({
  writer,
  entry,
  // TODO
  // alignPiece = false,
  pieceSizeEnum = PieceSizeEnum.SIZE_AUTO,
  ignoreHiddenFile = false,
  isPrivate = false,
  trackers = [],
  webSeeds = [],
  source,
  comment,
  createdBy,
  createdAt = Math.floor(Date.now() / 1000)
}: GeneratorOption) {
  // 获取所有文件,包含隐藏文件
  let files = await obtainFiles(entry, ignoreHiddenFile)

  // 按照路径深度升序排序,['/root/file1','/root/dir1/file2','/root/dir1/dir2/file3']
  files = files.sort((a, b) => a.split(SEP).length - b.split(SEP).length)

  const singleFileMode = files.length === 1 // 是否为单文件模式
  const sizeOfFiles = await fileSizeSum(files) // 所有文件的总大小
  const pieceSize = calcPieceSize(sizeOfFiles, pieceSizeEnum) // 计算分块大小

  const torrent = {
    'created by': createdBy ?? (await getDefaultCraetedBy()),
    'creation date': createdAt,
    info: {
      name: basename(entry),
      'piece length': pieceSize
    }
  } as Torrent

  if (trackers && trackers.length > 0) {
    // 按照url字符串升序排序
    trackers = trackers.sort((a, b) => a.toString().localeCompare(b.toString()))
    // 在单个tracker的情况下,使用announce字段
    // 例如: 'announce': 'tracker1'
    torrent['announce'] = trackers[0].toString()

    // 多个tracker,使用announce-list字段,注意每个tracker都是一个数组包裹一个字符串
    // 例如: 'announce-list': [['tracker1'],['tracker2']]
    if (trackers.length > 1) {
      torrent['announce-list'] = trackers.map((tracker) => [tracker.toString()])
    }
  }

  if (webSeeds) {
    webSeeds = webSeeds.sort((a, b) => a.toString().localeCompare(b.toString()))
    if (webSeeds.length === 1) {
      // 在单个url的情况下,值为string
      // 例如: 'url-list': 'http://example.com'
      torrent['url-list'] = webSeeds[0].toString()
    }
    // 多个url,值为string的数组
    // 例如: 'url-list': ['http://example.com','http://example2.com']
    else if (webSeeds.length > 1) {
      torrent['url-list'] = webSeeds.map((webSeed) => webSeed.toString())
    }
  }

  if (isPrivate) {
    torrent['info']['private'] = 1
  }

  if (comment) {
    torrent['comment'] = comment
  }

  if (source) {
    torrent['source'] = source
  }

  // 单文件模式
  if (singleFileMode) {
    // 文件的长度,单位为字节
    torrent['info']['length'] = await Deno.stat(files[0]).then((stat) => stat.size)
    const pieces = await sha1sum(files, pieceSize)
    // 文件的分块hash
    torrent['info']['pieces'] = pieces
  }
  // 多文件模式
  else {
    torrent['info']['files'] = []

    for (const f of files) {
      torrent['info']['files'].push({
        length: await Deno.stat(f).then((stat) => stat.size),
        // dir1/dir2/file.ext => [dir1,dir2,file.ext]
        path: relative(entry, f).split(SEP)
      })
    }

    // TODO
    const alignPiece = false
    torrent['info']['pieces'] = await sha1sum(files, pieceSize, alignPiece)
  }

  // 写入到stream
  await writer.write(await new Bencoder().e(torrent))
}
