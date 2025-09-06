#!/usr/bin/env node

/**
 * Netlify compatibility check script
 * Run checks before deployment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

console.log('🔍 Netlify compatibility check...\n');

const checks = [];

// Check for essential files
const requiredFiles = [
  'netlify.toml',
  'public/_redirects',
  'public/_headers',
  'dist/index.html',
  'dist/manifest.webmanifest',
  'dist/sw.js'
];

console.log('📁 Checking required files:');
requiredFiles.forEach(file => {
  const filePath = path.join(rootDir, file);
  const exists = fs.existsSync(filePath);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  checks.push({ name: file, status: exists });
});

// Check package.json configuration
console.log('\n📦 Checking package.json:');
const packagePath = path.join(rootDir, 'package.json');
if (fs.existsSync(packagePath)) {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  const hasNodeVersion = pkg.engines?.node;
  console.log(`  ${hasNodeVersion ? '✅' : '⚠️'} Node.js version specified: ${hasNodeVersion || 'Not defined'}`);
  
  const hasBuildScript = pkg.scripts?.build;
  console.log(`  ${hasBuildScript ? '✅' : '❌'} Build script: ${hasBuildScript || 'Missing'}`);
  
  checks.push({ name: 'package.json config', status: hasNodeVersion && hasBuildScript });
}

// Check PWA icons
console.log('\n🎨 Checking PWA icons:');
const iconSizes = ['16x16', '32x32', '48x48', '72x72', '96x96', '144x144', '192x192', '512x512'];
iconSizes.forEach(size => {
  const iconPath = path.join(rootDir, 'public', 'icons', `icon-${size}.png`);
  const exists = fs.existsSync(iconPath);
  console.log(`  ${exists ? '✅' : '❌'} icon-${size}.png`);
  if (!exists) checks.push({ name: `icon-${size}.png`, status: false });
});

// Check environment variables
console.log('\n🔐 Environment variables:');
const envVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_OPENROUTE_API_KEY'
];

envVars.forEach(varName => {
  const exists = (typeof process !== 'undefined' && process.env && process.env[varName]) !== undefined;
  console.log(`  ${exists ? '✅' : '⚠️'} ${varName}: ${exists ? 'Defined' : 'Not defined (configure on Netlify)'}`);
});

// Check Vite configuration
console.log('\n⚙️ Vite configuration:');
const viteConfigPath = path.join(rootDir, 'vite.config.js');
if (fs.existsSync(viteConfigPath)) {
  const viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
  
  const hasBase = viteConfig.includes('base:');
  console.log(`  ${hasBase ? '✅' : '⚠️'} Configuration base path`);
  
  const hasPWA = viteConfig.includes('VitePWA');
  console.log(`  ${hasPWA ? '✅' : '❌'} PWA plugin configured`);
  
  const hasManualChunks = viteConfig.includes('manualChunks');
  console.log(`  ${hasManualChunks ? '✅' : '⚠️'} Chunks optimization`);
}

// Summary
console.log('\n📊 Summary:');
const failedChecks = checks.filter(check => !check.status);
const passedChecks = checks.filter(check => check.status);

console.log(`✅ Passed checks: ${passedChecks.length}`);
console.log(`❌ Failed checks: ${failedChecks.length}`);

if (failedChecks.length > 0) {
  console.log('\n🚨 Issues detected:');
  failedChecks.forEach(check => {
    console.log(`  - ${check.name}`);
  });
  console.log('\n💡 See NETLIFY_DEPLOYMENT.md to resolve these issues.');
  if (typeof process !== 'undefined' && process.exit) process.exit(1);
} else {
  console.log('\n🎉 All checks passed!');
  console.log('✅ Ready for Netlify deployment');
  if (typeof process !== 'undefined' && process.exit) process.exit(0);
}