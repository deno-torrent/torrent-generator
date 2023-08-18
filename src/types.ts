import { Writer } from 'std/types.d.ts'

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

export type Torrent = {
  'created by': string
  'creation date': number
  announce?: string
  'announce-list'?: string[][]
  'url-list'?: string | string[]
  info: {
    name: string
    'piece length': number
    pieces?: Uint8Array
    length?: number
    files?: {
      path: string[]
      length: number
    }[]
    private?: number
  }
  comment?: string
  source?: string
}
