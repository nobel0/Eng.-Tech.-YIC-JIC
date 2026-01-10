import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { type Plugin } from 'vite';
import path from 'node:path';
import { cwd } from 'node:process';

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
        const filePath = path.resolve(cwd(), `api/${apiPath}.ts`);

        try {
          const module = await server.ssrLoadModule(filePath, { fixStacktrace: true });
          const handler = module.default;

          if (typeof handler !== 'function') {
            res.statusCode = 500;
            res.end(`Handler not found in ${filePath}`);
            return;
          }

          const requestUrl = new URL(req.originalUrl || '', `http://${req.headers.host}`);
          
          const request = new Request(requestUrl.toString(), {
            method: req.method,
            headers: req.headers as HeadersInit,
            body: req.method !== 'GET' ? (req as any) : undefined,
          });
          
          const response = await handler(request);

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

export default defineConfig({
  plugins: [react(), vercelDevServer()],
  server: {
    host: true
  }
})