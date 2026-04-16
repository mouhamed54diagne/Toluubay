import { CropType, CropStage } from './types';

export const CROPS: Record<CropType, { name: string; stages: CropStage[] }> = {
  arachide: {
    name: 'Arachide',
    stages: [
      { name: 'Semis', duration: 10, recommendations: ['Préparation du sol', 'Choix des semences certifiées'] },
      { name: 'Levée', duration: 15, recommendations: ['Désherbage précoce', 'Surveillance des insectes'] },
      { name: 'Floraison', duration: 20, recommendations: ['Apport de gypse', 'Maintien de l\'humidité'] },
      { name: 'Maturation', duration: 30, recommendations: ['Arrêt des arrosages', 'Préparation de la récolte'] },
    ],
  },
  mil: {
    name: 'Mil',
    stages: [
      { name: 'Semis', duration: 10, recommendations: ['Nettoyage du champ', 'Semis après la première pluie utile'] },
      { name: 'Tallage', duration: 25, recommendations: ['Premier sarclage', 'Apport d\'urée'] },
      { name: 'Montaison', duration: 20, recommendations: ['Deuxième sarclage', 'Surveillance de la chenille mineuse'] },
      { name: 'Épiaison', duration: 25, recommendations: ['Protection contre les oiseaux', 'Récolte à maturité'] },
    ],
  },
  maïs: {
    name: 'Maïs',
    stages: [
      { name: 'Semis', duration: 7, recommendations: ['Fertilisation de fond', 'Semis en poquets'] },
      { name: 'Croissance', duration: 30, recommendations: ['Sarclage', 'Apport d\'engrais azoté'] },
      { name: 'Floraison', duration: 15, recommendations: ['Besoin en eau critique', 'Surveillance des pucerons'] },
      { name: 'Remplissage', duration: 30, recommendations: ['Protection contre les rongeurs', 'Séchage sur pied'] },
    ],
  },
  riz: {
    name: 'Riz',
    stages: [
      { name: 'Pépinière', duration: 21, recommendations: ['Préparation du lit de semences', 'Arrosage régulier'] },
      { name: 'Repiquage', duration: 7, recommendations: ['Nivellement du sol', 'Mise en boue'] },
      { name: 'Tallage', duration: 30, recommendations: ['Gestion de l\'eau', 'Désherbage'] },
      { name: 'Floraison', duration: 20, recommendations: ['Maintien de la lame d\'eau', 'Surveillance des oiseaux'] },
    ],
  },
};

export const LOCAL_LANGUAGES = [
  { code: 'fr', name: 'Français' },
  { code: 'wo', name: 'Wolof' },
  { code: 'pu', name: 'Pulaar' },
  { code: 'se', name: 'Sérère' },
];

export const PILOT_ZONES = ['Tambacounda', 'Kaffrine'];
