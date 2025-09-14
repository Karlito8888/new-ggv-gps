// Script pour tester les safe areas sur mobile
// À exécuter dans la console du navigateur

console.log('=== Safe Areas Test ===');

// Vérifier les variables CSS
const rootStyles = getComputedStyle(document.documentElement);
console.log('CSS Variables:');
console.log('--safe-area-top:', rootStyles.getPropertyValue('--safe-area-top'));
console.log('--safe-area-bottom:', rootStyles.getPropertyValue('--safe-area-bottom'));
console.log('--safe-area-left:', rootStyles.getPropertyValue('--safe-area-left'));
console.log('--safe-area-right:', rootStyles.getPropertyValue('--safe-area-right'));

// Vérifier le viewport-fit
const viewport = document.querySelector('meta[name="viewport"]');
console.log('Viewport content:', viewport?.content);

// Vérifier les paddings appliqués
const header = document.querySelector('.radix-themes > header');
const footer = document.querySelector('.radix-themes > footer');

if (header) {
  const headerStyles = getComputedStyle(header);
  console.log('Header padding-top:', headerStyles.paddingTop);
}

if (footer) {
  const footerStyles = getComputedStyle(footer);
  console.log('Footer padding-bottom:', footerStyles.paddingBottom);
}

// Infos sur l'appareil
console.log('User Agent:', navigator.userAgent);
console.log('Display Mode:', window.matchMedia('(display-mode: standalone)').matches ? 'Standalone' : 'Browser');

// Test de la hauteur
console.log('Window height:', window.innerHeight);
console.log('Document height:', document.documentElement.clientHeight);

console.log('=== Test Complete ===');