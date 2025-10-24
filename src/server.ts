import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

// const browserDistFolder = join(import.meta.dirname, '../browser');

// const app = express();
// const angularApp = new AngularNodeAppEngine();



// app.use(
//   express.static(browserDistFolder, {
//     maxAge: '1y',
//     index: false,
//     redirect: false,
//   }),
// );

// /**
//  * Handle all other requests by rendering the Angular application.
//  */
// app.use((req, res, next) => {
//   angularApp
//     .handle(req)
//     .then((response) =>
//       response ? writeResponseToNodeResponse(response, res) : next(),
//     )
//     .catch(next);
// });

// /**
//  * Start the server if this module is the main entry point.
//  * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
//  */
// if (isMainModule(import.meta.url)) {
//   const port = process.env['PORT'] || 4000;
//   app.listen(port, (error) => {
//     if (error) {
//       throw error;
//     }

//     console.log(`Node Express server listening on http://localhost:${port}`);
//   });
// }

// /**
//  * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
//  */
// export const reqHandler = createNodeRequestHandler(app);

// src/server.ts
export function app(): express.Express {
  const server = express();
  const distFolder = join(process.cwd(), 'dist/belafrica/browser');
  
  server.get('/api/*', (req, res) => {
    res.status(404).send('api works');
  });
  
  server.get('/chat/:conversationId', (req, res) => {
    // Logique pour les routes dynamiques
    res.sendFile(join(distFolder, 'index.html'));
  });
  
  server.use(express.static(distFolder, {
    maxAge: '1y',
    index: 'index.html',
  }));
  
  return server;
}