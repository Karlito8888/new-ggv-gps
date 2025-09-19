// Script pour tester le masquage du footer
// À exécuter dans la console du navigateur mobile

console.log('=== Footer Masking Test ===');

// Récupérer le footer
const footer = document.querySelector('.footer');
if (footer) {
  const footerStyles = getComputedStyle(footer);
  console.log('Footer styles:');
  console.log('margin-bottom:', footerStyles.marginBottom);
  console.log('padding-bottom:', footerStyles.paddingBottom);
  console.log('background:', footerStyles.background);
  console.log('position:', footerStyles.position);
  console.log('z-index:', footerStyles.zIndex);
}

// Vérifier les styles root
const rootStyles = getComputedStyle(document.documentElement);

// Vérifier le body
const bodyStyles = getComputedStyle(document.body);
console.log('Body background:', bodyStyles.background);

// Test du layout
const layout = document.querySelector('.radix-themes');
if (layout) {
  const layoutStyles = getComputedStyle(layout);
  console.log('Layout grid-template-rows:', layoutStyles.gridTemplateRows);
  console.log('Layout height:', layoutStyles.height);
}

// Infos sur l'appareil
console.log('Display mode:', window.matchMedia('(display-mode: standalone)').matches ? 'PWA' : 'Browser');
console.log('User Agent:', navigator.userAgent.substring(0, 100));

console.log('=== Test Complete ===');

// Test visuel: changer temporairement la couleur pour voir l'effet
if (footer) {
  console.log('Test visuel: footer en rouge temporairement');
  footer.style.background = 'red';
  setTimeout(() => {
    footer.style.background = '';
    console.log('Test visuel terminé');
  }, 2000);
}