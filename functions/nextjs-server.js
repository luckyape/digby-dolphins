const { onRequest } = require('firebase-functions/v2/https');
const { join } = require('path');
const { createReadStream } = require('fs');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({
  dev,
  conf: { distDir: '.next' },
});
const handle = app.getRequestHandler();

exports.nextjs = onRequest(
  {
    region: 'us-central1',
    memory: '1GiB',
    maxInstances: 10,
  },
  async (req, res) => {
    await app.prepare();
    return handle(req, res);
  }
);
