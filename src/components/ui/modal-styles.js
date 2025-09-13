// Centralized modal styles export
// Permet d'importer facilement les styles de base dans tous les modals

import baseStyles from './modal-base.module.css';

export { baseStyles };

// Export des noms de classes communs pour une utilisation cohérente
export const modalClasses = {
  // Container supprimé - utiliser directement DialogContent
  // Content supprimé - utiliser directement DialogHeader
  title: baseStyles.modalTitle,
  description: baseStyles.modalDescription,
  icon: baseStyles.modalIcon,
  logo: baseStyles.modalLogo,
  buttonGroup: baseStyles.buttonGroup,
  actions: baseStyles.modalActions,
  form: baseStyles.modalForm,
  footer: baseStyles.modalFooter,
  error: baseStyles.errorMessage,
};