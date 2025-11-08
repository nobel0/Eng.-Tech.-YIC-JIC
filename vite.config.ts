// FIX: Use explicit `node:` imports to resolve TypeScript errors with Node.js globals like `process`
// when type definitions are not correctly loaded. This avoids conflicts with client-side types.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { type Plugin } from 'vite';
import path from 'node:path';
import { cwd } from 'node:process';

// A Vite plugin to emulate Vercel's serverless functions for local development.
const vercelDevServer = (): Plugin => {
  return {
    name: 'vercel-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url;
        if (!url || !url.startsWith('/api/')) {
          return next();
        }

        const apiPath = url.substring(4).split('?')[0];
        // FIX: Use `cwd()` imported from `node:process` to get the current working directory, resolving the type error on `process.cwd()`.
        const filePath = path.resolve(cwd(), `api/${apiPath}.ts`);

        try {
          // Invalidate the module cache to always get the fresh version
          const module = await server.ssrLoadModule(filePath, { fixStacktrace: true });
          const handler = module.default;

          if (typeof handler !== 'function') {
            res.statusCode = 500;
            res.end(`Handler not found in ${filePath}`);
            return;
          }

          // Create a Web API-compliant Request object
          const requestUrl = new URL(req.originalUrl, `http://${req.headers.host}`);
          
          const request = new Request(requestUrl.toString(), {
            method: req.method,
            headers: req.headers as HeadersInit,
            // FIX: Cast `req` to `any` to resolve type mismatch between Node.js `IncomingMessage` and Web API `BodyInit`.
            body: req.method !== 'GET' ? (req as any) : undefined,
          });
          
          const response = await handler(request);

          // Send the Web API Response back to the client
          res.statusCode = response.status;
          response.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });
          
          const responseBody = await response.text();
          res.end(responseBody);

        } catch (error) {
          console.error(`Error in API route ${url}:`, error);
          res.statusCode = 500;
          res.end('Server Error');
        }
      });
    },
  };
};


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), vercelDevServer()],
})