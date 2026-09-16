# PetLib — Architecture cible

## Objectif produit

PetLib doit devenir une plateforme de mise en relation et de réservation vétérinaire centrée sur le matching réel entre :

- l'animal (espèce, sous-type, âge, contraintes),
- le motif de consultation,
- les compétences et équipements du praticien,
- la disponibilité réelle,
- la distance et le type de consultation,
- la possibilité de rejoindre une Smart Waitlist quand aucun créneau n'est disponible.

## Environnements Git

- `main` : production uniquement
- `develop` : intégration / staging
- `feature/*` : une fonctionnalité isolée
- `hotfix/*` : correction urgente de production

Flux recommandé :

`feature/*` -> Pull Request -> `develop` -> staging -> validation -> Pull Request -> `main` -> production

## Architecture applicative

### Frontend

- React 18
- Vite
- React Router
- Tailwind CSS

Responsabilités :

- recherche et filtres,
- fiches praticiens/cliniques,
- authentification,
- profil propriétaire,
- profils animaux,
- réservation,
- Smart Waitlist,
- tableau de bord praticien.

### Backend

- Node.js
- Express
- MongoDB / Mongoose
- Authentification JWT en cookie httpOnly

API cible :

- `/health`
- `/api/auth/*`
- `/api/pets/*`
- `/api/clinics/*`
- `/api/practitioners/*`
- `/api/availability/*`
- `/api/appointments/*`
- `/api/waitlist/*`
- `/api/notifications/*`

### Données principales

#### User

- email
- passwordHash
- fullName
- role: `owner | practitioner | clinic_admin | admin`
- phone
- notificationPreferences
- timestamps

#### Pet

- ownerId
- name
- species
- breed / subtype
- birthDate
- sex
- weight
- identificationNumber
- allergies
- treatments
- notes
- emergencyContact

#### Clinic

- name
- address
- geo coordinates
- phone
- email
- openingHours
- consultationTypes
- acceptedSpecies
- equipment
- emergencyCapability
- homeVisitRadiusKm
- verified

#### Practitioner

- userId
- clinicIds
- displayName
- specialties
- acceptedSpecies
- consultationTypes
- languages
- equipmentCapabilities
- verified

#### AvailabilitySlot

- practitionerId
- clinicId
- startsAt
- endsAt
- consultationType
- acceptedSpecies
- allowedReasons
- status: `available | held | booked | blocked`

#### Appointment

- ownerId
- petId
- practitionerId
- clinicId
- slotId
- reason
- consultationType
- status: `pending | confirmed | cancelled | completed | no_show`
- notes
- timestamps

#### WaitlistRequest

- ownerId
- petId
- reason
- consultationTypes
- maxDistanceKm
- preferredClinicIds
- startsAfter
- expiresAt
- status: `active | matched | booked | expired | cancelled`

#### WaitlistOffer

- waitlistRequestId
- slotId
- ownerId
- expiresAt
- status: `offered | accepted | expired | declined`

## Smart Waitlist

Quand un créneau devient disponible :

1. le backend cherche les demandes actives compatibles ;
2. il filtre par espèce, motif, type de consultation, distance et fenêtre horaire ;
3. il classe les correspondances ;
4. il crée une offre temporaire ;
5. l'utilisateur reçoit une notification ;
6. l'offre expire si elle n'est pas acceptée ;
7. le créneau est proposé au suivant.

Le moteur de matching doit rester explicable : PetLib doit pouvoir indiquer pourquoi un praticien ou un créneau est proposé.

## Déploiement cible

- `staging.<domaine>` : environnement privé, branché sur `develop`
- `app.<domaine>` : production, branchée sur `main`
- `api.<domaine>` : API de production
- domaine racine : landing page / liste d'attente avant lancement public

Le staging ne doit pas être protégé uniquement par `noindex` : il doit être derrière une authentification ou une protection d'accès.

## Priorités MVP

### P0

- authentification
- profils animaux
- cliniques et praticiens réels
- recherche et filtres réellement fonctionnels
- disponibilités
- réservation / annulation / reprogrammation
- espace `Mes rendez-vous`

### P1

- Smart Waitlist
- notifications
- dashboard praticien
- gestion des disponibilités
- matching NAC / ferme / équidés plus précis

### P2

- téléconsultation
- visite à domicile
- messagerie
- avis vérifiés
- paiement
- intégrations logiciels métier

### P3

- sponsors / publicité
- assurances et partenaires
- recommandations avancées
- fonctionnalités IA

## Règles de sécurité

- aucun secret dans Git ;
- variables d'environnement par environnement ;
- cookie auth `httpOnly` ;
- `secure: true` en production HTTPS ;
- CORS limité aux origines autorisées ;
- validation des entrées API ;
- rate limiting sur auth et endpoints sensibles ;
- logs sans mots de passe, tokens ou données sensibles inutiles.
