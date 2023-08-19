import { Writer } from 'std/types.d.ts'

/**
 * 分块大小枚举
 */
export enum PieceSizeEnum {
  'SIZE_AUTO' = 0,
  'SIZE_16KB' = 16 * 1024 * 1024,
  'SIZE_32KB' = 32 * 1024 * 1024,
  'SIZE_64KB' = 64 * 1024 * 1024,
  'SIZE_128KB' = 128 * 1024 * 1024,
  'SIZE_256KB' = 256 * 1024 * 1024,
  'SIZE_512KB' = 512 * 1024 * 1024,
  'SIZE_1MB' = 1024 * 1024 * 1024,
  'SIZE_2MB' = 2 * 1024 * 1024 * 1024,
  'SIZE_4MB' = 4 * 1024 * 1024 * 1024,
  'SIZE_8MB' = 8 * 1024 * 1024 * 1024,
  'SIZE_16MB' = 16 * 1024 * 1024 * 1024
}

/**
 * 生成器选项
 */
export type GeneratorOption = {
  writer: Writer
  entry: string // file or directory path, e.g. /root/file1 or /root/dir1
  // TODO
  // alignPiece: boolean // default false, if true, file will be aligned to piece boundary
  pieceSizeEnum?: PieceSizeEnum // in bytes, e.g. 1024 * 1024 * 4 = 4MB
  ignoreHiddenFile?: boolean // default false, if true, hidden file will be ignored
  isPrivate?: boolean // default false, if true, private flag will be set
  trackers: URL[] // e.g. udp://tracker1.com:80
  webSeeds?: URL[] // e.g. http://example.com
  source?: string // e.g. URL of the web page where the torrent was first mentioned
  comment?: string // e.g. comment of the torrent
  createdBy?: string // e.g. name of the program used to create the torrent
  createdAt?: number // e.g. time when the torrent was created
}

/**
 * Torrent 文件格式
 */
export type Torrent = {
  'created by': string // 创建者,例如: 'created by': 'torrent-generator'
  'creation date': number // 创建时间,例如: 'creation date': 1627777777
  announce?: string // tracker地址,例如: 'https://tracker1.com'
  'announce-list'?: string[][] // tracker地址列表,例如: 'announce-list': [['https://tracker1.com'],['https://tracker2.com']]
  'url-list'?: string | string[] // web种子地址,例如: 'url-list': 'http://example.com',或者'url-list': ['http://example.com','http://example2.com']
  info: {
    name: string // 文件名,例如: 'name': 'test.txt' 或者文件夹 'name': 'test'
    'piece length': number // 分块大小,例如: 'piece length': 262144
    pieces?: Uint8Array // 分块SHA1值,例如: 'pieces': Uint8Array(20) [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ... ]
    length?: number // 文件大小,例如: 'length': 1024
    // 多文件模式下存在files字段
    files?: {
      path: string[] // 文件路径,有层级结构,例如: 'path': ['test','test.txt']
      length: number // 文件大小,例如: 'length': 1024
    }[]
    private?: number // 私有种子,例如: 'private': 1
  }
  comment?: string // 评论,例如: 'comment': 'test'
  source?: string // 种子来源,例如: 'source': 'http://example.com'
}
