// Express Server for Coolify Deployment (CommonJS)
// This replaces Vercel's serverless functions with a unified Express server

const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

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

// Debug endpoint
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

// ============================================
// API Routes (from transpiled api-dist folder)
// ============================================

// Helper to safely load and wrap a handler
function wrapHandler(handlerPath) {
    return async (req, res) => {
        try {
            const fullPath = path.join(__dirname, handlerPath);

            // Check if file exists
            if (!fs.existsSync(fullPath)) {
                console.error(`Handler not found: ${handlerPath}`);
                return res.status(500).json({ error: 'Handler not found', path: handlerPath });
            }

            const handler = require(fullPath);
            const handlerFn = handler.default || handler;

            if (typeof handlerFn !== 'function') {
                console.error(`Handler at ${handlerPath} is not a function`);
                return res.status(500).json({ error: 'Invalid handler' });
            }

            await handlerFn(req, res);
        } catch (error) {
            console.error(`Error in ${handlerPath}:`, error);
            res.status(500).json({ error: 'Internal server error', message: error.message });
        }
    };
}

// Use transpiled API files from api-dist/
app.all('/api/admin', wrapHandler('./api-dist/admin.js'));
app.all('/api/webhooks/meta', wrapHandler('./api-dist/webhooks/meta.js'));
app.all('/api/forms/handler', wrapHandler('./api-dist/forms/handler.js'));
app.all('/api/forms/continue-flow', wrapHandler('./api-dist/forms/continue-flow.js'));
app.all('/api/webview', wrapHandler('./api-dist/webview.js'));
app.all('/api/views/handler', wrapHandler('./api-dist/views/handler.js'));
app.all('/api/messenger/send-tracking', wrapHandler('./api-dist/messenger/send-tracking.js'));
app.all('/api/sheets/sync', wrapHandler('./api-dist/sheets/sync.js'));
app.all('/api/cron', wrapHandler('./api-dist/cron/index.js'));
app.all('/api/cron/form-followup', wrapHandler('./api-dist/cron/form-followup.js'));
app.all('/api/cron/scheduler', wrapHandler('./api-dist/cron/scheduler.js'));
app.all('/api/cron/subscription', wrapHandler('./api-dist/cron/subscription.js'));
app.all('/api/cron/execute-step', wrapHandler('./api-dist/cron/execute-step.js'));
app.all('/api/video-thumbnail', wrapHandler('./api-dist/video-thumbnail.js'));
app.all('/api/flows/node-analytics', wrapHandler('./api-dist/flows/node-analytics.js'));
app.all('/api/auth/facebook-callback', wrapHandler('./api-dist/auth/facebook-callback.js'));

// ============================================
// Static Files & SPA Fallback
// ============================================

app.use(express.static(path.join(__dirname, 'dist')));

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
