export interface Email {
  id: string;
  sender: string;
  senderAvatar: string;
  subject: string;
  preview: string;
  time: string;
  unread: boolean;
  starred: boolean;
  hasAttachment: boolean;
  priority: 'high' | 'normal' | 'low';
  labels: string[];
}

export const DEMO_EMAILS: Email[] = [
  {
    id: '1',
    sender: 'Marie Dubois',
    senderAvatar: 'MD',
    subject: 'URGENT - Sinistre incendie habitation Somain',
    preview: 'Bonjour, notre maison a subi un incendie hier soir. L\'assurance nous a conseillé de vous contacter pour une expertise d\'assuré. Pouvons-nous prévoir un rendez-vous rapidement ?',
    time: '08:40 AM',
    unread: true,
    starred: false,
    hasAttachment: false,
    priority: 'high',
    labels: ['urgent', 'JDE']
  },
  {
    id: '2',
    sender: 'AXA Assurances',
    senderAvatar: 'AX',
    subject: 'Dossier 45892 - Demande complément expertise',
    preview: 'Veuillez trouver en pièce jointe notre rapport préliminaire concernant le dossier de dégât des eaux. Nous aurions besoin de compléments d\'information sur l\'évaluation des dommages.',
    time: '10:12 AM',
    unread: true,
    starred: false,
    hasAttachment: true,
    priority: 'normal',
    labels: ['JDE']
  },
  {
    id: '3',
    sender: 'Pierre Lefevre',
    senderAvatar: 'PL',
    subject: 'Projet extension maison - Demande devis',
    preview: 'Nous souhaitons faire réaliser une extension de 30m² sur notre pavillon à Somain. Pourriez-vous nous établir un devis pour la maîtrise d\'œuvre complète ?',
    time: '12:44 PM',
    unread: false,
    starred: false,
    hasAttachment: true,
    priority: 'normal',
    labels: ['JDMO']
  },
  {
    id: '4',
    sender: 'Mairie de Somain',
    senderAvatar: 'MS',
    subject: 'Permis de construire PC 2025-034 - Avis favorable',
    preview: 'Nous avons le plaisir de vous informer que votre demande de permis de construire a reçu un avis favorable de la commission d\'urbanisme. Le document officiel est disponible en mairie.',
    time: 'Hier',
    unread: false,
    starred: true,
    hasAttachment: false,
    priority: 'low',
    labels: ['JDMO']
  },
  {
    id: '5',
    sender: 'Jean Martin',
    senderAvatar: 'JM',
    subject: 'Chantier Rue Pasteur - Point avancement travaux',
    preview: 'Les travaux de maçonnerie sont terminés. Début des travaux de plâtrerie prévu lundi prochain. Le planning est respecté, livraison matériaux confirmée pour vendredi.',
    time: 'Hier',
    unread: false,
    starred: false,
    hasAttachment: true,
    priority: 'normal',
    labels: ['DBCS']
  },
  {
    id: '6',
    sender: 'Sophie Bertrand',
    senderAvatar: 'SB',
    subject: 'Devis rénovation énergétique - Immeuble Lille',
    preview: 'Suite à notre visite du site jeudi dernier, veuillez trouver ci-joint notre devis détaillé pour l\'isolation thermique et la rénovation énergétique de l\'immeuble.',
    time: 'Il y a 2 jours',
    unread: false,
    starred: false,
    hasAttachment: true,
    priority: 'high',
    labels: ['DBCS', 'urgent']
  },
  {
    id: '7',
    sender: 'MAIF Assurances',
    senderAvatar: 'MF',
    subject: 'Fissures pavillon Douai - Acceptation dossier',
    preview: 'Nous accusons réception de votre dossier d\'expertise concernant les fissures du pavillon suite à la sécheresse. L\'indemnisation proposée est conforme à vos conclusions.',
    time: 'Il y a 2 jours',
    unread: false,
    starred: true,
    hasAttachment: false,
    priority: 'low',
    labels: ['JDE']
  },
  {
    id: '8',
    sender: 'Thomas Durand',
    senderAvatar: 'TD',
    subject: 'Plans architecturaux - Validation cliente',
    preview: 'Les clients ont validé les plans d\'architecture pour l\'extension. Nous pouvons passer à la phase suivante : dépôt du permis de construire et consultation des entreprises.',
    time: 'Il y a 3 jours',
    unread: false,
    starred: false,
    hasAttachment: false,
    priority: 'normal',
    labels: ['JDMO']
  },
  {
    id: '9',
    sender: 'Comptabilité DBCS',
    senderAvatar: 'CO',
    subject: 'Factures novembre - Validation requise',
    preview: 'Merci de valider les factures fournisseurs pour le mois de novembre avant vendredi. Le fichier récapitulatif est en pièce jointe avec tous les détails.',
    time: 'Il y a 4 jours',
    unread: false,
    starred: false,
    hasAttachment: true,
    priority: 'normal',
    labels: ['DBCS']
  },
  {
    id: '10',
    sender: 'Groupama Nord-Est',
    senderAvatar: 'GR',
    subject: 'Sinistre dégât des eaux Valenciennes - Clôture',
    preview: 'Nous vous confirmons la clôture du dossier suite à l\'accord trouvé avec l\'assuré. Le règlement de vos honoraires d\'expertise sera effectué sous 8 jours.',
    time: 'Il y a 5 jours',
    unread: false,
    starred: false,
    hasAttachment: false,
    priority: 'low',
    labels: ['JDE']
  }
];
