'use strict';

const express = require('express');
const client = require('prom-client');

const app = express();
const port = Number(process.env.PORT || 3000);
const memoryChunks = [];

client.collectDefaultMetrics({
  eventLoopMonitoringPrecision: 10,
  labels: { app: 'operacion-black-friday' }
});

const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duracion de solicitudes HTTP en segundos',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 3, 5, 8, 13]
});

const httpRequests = new client.Counter({
  name: 'http_requests_total',
  help: 'Total de solicitudes HTTP procesadas',
  labelNames: ['method', 'route', 'status_code']
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function routeLabel(req) {
  return req.route && req.route.path ? req.route.path : req.path;
}

app.use((req, res, next) => {
  const started = process.hrtime.bigint();

  res.on('finish', () => {
    if (req.path === '/metrics') return;

    const seconds = Number(process.hrtime.bigint() - started) / 1e9;
    const labels = {
      method: req.method,
      route: routeLabel(req),
      status_code: String(res.statusCode)
    };

    httpDuration.observe(labels, seconds);
    httpRequests.inc(labels);
  });

  next();
});

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API Black Friday operativa',
    timestamp: new Date().toISOString()
  });
});

app.get('/slow', async (req, res) => {
  const delayMs = 3000 + Math.floor(Math.random() * 2001);
  await sleep(delayMs);
  res.json({
    status: 'slow',
    delayMs,
    message: 'Respuesta con latencia artificial de 3 a 5 segundos'
  });
});

app.get('/random-error', (req, res) => {
  const failRate = 0.3;
  if (Math.random() < failRate) {
    res.status(500).json({
      status: 'error',
      message: 'Fallo intermitente simulado'
    });
    return;
  }

  res.json({
    status: 'ok',
    message: 'Respuesta exitosa del endpoint inestable'
  });
});

app.get('/memory', (req, res) => {
  const mb = Number(process.env.MEMORY_LEAK_MB || 2);
  const chunkSize = Math.max(1, mb) * 1024 * 1024;
  memoryChunks.push(Buffer.alloc(chunkSize, 'black-friday'));

  res.json({
    status: 'memory-grown',
    retainedChunks: memoryChunks.length,
    retainedMbApprox: memoryChunks.length * Math.max(1, mb),
    message: 'Memoria retenida intencionalmente para simular fuga'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.listen(port, () => {
  console.log(`API Black Friday escuchando en puerto ${port}`);
});
