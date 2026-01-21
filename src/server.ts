/*
 * BELAFRICA - Plateforme diaspora africaine
 * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
 * Code source confidentiel - Usage interdit sans autorisation
 */
import { createNodeRequestHandler, isMainModule, AngularNodeAppEngine, writeResponseToNodeResponse } from '@angular/ssr/express';
import express, { Request, Response, NextFunction } from 'express';
import { join } from 'node:path';
 
// Le chemin vers le build du navigateur, basé sur votre angular.json
const browserDistFolder = join(process.cwd(), 'dist/belafrica/browser');
const app = express();
const angularApp = new AngularNodeAppEngine();
 


app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

app.use((req: Request, res: Response, next: NextFunction) => {
  angularApp
    .handle(req)
    .then((response: any) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error: any) => {
    if (error) {
      throw error;
    }
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app); 