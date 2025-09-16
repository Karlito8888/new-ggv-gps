#!/usr/bin/env node

/**
 * Script pour mettre à jour la version du projet
 * Usage: node scripts/update-version.js <nouvelle-version>
 * Exemple: node scripts/update-version.js 1.0.7
 */

import fs from 'fs';
import path from 'path';

const newVersion = process.argv[2];

if (!newVersion) {
  console.error('❌ Veuillez spécifier une version');
  console.log('Usage: node scripts/update-version.js <version>');
  console.log('Exemple: node scripts/update-version.js 1.0.7');
  process.exit(1);
}

// Validation format version (x.y.z)
const versionRegex = /^\d+\.\d+\.\d+$/;
if (!versionRegex.test(newVersion)) {
  console.error('❌ Format de version invalide. Utilisez x.y.z (ex: 1.0.7)');
  process.exit(1);
}

console.log(`🚀 Mise à jour vers la version ${newVersion}...`);

// Fichiers à mettre à jour
const filesToUpdate = [
  {
    path: 'package.json',
    pattern: /"version":\s*"[^"]+"/,
    replacement: `"version": "${newVersion}"`
  },
  {
    path: 'src/components/Footer/Footer.jsx',
    pattern: /v\d+\.\d+\.\d+/,
    replacement: `v${newVersion}`
  }
];

let updatedFiles = 0;

filesToUpdate.forEach(file => {
  try {
    const filePath = path.resolve(file.path);
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (file.pattern.test(content)) {
      const updatedContent = content.replace(file.pattern, file.replacement);
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`✅ ${file.path} mis à jour`);
      updatedFiles++;
    } else {
      console.log(`⚠️  ${file.path} - pattern non trouvé`);
    }
  } catch (error) {
    console.error(`❌ Erreur lors de la mise à jour de ${file.path}:`, error.message);
  }
});

if (updatedFiles > 0) {
  console.log(`\n🎉 Version mise à jour vers ${newVersion} !`);
  console.log(`📝 ${updatedFiles} fichier(s) mis à jour`);
  console.log('\n📋 Prochaines étapes :');
  console.log('1. npm install (pour mettre à jour package-lock.json)');
  console.log('2. npm run build (pour tester)');
  console.log('3. git add . && git commit -m "chore: bump version to ${newVersion}"');
  console.log('4. git tag v${newVersion}');
} else {
  console.log('❌ Aucun fichier mis à jour');
}