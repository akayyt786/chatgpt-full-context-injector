const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3111;

const server = http.createServer((req, res) => {
    // Set CORS headers so ChatGPT's tab can talk to localhost safely
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle CORS preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Ping endpoint for Chrome extension to check if server is active
    if (req.method === 'GET' && req.url === '/ping') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'connected', root: process.cwd() }));
        return;
    }

    // Update-file endpoint
    if (req.method === 'POST' && req.url === '/update-file') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const filePath = data.path;
                const content = data.content;

                if (!filePath || content === undefined) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Missing path or content' }));
                    return;
                }

                // Resolve path safely relative to where the terminal server was started
                const safePath = path.resolve(process.cwd(), filePath);
                
                // Security check: Guard against directory traversal attacks (writing outside the workspace)
                if (!safePath.startsWith(process.cwd())) {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Access Denied: Path is outside workspace root' }));
                    return;
                }

                // Ensure parent directories exist
                const parentDir = path.dirname(safePath);
                if (!fs.existsSync(parentDir)) {
                    fs.mkdirSync(parentDir, { recursive: true });
                }

                // Write the code changes to disk
                fs.writeFileSync(safePath, content, 'utf8');

                console.log(`[Agent Server] Successfully wrote changes to: ${filePath}`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: `Wrote changes to ${filePath}` }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    res.writeHead(404);
    res.end();
});

server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 ChatGPT Auto-Write Companion Server Live!`);
    console.log(`📍 Running on: http://localhost:${PORT}`);
    console.log(`📂 Workspace Target: ${process.cwd()}`);
    console.log(`======================================================\n`);
    console.log(`Instructions: Run this from the root of the project you're working on.`);
    console.log(`Keep this terminal window open to allow auto-saves.\n`);
});
