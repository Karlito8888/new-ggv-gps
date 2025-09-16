#!/usr/bin/env node

/**
 * Script pour tester le .gitignore
 * Vérifie que les fichiers sensibles sont bien ignorés
 */

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🔍 Test du .gitignore...\n');

// Fichiers qui DOIVENT être ignorés
const shouldBeIgnored = [
  '.env',
  '.env.local',
  'node_modules/test',
  'dist/index.html',
  '.DS_Store',
  'coverage/report.html',
  '.vscode/launch.json.bak', // Fichier backup VSCode
  'secrets.json',
  'debug.log'
];

// Fichiers qui NE DOIVENT PAS être ignorés
const shouldNotBeIgnored = [
  'package.json',
  'src/main.jsx',
  'public/manifest.json',
  '.vscode/extensions.json', // Exception: on garde celui-ci
  '.vscode/settings.json',   // Exception: on garde celui-ci aussi
  'README.md',
  'vite.config.js'
];

let errors = 0;

console.log('✅ Vérification des fichiers qui DOIVENT être ignorés:');
shouldBeIgnored.forEach(file => {
  try {
    const result = execSync(`git check-ignore ${file}`, { encoding: 'utf8' });
    if (result.trim() === file) {
      console.log(`  ✅ ${file} - Correctement ignoré`);
    } else {
      console.log(`  ❌ ${file} - Devrait être ignoré mais ne l'est pas`);
      errors++;
    }
  } catch (error) {
    console.log(`  ❌ ${file} - Devrait être ignoré mais ne l'est pas`);
    errors++;
  }
});

console.log('\n✅ Vérification des fichiers qui NE DOIVENT PAS être ignorés:');
shouldNotBeIgnored.forEach(file => {
  try {
    execSync(`git check-ignore ${file}`, { encoding: 'utf8' });
    console.log(`  ❌ ${file} - Ne devrait pas être ignoré mais l'est`);
    errors++;
  } catch (error) {
    // Si git check-ignore échoue, c'est que le fichier n'est pas ignoré (bon)
    console.log(`  ✅ ${file} - Correctement suivi`);
  }
});

console.log('\n📊 Statistiques du .gitignore:');
try {
  const gitignoreContent = fs.readFileSync('.gitignore', 'utf8');
  const lines = gitignoreContent.split('\n').filter(line => 
    line.trim() && !line.trim().startsWith('#')
  );
  console.log(`  📝 ${lines.length} règles actives`);
  
  const categories = gitignoreContent.match(/# ={20,}/g)?.length || 0;
  console.log(`  📂 ${categories} catégories organisées`);
  
  const comments = gitignoreContent.match(/^#/gm)?.length || 0;
  console.log(`  💬 ${comments} lignes de documentation`);
} catch (error) {
  console.log('  ⚠️  Impossible de lire .gitignore');
}

console.log('\n🎯 Résultat:');
if (errors === 0) {
  console.log('✅ .gitignore parfaitement configuré !');
  process.exit(0);
} else {
  console.log(`❌ ${errors} erreur(s) détectée(s) dans .gitignore`);
  process.exit(1);
}