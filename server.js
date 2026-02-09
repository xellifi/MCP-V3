// Express Server for Coolify Deployment (ES Module version)
// This replaces Vercel's serverless functions with a unified Express server

import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// Note: dotenv not needed - Coolify injects environment variables directly

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

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// API Routes (dynamically imported)
// ============================================

// Startup validation - check required env vars
const requiredEnvVars = ['VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingEnvVars.length > 0) {
    console.error('❌ MISSING REQUIRED ENVIRONMENT VARIABLES:', missingEnvVars.join(', '));
} else {
    console.log('✅ All required environment variables are set');
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

// Helper to convert Vercel handler to Express handler
function wrapVercelHandler(handlerPath) {
    return async (req, res) => {
        try {
            // Dynamic require for transpiled CJS files
            const handler = require(handlerPath);
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
    };
}

// Admin API
app.all('/api/admin', wrapVercelHandler('./api/admin.js'));

// Webhooks
app.all('/api/webhooks/meta', wrapVercelHandler('./api/webhooks/meta.js'));

// Forms
app.all('/api/forms/handler', wrapVercelHandler('./api/forms/handler.js'));
app.all('/api/forms/continue-flow', wrapVercelHandler('./api/forms/continue-flow.js'));

// Webview
app.all('/api/webview', wrapVercelHandler('./api/webview.js'));

// Views
app.all('/api/views/handler', wrapVercelHandler('./api/views/handler.js'));

// Messenger
app.all('/api/messenger/send-tracking', wrapVercelHandler('./api/messenger/send-tracking.js'));

// Sheets
app.all('/api/sheets/sync', wrapVercelHandler('./api/sheets/sync.js'));

// Cron (for scheduled tasks) - Modular structure
app.all('/api/cron', wrapVercelHandler('./api/cron/index.js'));
// Direct routes for individual cron jobs (faster cold starts)
app.all('/api/cron/form-followup', wrapVercelHandler('./api/cron/form-followup.js'));
app.all('/api/cron/scheduler', wrapVercelHandler('./api/cron/scheduler.js'));
app.all('/api/cron/subscription', wrapVercelHandler('./api/cron/subscription.js'));
app.all('/api/cron/execute-step', wrapVercelHandler('./api/cron/execute-step.js'));

// Video thumbnail
app.all('/api/video-thumbnail', wrapVercelHandler('./api/video-thumbnail.js'));

// Node analytics
app.all('/api/flows/node-analytics', wrapVercelHandler('./api/flows/node-analytics.js'));

// Auth
app.all('/api/auth/facebook-callback', wrapVercelHandler('./api/auth/facebook-callback.js'));

// ============================================
// Static Files & SPA Fallback
// ============================================

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
    // Don't serve index.html for API routes
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
