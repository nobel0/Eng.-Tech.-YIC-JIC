import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
// FIX: Explicitly import from 'node:' prefixed modules to ensure correct Node.js types are loaded.
// This resolves errors with 'process.cwd()' and 'Buffer' not being recognized.
import path from 'node:path';
import { cwd } from 'node:process';
import { Buffer } from 'node:buffer';

/**
 * A Vite plugin to emulate Vercel's serverless functions for local development.
 * This allows API calls to `/api/*` to be handled by the files in the `api/` directory.
 */
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
        // Ensure the path doesn't try to escape the api directory
        if (apiPath.includes('..')) {
            res.statusCode = 400;
            res.end('Invalid API path');
            return;
        }
        
        // FIX: Use `cwd` imported from `node:process` to resolve the TypeScript error on `process.cwd()`.
        const filePath = path.resolve(cwd(), `api/${apiPath}.ts`);

        try {
          // Use Vite's SSR loader to process the TypeScript file in real-time
          const module = await server.ssrLoadModule(filePath);
          const handler = module.default;

          if (typeof handler !== 'function') {
            res.statusCode = 500;
            res.end(`Handler not found. Make sure ${filePath} has a default export function.`);
            return;
          }

          // Create a Web API-compliant Request object from the Node.js request
          const requestUrl = new URL(req.originalUrl!, `http://${req.headers.host}`);
          
          const request = new Request(requestUrl.toString(), {
            method: req.method,
            headers: req.headers as HeadersInit,
            // Pass the raw Node request stream as the body for POST/PUT requests
            body: (req.method !== 'GET' && req.method !== 'HEAD') ? req : null,
            // @ts-ignore - 'duplex' is a required property for streams in newer Node versions
            duplex: 'half',
          });
          
          // Call the Vercel function handler
          const response = await handler(request);

          // Send the Web API Response back to the client via the Node.js response
          res.statusCode = response.status;
          response.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });
          
          const responseBody = await response.arrayBuffer();
          res.end(Buffer.from(responseBody));

        } catch (error: any) {
          // Handle cases where the API file doesn't exist
          if (error.code === 'ERR_MODULE_NOT_FOUND' || /Cannot find module/.test(error.message)) {
            res.statusCode = 404;
            res.end(`API route not found: ${url}`);
          } else {
            // Forward other errors to the console and browser
            console.error(`Error processing API route ${url}:`, error);
            res.statusCode = 500;
            res.end(`Server Error: ${error.message}`);
          }
        }
      });
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // The third parameter '' makes it load all env variables, not just VITE_ prefixed ones.
  const env = loadEnv(mode, cwd(), '');

  // Merge the loaded variables into the current process's environment.
  // This makes them available to the entire Vite server process, including
  // the ssrLoadModule context used by our custom vercelDevServer plugin.
  process.env = {...process.env, ...env};

  return {
    plugins: [react(), vercelDevServer()],
  }
});