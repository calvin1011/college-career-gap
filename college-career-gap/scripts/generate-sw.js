import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local or .env.production
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local';
const envPath = path.join(__dirname, '..', envFile);

console.log(`Loading environment from: ${envFile}`);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn(`  Could not load ${envFile}, trying .env...`);
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
}

// Read the template file
const templatePath = path.join(__dirname, '../public/firebase-messaging-sw.template.js');
const outputPath = path.join(__dirname, '../public/firebase-messaging-sw.js');

console.log('Generating firebase-messaging-sw.js from template...');

// Read template
let template = fs.readFileSync(templatePath, 'utf8');

// Replace placeholders with environment variables
const replacements = {
  '__FIREBASE_API_KEY__': process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  '__FIREBASE_AUTH_DOMAIN__': process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  '__FIREBASE_PROJECT_ID__': process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  '__FIREBASE_STORAGE_BUCKET__': process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  '__FIREBASE_MESSAGING_SENDER_ID__': process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  '__FIREBASE_APP_ID__': process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  '__FIREBASE_MEASUREMENT_ID__': process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Check if all environment variables are set
const missingVars = [];
for (const [placeholder, value] of Object.entries(replacements)) {
  if (!value) {
    missingVars.push(placeholder);
  }
}

if (missingVars.length > 0) {
  console.error(' Error: Missing environment variables:');
  missingVars.forEach(v => console.error(`   - ${v}`));
  console.error(`\nPlease set these in your ${envFile} file`);
  console.error(`Checked path: ${envPath}`);
  process.exit(1);
}

// Replace all placeholders
for (const [placeholder, value] of Object.entries(replacements)) {
  template = template.replace(new RegExp(placeholder, 'g'), value);
}

// Write the output file
fs.writeFileSync(outputPath, template);

console.log(' Successfully generated firebase-messaging-sw.js');
console.log(`   Project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);