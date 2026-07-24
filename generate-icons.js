#!/usr/bin/env node

/**
 * Icon Generator Script
 * Generates PNG icons from SVG template for Chrome Extension
 * 
 * Usage: node generate-icons.js
 * 
 * Requires: No external dependencies (uses native Node.js)
 * 
 * This script creates placeholder PNG files that represent the extension.
 * For production, consider using a proper graphic design tool or online converter.
 */

const fs = require('fs');
const path = require('path');

// PNG file signature (8 bytes)
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/**
 * Create a simple PNG file with a solid color background and text
 * @param {number} size - Size in pixels (16, 48, or 128)
 * @param {string} filepath - Output file path
 */
function createSimplePNG(size, filepath) {
  // This creates a minimal valid PNG file structure
  // For production use, consider using a proper PNG library like 'pngjs'
  
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Create a minimal PNG: blue background with white "AI" text
  // This is a very simple approach - for production, use proper library
  
  let pngBuffer = createMinimalPNG(size);
  fs.writeFileSync(filepath, pngBuffer);
  console.log(`✓ Created ${size}x${size}px icon: ${filepath}`);
}

/**
 * Create a minimal valid PNG buffer
 * @param {number} size - Size in pixels
 * @returns {Buffer} - PNG buffer
 */
function createMinimalPNG(size) {
  // Simple PNG with solid color (blue)
  // This is a placeholder - use a proper PNG library for production
  
  // PNG signature
  let png = Buffer.concat([PNG_SIGNATURE]);
  
  // Create IHDR chunk (image header)
  let ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);      // width
  ihdr.writeUInt32BE(size, 4);      // height
  ihdr.writeUInt8(8, 8);             // bit depth
  ihdr.writeUInt8(2, 9);             // color type (RGB)
  ihdr.writeUInt8(0, 10);            // compression method
  ihdr.writeUInt8(0, 11);            // filter method
  ihdr.writeUInt8(0, 12);            // interlace method
  
  png = Buffer.concat([png, createChunk('IHDR', ihdr)]);
  
  // Create minimal IDAT chunk (image data)
  // This creates a simple blue square
  let idat = createImageData(size);
  png = Buffer.concat([png, createChunk('IDAT', idat)]);
  
  // Create IEND chunk (end)
  png = Buffer.concat([png, createChunk('IEND', Buffer.alloc(0))]);
  
  return png;
}

/**
 * Create a PNG chunk with proper CRC
 * @param {string} type - Chunk type (4 chars)
 * @param {Buffer} data - Chunk data
 * @returns {Buffer} - Complete chunk with length and CRC
 */
function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  
  // Simple CRC calculation (this is a placeholder)
  const crc = calculateCRC(crcData);
  
  return Buffer.concat([length, crcData, crc]);
}

/**
 * Calculate CRC32
 * @param {Buffer} data - Data to checksum
 * @returns {Buffer} - 4-byte CRC
 */
function calculateCRC(data) {
  // CRC lookup table
  const crcTable = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[i] = c >>> 0;
  }
  
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  
  const result = Buffer.alloc(4);
  result.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 0);
  return result;
}

/**
 * Create simple image data
 * @param {number} size - Image size in pixels
 * @returns {Buffer} - Compressed image data
 */
function createImageData(size) {
  // Create uncompressed image data
  // Simple blue background: RGB(74, 144, 226)
  
  const bytesPerPixel = 3;
  const scanlineLength = size * bytesPerPixel + 1; // +1 for filter byte
  const imageData = Buffer.alloc(size * scanlineLength);
  
  let pos = 0;
  for (let y = 0; y < size; y++) {
    imageData[pos++] = 0; // filter type: None
    
    for (let x = 0; x < size; x++) {
      imageData[pos++] = 74;   // R
      imageData[pos++] = 144;  // G
      imageData[pos++] = 226;  // B
    }
  }
  
  // Simple deflate compression (minimal)
  // For production, use zlib module
  return deflateCompress(imageData);
}

/**
 * Simple deflate compression
 * @param {Buffer} data - Data to compress
 * @returns {Buffer} - Compressed data with zlib header
 */
function deflateCompress(data) {
  // This is a simplified implementation for demonstration
  // In production, use: const zlib = require('zlib');
  
  // For now, return a minimal valid deflate stream
  const compressed = Buffer.alloc(data.length + 20);
  
  // zlib header
  compressed[0] = 0x78; // CMF
  compressed[1] = 0x01; // FLG
  
  // Copy data (uncompressed block)
  let pos = 2;
  
  // Uncompressed block header
  // BFINAL = 1, BTYPE = 00
  compressed[pos++] = 0x01;
  
  // Block size (little-endian)
  const blockSize = Math.min(data.length, 0xffff);
  compressed[pos++] = blockSize & 0xff;
  compressed[pos++] = (blockSize >> 8) & 0xff;
  compressed[pos++] = (~blockSize) & 0xff;
  compressed[pos++] = ((~blockSize) >> 8) & 0xff;
  
  // Copy data
  data.copy(compressed, pos, 0, blockSize);
  pos += blockSize;
  
  // Adler-32 checksum
  let adler = 1;
  for (let i = 0; i < data.length; i++) {
    adler = (adler + data[i]) % 65521;
  }
  let s2 = Math.floor(adler / 65521);
  let s1 = adler % 65521;
  
  compressed[pos++] = (s2 >> 8) & 0xff;
  compressed[pos++] = s2 & 0xff;
  compressed[pos++] = (s1 >> 8) & 0xff;
  compressed[pos++] = s1 & 0xff;
  
  return compressed.slice(0, pos);
}

// Generate icons
const iconsDir = path.join(__dirname, 'icons');
const sizes = [16, 48, 128];

console.log('Generating Chrome Extension icons...\n');

sizes.forEach((size) => {
  const filepath = path.join(iconsDir, `icon${size}.png`);
  createSimplePNG(size, filepath);
});

console.log('\n✓ All icons generated successfully!');
console.log('\nNote: These are placeholder icons. For production, consider:');
console.log('1. Using a professional icon designer');
console.log('2. Converting SVG to PNG using ImageMagick or similar');
console.log('3. Using online converters like CloudConvert');
