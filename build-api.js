// Build script for API TypeScript files
// This transpiles all TypeScript files in the api/ folder to JavaScript
// for use in production with the Express server

import { build } from 'esbuild';
import { readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

// Find all TypeScript files in the api directory recursively
function findTsFiles(dir, files = []) {
    const items = readdirSync(dir);
    for (const item of items) {
        const fullPath = join(dir, item);
        if (statSync(fullPath).isDirectory()) {
            findTsFiles(fullPath, files);
        } else if (item.endsWith('.ts')) {
            files.push(fullPath);
        }
    }
    return files;
}

const apiDir = './api';
const outDir = './dist-api';
const entryPoints = findTsFiles(apiDir);

console.log(`🔨 Building ${entryPoints.length} API files...`);

build({
    entryPoints,
    outdir: outDir,
    bundle: false,          // Don't bundle - keep individual files
    platform: 'node',       // Node.js target
    target: 'node20',       // Node 20
    format: 'cjs',          // CommonJS for require()
    sourcemap: false,
    minify: false,          // Keep readable for debugging
    logLevel: 'info',
    outbase: apiDir,        // Preserve directory structure
}).then(() => {
    console.log('✅ API build complete! Files written to:', outDir);
}).catch((err) => {
    console.error('❌ Build failed:', err);
    process.exit(1);
});
