import 'server-only'

import { deflateSync } from 'node:zlib'

const CRC_TABLE: number[] = []
for (let i = 0; i < 256; i++) {
  let c = i
  for (let j = 0; j < 8; j++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  CRC_TABLE[i] = c
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Uint8Array): Buffer {
  const typeBytes = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)

  const crcInput = Buffer.concat([typeBytes, Buffer.from(data)])
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(crcInput))

  return Buffer.concat([length, typeBytes, Buffer.from(data), crcBuf])
}

/**
 * Generates a solid-color PNG image (no external dependencies).
 * Used to visualize the daily lucky colour in Telegram.
 */
export function generateColorPng(hex: string, width = 400, height = 100): Buffer {
  const r = parseInt(hex.slice(1, 3), 16) || 0
  const g = parseInt(hex.slice(3, 5), 16) || 0
  const b = parseInt(hex.slice(5, 7), 16) || 0

  // IHDR: width(4) + height(4) + bitDepth(1) + colorType(1) + compression(1) + filter(1) + interlace(1)
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8  // 8-bit depth
  ihdr[9] = 2  // RGB color
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  // Raw pixel data: filter byte (0) + RGB per pixel, per row
  const rowBytes = 1 + width * 3
  const rawData = Buffer.alloc(rowBytes * height)
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes
    rawData[rowOffset] = 0
    for (let x = 0; x < width; x++) {
      const px = rowOffset + 1 + x * 3
      rawData[px] = r
      rawData[px + 1] = g
      rawData[px + 2] = b
    }
  }

  const compressed = deflateSync(rawData)

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}
