// Build script for API TypeScript files (ES Module version)
// This transpiles all TypeScript files in the api/ folder to JavaScript
// for use in production with the Express server

import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find all TypeScript files in the api directory recursively
function findTsFiles(dir, files = []) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
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
console.log('   Entry points:', entryPoints.map(f => f.replace('./api/', '')).join(', '));

esbuild.build({
    entryPoints,
    outdir: outDir,
    bundle: true,           // Bundle to resolve imports
    platform: 'node',       // Node.js target
    target: 'node20',       // Node 20
    format: 'cjs',          // CommonJS for require()
    sourcemap: false,
    minify: false,          // Keep readable for debugging
    logLevel: 'info',
    outbase: apiDir,        // Preserve directory structure
    external: [             // Don't bundle these - they'll be installed in production
        '@supabase/supabase-js',
        'express',
        'cors',
        'dotenv'
    ],
    banner: {
        js: '// Transpiled from TypeScript by esbuild'
    }
}).then(() => {
    console.log('✅ API build complete! Files written to:', outDir);

    // List output files
    const listFiles = (dir, prefix = '') => {
        if (!fs.existsSync(dir)) return;
        const items = fs.readdirSync(dir);
        for (const item of items) {
            const fullPath = path.join(dir, item);
            if (fs.statSync(fullPath).isDirectory()) {
                listFiles(fullPath, prefix + item + '/');
            } else {
                const stats = fs.statSync(fullPath);
                console.log(`   📄 ${prefix}${item} (${(stats.size / 1024).toFixed(1)}KB)`);
            }
        }
    };
    listFiles(outDir);
}).catch((err) => {
    console.error('❌ Build failed:', err);
    process.exit(1);
});
