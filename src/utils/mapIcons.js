/**
 * Utilitaires pour créer des icônes MapLibre GL JS
 */

/**
 * Crée une icône de flèche directionnelle pour MapLibre
 * @param {Object} options - Options de configuration
 * @param {string} options.color - Couleur de la flèche (hex)
 * @param {number} options.size - Taille de l'icône en pixels
 * @param {number} options.strokeWidth - Épaisseur du trait
 * @returns {HTMLCanvasElement} Canvas avec l'icône de flèche
 */
export function createArrowIcon(options = {}) {
  const {
    color = '#ffffff',
    size = 24,
    strokeWidth = 2,
    backgroundColor = 'transparent'
  } = options;

  // Créer un canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Définir la taille du canvas
  canvas.width = size;
  canvas.height = size;
  
  // Fond transparent ou coloré
  if (backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, size, size);
  }
  
  // Dessiner la flèche
  const centerX = size / 2;
  const centerY = size / 2;
  const arrowSize = size * 0.6;
  
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Dessiner le corps de la flèche (ligne verticale)
  ctx.beginPath();
  ctx.moveTo(centerX, centerY + arrowSize / 3);
  ctx.lineTo(centerX, centerY - arrowSize / 3);
  ctx.stroke();
  
  // Dessiner la pointe de la flèche
  ctx.beginPath();
  ctx.moveTo(centerX - arrowSize / 4, centerY - arrowSize / 6);
  ctx.lineTo(centerX, centerY - arrowSize / 3);
  ctx.lineTo(centerX + arrowSize / 4, centerY - arrowSize / 6);
  ctx.stroke();
  
  return canvas;
}

/**
 * Crée une icône de flèche remplie pour MapLibre
 * @param {Object} options - Options de configuration
 * @returns {HTMLCanvasElement} Canvas avec l'icône de flèche remplie
 */
export function createFilledArrowIcon(options = {}) {
  const {
    color = '#3b82f6',
    size = 20,
    outlineColor = '#ffffff',
    outlineWidth = 1
  } = options;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Forcer la taille explicitement
  canvas.width = size;
  canvas.height = size;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  
  const centerX = size / 2;
  const centerY = size / 2;
  const arrowHeight = size * 0.7;
  const arrowWidth = size * 0.5;
  
  // Dessiner la flèche remplie
  ctx.beginPath();
  
  // Pointe de la flèche (haut)
  ctx.moveTo(centerX, centerY - arrowHeight / 2);
  
  // Côté droit
  ctx.lineTo(centerX + arrowWidth / 2, centerY - arrowHeight / 6);
  ctx.lineTo(centerX + arrowWidth / 4, centerY - arrowHeight / 6);
  ctx.lineTo(centerX + arrowWidth / 4, centerY + arrowHeight / 2);
  
  // Base
  ctx.lineTo(centerX - arrowWidth / 4, centerY + arrowHeight / 2);
  ctx.lineTo(centerX - arrowWidth / 4, centerY - arrowHeight / 6);
  
  // Côté gauche
  ctx.lineTo(centerX - arrowWidth / 2, centerY - arrowHeight / 6);
  
  ctx.closePath();
  
  // Remplir la flèche
  ctx.fillStyle = color;
  ctx.fill();
  
  // Contour
  if (outlineWidth > 0) {
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.stroke();
  }
  
  return canvas;
}

/**
 * Ajoute une icône au style MapLibre
 * @param {Object} map - Instance de la carte MapLibre
 * @param {string} iconName - Nom de l'icône
 * @param {HTMLCanvasElement} iconCanvas - Canvas contenant l'icône
 */
export function addIconToMap(map, iconName, iconCanvas) {
  if (!map || !iconName || !iconCanvas) {
    console.warn('addIconToMap: missing parameters');
    return;
  }

  try {
    // Vérifier si l'icône existe déjà
    if (map.hasImage(iconName)) {
      map.removeImage(iconName);
    }
    
    // Ajouter l'icône à la carte
    map.addImage(iconName, iconCanvas);
    console.log(`✅ Icon '${iconName}' added to map`);
  } catch (error) {
    console.error(`❌ Error adding icon '${iconName}':`, error);
  }
}

/**
 * Initialise toutes les icônes de direction pour la carte
 * @param {Object} map - Instance de la carte MapLibre
 */
export function initializeDirectionIcons(map) {
  if (!map) {
    console.warn('initializeDirectionIcons: carte non fournie');
    return;
  }

  // Icône de flèche pour la route principale
  const routeArrow = createFilledArrowIcon({
    color: '#3b82f6',
    size: 16,
    outlineColor: '#ffffff',
    outlineWidth: 1
  });
  
  // Icône de flèche pour la route parcourue
  const traveledArrow = createFilledArrowIcon({
    color: '#f59e0b',
    size: 14,
    outlineColor: '#ffffff',
    outlineWidth: 1
  });

  // Debug des tailles d'icônes
  console.log('🎨 Icon route-arrow:', routeArrow.width + 'x' + routeArrow.height);
  console.log('🎨 Icon traveled-arrow:', traveledArrow.width + 'x' + traveledArrow.height);

  // Ajouter les icônes à la carte
  addIconToMap(map, 'route-arrow', routeArrow);
  addIconToMap(map, 'traveled-arrow', traveledArrow);
}

/**
 * Nettoie les icônes de direction de la carte
 * @param {Object} map - Instance de la carte MapLibre
 */
export function cleanupDirectionIcons(map) {
  if (!map) return;

  const iconNames = ['route-arrow', 'traveled-arrow'];
  
  iconNames.forEach(iconName => {
    try {
      if (map.hasImage(iconName)) {
        map.removeImage(iconName);
        console.log(`🧹 Icon '${iconName}' removed`);
      }
    } catch (error) {
      console.error(`❌ Error removing icon '${iconName}':`, error);
    }
  });
}
