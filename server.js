// Express Server for Coolify Deployment
// This replaces Vercel's serverless functions with a unified Express server

const express = require('express');
const path = require('path');
const cors = require('cors');

// Load environment variables
require('dotenv').config();

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

// Helper to convert Vercel handler to Express handler
function wrapVercelHandler(handlerPath) {
    return async (req, res) => {
        try {
            // Dynamic import for ES modules
            const handler = require(handlerPath);
            const handlerFn = handler.default || handler;
            await handlerFn(req, res);
        } catch (error) {
            console.error(`Error in ${handlerPath}:`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    };
}

// Admin API
app.all('/api/admin', wrapVercelHandler('./api/admin'));

// Webhooks
app.all('/api/webhooks/meta', wrapVercelHandler('./api/webhooks/meta'));

// Forms
app.all('/api/forms/handler', wrapVercelHandler('./api/forms/handler'));
app.all('/api/forms/continue-flow', wrapVercelHandler('./api/forms/continue-flow'));

// Webview
app.all('/api/webview', wrapVercelHandler('./api/webview'));

// Views
app.all('/api/views/handler', wrapVercelHandler('./api/views/handler'));

// Messenger
app.all('/api/messenger/send-tracking', wrapVercelHandler('./api/messenger/send-tracking'));

// Sheets
app.all('/api/sheets/sync', wrapVercelHandler('./api/sheets/sync'));

// Cron (for scheduled tasks)
app.all('/api/cron', wrapVercelHandler('./api/cron'));

// Video thumbnail
app.all('/api/video-thumbnail', wrapVercelHandler('./api/video-thumbnail'));

// Node analytics
app.all('/api/flows/node-analytics', wrapVercelHandler('./api/flows/node-analytics'));

// Auth
app.all('/api/auth/facebook-callback', wrapVercelHandler('./api/auth/facebook-callback'));

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
