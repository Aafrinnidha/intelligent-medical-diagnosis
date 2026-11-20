require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./db');
const { ensureSeededKnowledgeBase } = require('../services/knowledgeBaseService');

async function runSeed() {
  try {
    await connectDB();
    const result = await ensureSeededKnowledgeBase();
    console.log(
      `Knowledge Base ready (seeded=${result.seeded}): ${result.diseasesCount} diseases, ${result.rulesCount} rules.`
    );
  } catch (err) {
    console.error('Error seeding Knowledge Base:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

if (require.main === module) {
  runSeed();
}

module.exports = runSeed;
