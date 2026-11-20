/**
 * Self-contained Full-Stack Backend + MongoDB E2E Test Runner
 * - Uses existing local MongoDB if running, otherwise spins up temporary mongod.exe
 * - Boots Express app + seeds Knowledge Base
 * - Runs all 13 E2E verification scenarios in e2e.verify.js
 * - Cleanly shuts down Express and temporary mongod
 */
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const MONGO_PORT = 27018;
const TEST_PORT = 5055;
const DATA_DIR = path.resolve(__dirname, '../../.mongodb-data');

function isPortOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitForPort(port, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isPortOpen(port)) return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

async function main() {
  let mongodProc = null;
  let server = null;

  try {
    let mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medical_cdss_test';
    const defaultLocalOpen = await isPortOpen(27017);

    if (defaultLocalOpen) {
      console.log('Detected running MongoDB on 127.0.0.1:27017. Using test database medical_cdss_e2e.');
      mongoUri = 'mongodb://127.0.0.1:27017/medical_cdss_e2e';
    } else {
      console.log(`Starting temporary local mongod on port ${MONGO_PORT}...`);
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const mongodBin = 'C:\\Program Files\\MongoDB\\Server\\9.0\\bin\\mongod.exe';
      mongodProc = spawn(mongodBin, [
        '--dbpath',
        DATA_DIR,
        '--port',
        String(MONGO_PORT),
        '--bind_ip',
        '127.0.0.1',
      ], { stdio: 'ignore' });

      const ready = await waitForPort(MONGO_PORT, 20000);
      if (!ready) {
        throw new Error('Temporary mongod failed to start within 20s.');
      }
      mongoUri = `mongodb://127.0.0.1:${MONGO_PORT}/medical_cdss_e2e`;
    }

    process.env.MONGODB_URI = mongoUri;
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key_for_e2e_only';
    process.env.EXPERT_REGISTRATION_CODE = process.env.EXPERT_REGISTRATION_CODE || 'CDSS-EXPERT-2026';

    const connectDB = require('../config/db');
    const { ensureSeededKnowledgeBase } = require('../services/knowledgeBaseService');
    const app = require('../app');

    await connectDB();
    const seedRes = await ensureSeededKnowledgeBase();
    console.log(
      `KB seeded=${seedRes.seeded}: ${seedRes.diseasesCount} diseases, ${seedRes.rulesCount} rules.`
    );

    server = await new Promise((resolve) => {
      const s = app.listen(TEST_PORT, '127.0.0.1', () => resolve(s));
    });
    console.log(`Test API server listening on http://127.0.0.1:${TEST_PORT}`);

    // Execute e2e.verify.js against our live server
    process.env.E2E_BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [path.resolve(__dirname, './e2e.verify.js')], {
        stdio: 'inherit',
        env: process.env,
      });
      child.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`e2e.verify.js exited with code ${code}`));
      });
    });

    console.log('Full backend + MongoDB E2E verification SUCCEEDED.');
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    if (mongodProc) {
      mongodProc.kill();
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
