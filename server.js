// Express Server for Coolify Deployment (ES Module version)
// This replaces Vercel's serverless functions with a unified Express server

import express from 'express';
import path from 'path';
import cors from 'cors';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create require function for loading CJS modules
const require = createRequire(import.meta.url);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint - MUST respond for Coolify healthcheck
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// API Routes (dynamically imported)
// ============================================

// Startup validation - just log, don't prevent startup
const requiredEnvVars = ['VITE_SUPABASE_URL'];
const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingEnvVars.length > 0) {
    console.warn('⚠️ Missing environment variables:', missingEnvVars.join(', '));
}

// Check for service role key (needed for webhooks)
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not set - webhook verification may fail');
}

// Debug endpoint to check configuration
app.get('/api/debug', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: {
            VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ? 'SET' : 'MISSING',
            SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
            VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
            NODE_ENV: process.env.NODE_ENV || 'not set',
            PORT: process.env.PORT || '3000'
        }
    });
});

// Helper to safely register a route with error handling
function safeRegisterRoute(routePath, handlerPath) {
    const fullPath = path.join(__dirname, handlerPath);

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
        console.warn(`⚠️ Handler file not found: ${handlerPath} - skipping route ${routePath}`);
        return;
    }

    app.all(routePath, async (req, res) => {
        try {
            const handler = require(fullPath);
            const handlerFn = handler.default || handler;

            if (typeof handlerFn !== 'function') {
                console.error(`Handler at ${handlerPath} is not a function:`, typeof handlerFn);
                return res.status(500).json({ error: 'Handler not found', path: handlerPath });
            }

            await handlerFn(req, res);
        } catch (error) {
            console.error(`Error in ${handlerPath}:`, error);
            res.status(500).json({
                error: 'Internal server error',
                message: error.message,
                path: handlerPath
            });
        }
    });

    console.log(`✓ Registered route: ${routePath}`);
}

// Register all API routes with safe error handling
console.log('📦 Registering API routes...');

// Admin API
safeRegisterRoute('/api/admin', './api/admin.js');

// Webhooks
safeRegisterRoute('/api/webhooks/meta', './api/webhooks/meta.js');

// Forms
safeRegisterRoute('/api/forms/handler', './api/forms/handler.js');
safeRegisterRoute('/api/forms/continue-flow', './api/forms/continue-flow.js');

// Webview
safeRegisterRoute('/api/webview', './api/webview.js');

// Views
safeRegisterRoute('/api/views/handler', './api/views/handler.js');

// Messenger
safeRegisterRoute('/api/messenger/send-tracking', './api/messenger/send-tracking.js');

// Sheets
safeRegisterRoute('/api/sheets/sync', './api/sheets/sync.js');

// Cron
safeRegisterRoute('/api/cron', './api/cron/index.js');
safeRegisterRoute('/api/cron/form-followup', './api/cron/form-followup.js');
safeRegisterRoute('/api/cron/scheduler', './api/cron/scheduler.js');
safeRegisterRoute('/api/cron/subscription', './api/cron/subscription.js');
safeRegisterRoute('/api/cron/execute-step', './api/cron/execute-step.js');

// Video thumbnail
safeRegisterRoute('/api/video-thumbnail', './api/video-thumbnail.js');

// Node analytics
safeRegisterRoute('/api/flows/node-analytics', './api/flows/node-analytics.js');

// Auth
safeRegisterRoute('/api/auth/facebook-callback', './api/auth/facebook-callback.js');

console.log('✅ API routes registration complete');

// ============================================
// Static Files & SPA Fallback
// ============================================

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ============================================
// Start Server
// ============================================

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 App URL: ${process.env.VITE_APP_URL || process.env.APP_URL || 'Not set'}`);
    console.log(`🗄️ Supabase URL: ${process.env.VITE_SUPABASE_URL ? 'Set' : 'Not set'}`);
});
