// Build script for API TypeScript files (CommonJS version)
// Transpiles TypeScript API files to JavaScript for production use

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// Find all TypeScript files in the api directory recursively
function findTsFiles(dir, files = []) {
    if (!fs.existsSync(dir)) {
        console.log(`Directory ${dir} does not exist, skipping...`);
        return files;
    }

    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            findTsFiles(fullPath, files);
        } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
            files.push(fullPath);
        }
    }
    return files;
}

const apiDir = './api';
const outDir = './api-dist';

// Clean output directory
if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true });
}
fs.mkdirSync(outDir, { recursive: true });

const entryPoints = findTsFiles(apiDir);

if (entryPoints.length === 0) {
    console.log('No TypeScript files found in api/ directory');
    process.exit(0);
}

console.log(`🔨 Building ${entryPoints.length} API files...`);

esbuild.buildSync({
    entryPoints,
    outdir: outDir,
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    sourcemap: false,
    minify: false,
    outbase: apiDir,
    external: [
        '@supabase/supabase-js',
        'express',
        'cors',
        'dotenv'
    ],
});

console.log('✅ API build complete! Files written to:', outDir);

// List output files
function listFiles(dir, prefix = '') {
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
}
listFiles(outDir);
