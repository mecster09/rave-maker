import express from 'express';
import { Simulator } from './simulator';

export function buildServer(sim?: Simulator) {
  const app = express();
  app.use(express.json());

  app.get('/api/studies/:id/subjects', async (req,res)=>{
    const subjects = await sim?.getStorage().getSubjects(req.params.id);
    res.json(subjects || []);
  });

  app.get('/api/studies/:id/forms', async (req,res)=>{
    const forms = await sim?.getStorage().getForms(req.params.id);
    res.json(forms || []);
  });

  app.get('/api/studies/:id/queries', async (req,res)=>{
    const queries = await sim?.getStorage().getQueries(req.params.id);
    res.json(queries || []);
  });

  return app;
}
