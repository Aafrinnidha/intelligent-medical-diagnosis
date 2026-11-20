/**
 * CLI Utility: Promote a registered doctor account to Authorized Medical Expert (Admin).
 * Usage: npm run promote-expert -- doctor@hospital.org
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Doctor = require('../models/Doctor');

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npm run promote-expert -- <registered-email>');
    process.exit(1);
  }

  try {
    await connectDB();
    const doctor = await Doctor.findOneAndUpdate(
      { email: email.trim().toLowerCase() },
      { role: 'medical_expert' },
      { new: true }
    );

    if (!doctor) {
      console.error(`No doctor account found with email: ${email}`);
      process.exitCode = 1;
    } else {
      console.log(
        `Account promoted: ${doctor.name} (${doctor.email}) now has role "${doctor.role}".`
      );
    }
  } catch (err) {
    console.error('Promotion failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

main();
