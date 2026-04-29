/**
 * Simple production server with compression for Maya
 * 
 * Usage: node server.js
 * 
 * Features:
 * - Brotli compression (best ratio) with gzip fallback
 * - Long-term caching for hashed assets
 * - Security headers
 * - SPA fallback for client-side routing
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { createBrotliCompress, createGzip } from 'node:zlib';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, 'dist');
const PORT = process.env.PORT || 3000;

// MIME types for common files
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

// Files that should be compressed
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg']);

// Check if client accepts compression
function getCompressionMethod(req) {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  if (acceptEncoding.includes('br')) return 'br';
  if (acceptEncoding.includes('gzip')) return 'gzip';
  return null;
}

// Get cache control header based on file path
function getCacheControl(filePath) {
  // Hashed assets can be cached forever
  if (filePath.includes('-') && /\.[a-f0-9]{8}\./.test(filePath)) {
    return 'public, max-age=31536000, immutable';
  }
  // Service worker should not be cached
  if (filePath.endsWith('sw.js')) {
    return 'no-cache';
  }
  // HTML should be revalidated
  if (filePath.endsWith('.html')) {
    return 'no-cache';
  }
  // Other static assets
  return 'public, max-age=86400';
}

// Security headers
function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

async function handleRequest(req, res) {
  // Only handle GET requests
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method not allowed');
    return;
  }

  let filePath = join(DIST_DIR, req.url === '/' ? 'index.html' : req.url);
  
  try {
    const stats = await stat(filePath);
    if (stats.isDirectory()) {
      filePath = join(filePath, 'index.html');
    }
  } catch {
    // File not found - serve index.html for SPA routing
    filePath = join(DIST_DIR, 'index.html');
  }

  const ext = extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const shouldCompress = COMPRESSIBLE.has(ext);
  const compression = shouldCompress ? getCompressionMethod(req) : null;

  setSecurityHeaders(res);
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', getCacheControl(filePath));
  
  if (compression) {
    res.setHeader('Content-Encoding', compression);
    res.setHeader('Vary', 'Accept-Encoding');
  }

  try {
    if (compression) {
      const compressor = compression === 'br' 
        ? createBrotliCompress() 
        : createGzip();
      res.writeHead(200);
      await pipeline(createReadStream(filePath), compressor, res);
    } else {
      const content = await readFile(filePath);
      res.setHeader('Content-Length', content.length);
      res.writeHead(200);
      res.end(content);
    }
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal server error');
    console.error('Error serving file:', error);
  }
}

const server = createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`🚀 Maya production server running at http://localhost:${PORT}`);
  console.log('   Features: Brotli/Gzip compression, caching, security headers');
});

