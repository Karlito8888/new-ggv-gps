#!/usr/bin/env node

/**
 * Script de vérification de compatibilité Netlify
 * Exécute des checks avant déploiement
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

console.log('🔍 Vérification de compatibilité Netlify...\n');

const checks = [];

// Vérifier la présence des fichiers essentiels
const requiredFiles = [
  'netlify.toml',
  'public/_redirects',
  'public/_headers',
  'dist/index.html',
  'dist/manifest.webmanifest',
  'dist/sw.js'
];

console.log('📁 Vérification des fichiers requis:');
requiredFiles.forEach(file => {
  const filePath = path.join(rootDir, file);
  const exists = fs.existsSync(filePath);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  checks.push({ name: file, status: exists });
});

// Vérifier la configuration package.json
console.log('\n📦 Vérification package.json:');
const packagePath = path.join(rootDir, 'package.json');
if (fs.existsSync(packagePath)) {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  const hasNodeVersion = pkg.engines?.node;
  console.log(`  ${hasNodeVersion ? '✅' : '⚠️'} Version Node.js spécifiée: ${hasNodeVersion || 'Non définie'}`);
  
  const hasBuildScript = pkg.scripts?.build;
  console.log(`  ${hasBuildScript ? '✅' : '❌'} Script build: ${hasBuildScript || 'Manquant'}`);
  
  checks.push({ name: 'package.json config', status: hasNodeVersion && hasBuildScript });
}

// Vérifier les icônes PWA
console.log('\n🎨 Vérification des icônes PWA:');
const iconSizes = ['16x16', '32x32', '48x48', '72x72', '96x96', '144x144', '192x192', '512x512'];
iconSizes.forEach(size => {
  const iconPath = path.join(rootDir, 'public', 'icons', `icon-${size}.png`);
  const exists = fs.existsSync(iconPath);
  console.log(`  ${exists ? '✅' : '❌'} icon-${size}.png`);
  if (!exists) checks.push({ name: `icon-${size}.png`, status: false });
});

// Vérifier les variables d'environnement
console.log('\n🔐 Variables d\'environnement:');
const envVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_OPENROUTE_API_KEY'
];

envVars.forEach(varName => {
  const exists = (typeof process !== 'undefined' && process.env && process.env[varName]) !== undefined;
  console.log(`  ${exists ? '✅' : '⚠️'} ${varName}: ${exists ? 'Définie' : 'Non définie (à configurer sur Netlify)'}`);
});

// Vérifier la configuration Vite
console.log('\n⚙️ Configuration Vite:');
const viteConfigPath = path.join(rootDir, 'vite.config.js');
if (fs.existsSync(viteConfigPath)) {
  const viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
  
  const hasBase = viteConfig.includes('base:');
  console.log(`  ${hasBase ? '✅' : '⚠️'} Configuration base path`);
  
  const hasPWA = viteConfig.includes('VitePWA');
  console.log(`  ${hasPWA ? '✅' : '❌'} Plugin PWA configuré`);
  
  const hasManualChunks = viteConfig.includes('manualChunks');
  console.log(`  ${hasManualChunks ? '✅' : '⚠️'} Optimisation chunks`);
}

// Résumé
console.log('\n📊 Résumé:');
const failedChecks = checks.filter(check => !check.status);
const passedChecks = checks.filter(check => check.status);

console.log(`✅ Checks réussis: ${passedChecks.length}`);
console.log(`❌ Checks échoués: ${failedChecks.length}`);

if (failedChecks.length > 0) {
  console.log('\n🚨 Problèmes détectés:');
  failedChecks.forEach(check => {
    console.log(`  - ${check.name}`);
  });
  console.log('\n💡 Voir NETLIFY_DEPLOYMENT.md pour résoudre ces problèmes.');
  if (typeof process !== 'undefined' && process.exit) process.exit(1);
} else {
  console.log('\n🎉 Toutes les vérifications sont passées !');
  console.log('✅ Prêt pour déploiement sur Netlify');
  if (typeof process !== 'undefined' && process.exit) process.exit(0);
}