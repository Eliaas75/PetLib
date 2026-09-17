export const adviceCategories = ["Tous", "Prévention", "Urgence", "NAC", "Nutrition", "Transport"];

export const adviceArticles = [
  {
    id: "prepare-vet-visit",
    category: "Prévention",
    title: "Bien préparer une consultation vétérinaire",
    summary: "Les informations utiles à rassembler avant un rendez-vous : symptômes observés, traitements, alimentation et historique récent.",
    readTime: "4 min",
    intro: "Une consultation est souvent plus efficace lorsque les informations importantes sont faciles à retrouver. Quelques minutes de préparation peuvent aider le vétérinaire à comprendre plus vite la situation de ton animal.",
    sections: [
      {
        title: "Note ce que tu as observé",
        paragraphs: [
          "Avant le rendez-vous, note depuis quand le problème est apparu et comment il évolue. Essaie de décrire des faits observables plutôt que d'interpréter la cause.",
        ],
        bullets: [
          "appétit et quantité d'eau bue",
          "vomissements, selles ou urines inhabituelles",
          "niveau d'activité et comportement",
          "douleur apparente, boiterie ou gêne",
          "heure approximative de début et évolution des signes",
        ],
      },
      {
        title: "Prépare les informations de santé",
        paragraphs: [
          "Garde à portée de main les traitements actuels, les allergies connues, les dernières vaccinations et les comptes rendus récents si ton animal a déjà été suivi ailleurs.",
          "Une photo ou une courte vidéo peut aussi être utile lorsqu'un comportement ou un symptôme n'est pas présent au moment de la consultation.",
        ],
      },
      {
        title: "N'oublie pas les habitudes quotidiennes",
        paragraphs: [
          "Le vétérinaire peut te demander l'alimentation utilisée, les quantités, les changements récents, le mode de vie de l'animal et ses contacts éventuels avec d'autres animaux.",
        ],
      },
    ],
  },
  {
    id: "when-emergency",
    category: "Urgence",
    title: "Quand contacter rapidement un vétérinaire ?",
    summary: "Repérer les situations qui nécessitent une prise en charge rapide sans tenter de poser soi-même un diagnostic.",
    readTime: "5 min",
    urgent: true,
    intro: "Certaines situations justifient de contacter rapidement un vétérinaire ou un service de garde. PetLib peut aider à trouver un professionnel, mais ne doit pas retarder un appel lorsque l'état de l'animal paraît grave ou se dégrade rapidement.",
    sections: [
      {
        title: "Signes qui justifient un contact rapide",
        paragraphs: [
          "Cette liste n'est pas exhaustive. L'intensité, la durée et l'état général de l'animal comptent beaucoup.",
        ],
        bullets: [
          "difficulté à respirer ou respiration très anormale",
          "perte de connaissance, convulsions ou faiblesse extrême",
          "saignement important ou traumatisme sérieux",
          "abdomen très gonflé, douleur intense ou agitation inhabituelle",
          "ingestion possible d'un produit toxique ou d'un médicament",
          "incapacité soudaine à uriner ou efforts répétés sans résultat",
          "dégradation rapide de l'état général",
        ],
      },
      {
        title: "Ce qu'il vaut mieux faire",
        paragraphs: [
          "Appelle le vétérinaire ou le service de garde avant de te déplacer lorsque c'est possible. Décris simplement ce que tu observes et suis leurs instructions pour le transport.",
          "N'administre pas un médicament humain et ne provoque pas de vomissement sans consigne vétérinaire : certains gestes peuvent aggraver la situation selon le produit ou l'espèce.",
        ],
      },
    ],
  },
  {
    id: "nac-visit",
    category: "NAC",
    title: "Trouver un vétérinaire adapté à un NAC",
    summary: "Lapins, oiseaux, reptiles, rongeurs ou furets : tous les praticiens ne prennent pas en charge les mêmes espèces.",
    readTime: "4 min",
    intro: "Les NAC regroupent des espèces très différentes. Une clinique qui reçoit les lapins n'a pas nécessairement l'équipement ou l'expérience adaptés aux reptiles ou aux oiseaux.",
    sections: [
      {
        title: "Cherche par espèce précise",
        paragraphs: [
          "Lorsque c'est possible, sélectionne directement l'espèce de ton animal plutôt que la catégorie générale NAC. Cela permet d'écarter les praticiens qui ne la prennent pas en charge.",
        ],
      },
      {
        title: "Vérifie les compétences et l'équipement",
        paragraphs: [
          "Selon le motif, certaines consultations peuvent nécessiter du matériel particulier, des possibilités d'imagerie, d'hospitalisation ou simplement une équipe habituée à manipuler l'espèce concernée.",
        ],
        bullets: [
          "espèces effectivement acceptées",
          "expérience ou spécialité annoncée",
          "équipement utile au motif de consultation",
          "possibilité d'hospitalisation si nécessaire",
        ],
      },
      {
        title: "Prépare le transport",
        paragraphs: [
          "Pour les petits mammifères, oiseaux ou reptiles, la température et la sécurité du contenant sont importantes. Évite les changements brusques de température et demande conseil à la clinique si tu hésites sur le transport.",
        ],
      },
    ],
  },
  {
    id: "food-transition",
    category: "Nutrition",
    title: "Changer l'alimentation de son animal progressivement",
    summary: "Pourquoi les changements alimentaires brusques sont à éviter et quelles informations demander à son vétérinaire.",
    readTime: "3 min",
    intro: "Un changement d'alimentation peut être nécessaire pour de nombreuses raisons, mais une transition trop rapide peut entraîner des troubles digestifs chez certains animaux.",
    sections: [
      {
        title: "Évite les changements brusques sans raison",
        paragraphs: [
          "Pour un animal en bonne santé qui change simplement de nourriture, une transition progressive est généralement plus facile à tolérer. La durée exacte dépend de l'espèce, de l'aliment et de l'état de santé.",
        ],
      },
      {
        title: "Observe la tolérance",
        paragraphs: [
          "Pendant la transition, surveille l'appétit, les selles, les vomissements éventuels, le comportement et le poids lorsque c'est pertinent.",
          "Si ton animal refuse de manger, présente des symptômes importants ou suit un régime médical, contacte le vétérinaire plutôt que de poursuivre seul les changements.",
        ],
      },
      {
        title: "Les régimes médicaux sont différents",
        paragraphs: [
          "Un aliment prescrit dans le cadre d'une maladie ne doit pas être remplacé uniquement sur la base d'un conseil général. Demande au vétérinaire comment effectuer la transition et quelles alternatives sont compatibles.",
        ],
      },
    ],
  },
  {
    id: "safe-transport",
    category: "Transport",
    title: "Transporter son animal sans ajouter de stress inutile",
    summary: "Caisse, température, trajet et préparation : les bons réflexes avant de se rendre en consultation.",
    readTime: "4 min",
    intro: "Le trajet jusqu'à la clinique peut être une source de stress. Une préparation simple améliore souvent la sécurité de l'animal et rend l'arrivée en consultation plus calme.",
    sections: [
      {
        title: "Utilise un contenant adapté",
        paragraphs: [
          "La caisse ou le contenant doit empêcher la fuite, permettre une ventilation suffisante et rester stable pendant le trajet. Dans une voiture, évite de laisser l'animal circuler librement.",
        ],
      },
      {
        title: "Anticipe le trajet",
        bullets: [
          "prépare la caisse avant le départ",
          "prévois une protection absorbante si nécessaire",
          "évite les températures extrêmes dans le véhicule",
          "limite les bruits et manipulations inutiles",
          "garde l'adresse et le numéro de la clinique accessibles",
        ],
      },
      {
        title: "Adapte selon l'espèce",
        paragraphs: [
          "Les besoins d'un chat, d'un lapin, d'un oiseau ou d'un reptile ne sont pas identiques. Pour une espèce sensible à la température ou un animal fragile, demande à la clinique les précautions particulières avant de partir.",
        ],
      },
    ],
  },
  {
    id: "health-record",
    category: "Prévention",
    title: "Les informations santé à garder à portée de main",
    summary: "Vaccins, traitements, allergies, poids et identification : une fiche claire peut faire gagner du temps en consultation.",
    readTime: "3 min",
    intro: "Un dossier simple et à jour facilite le suivi lorsqu'un animal change de clinique, consulte en urgence ou est pris en charge par une autre personne de la famille.",
    sections: [
      {
        title: "Les informations essentielles",
        bullets: [
          "nom, espèce, race ou sous-type et date de naissance approximative",
          "numéro d'identification lorsqu'il existe",
          "vaccinations importantes",
          "traitements en cours avec dose et fréquence",
          "allergies ou réactions déjà connues",
          "poids et variations récentes si elles sont suivies",
          "antécédents ou opérations importantes",
        ],
      },
      {
        title: "Mets le dossier à jour après les consultations",
        paragraphs: [
          "Après un rendez-vous, ajoute les nouveaux traitements, examens ou recommandations utiles. L'objectif n'est pas de remplacer le dossier du vétérinaire mais de disposer d'un résumé accessible.",
        ],
      },
      {
        title: "Partage uniquement ce qui est nécessaire",
        paragraphs: [
          "Si une autre personne garde ton animal, elle peut avoir besoin du contact du vétérinaire, des traitements indispensables et des consignes d'urgence. Évite de diffuser inutilement des informations personnelles qui ne sont pas utiles à la prise en charge.",
        ],
      },
    ],
  },
];

export function getAdviceArticle(id) {
  return adviceArticles.find((article) => article.id === id) || null;
}
