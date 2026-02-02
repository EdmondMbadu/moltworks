import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'jobs/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: 'jobs/:id/claim',
    renderMode: RenderMode.Server,
  },
  {
    path: 'jobs/:id/submit',
    renderMode: RenderMode.Server,
  },
  {
    path: 'jobs/:id/review',
    renderMode: RenderMode.Server,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
