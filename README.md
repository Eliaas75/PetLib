PetLib 

PetLib est un **prototype full-stack** (monorepo) d’application de **recherche & prise de rendez-vous** pour services vétérinaires (vétérinaires, NAC, ferme, etc.).  
Objectif : une expérience **health-tech** simple, calme et pro : rechercher, filtrer, puis réserver (MVP en cours).

Fonctionnalités (actuel)

Front (`client/`)
- Interface React + Vite
- Parcours de recherche (espèce / motif / ville)
- Page résultats avec filtres (disponibilité, type de consult, distance, tri)
- Auth côté client via `AuthContext` + routes privées (`PrivateRoute`)

Back (`server/`)
- API Express + MongoDB (Mongoose)
- Auth **JWT stocké en cookie httpOnly** :
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- Exemple de route protégée :
  - `GET /api/protected/ping`
- Healthcheck :
  - `GET /health`

Note sécurité : le cookie est `SameSite=Lax` et `secure: false` en dev. En prod HTTPS, `secure: true` sera nécessaire.  
CORS est configuré avec `credentials: true` et `origin: CLIENT_ORIGIN`.



Structure du repo


PetLib/
├─ client/ # Frontend React/Vite
└─ server/ # Backend Node/Express + MongoDB


---

Prérequis

- Node.js 20+
- MongoDB (local) **ou** Docker
- npm

Démarrage rapide

1) Cloner
```bash
git clone https://github.com/Eliaas75/PetLib.git
cd PetLib
2) Lancer MongoDB
Option A — Docker (recommandé)
docker run -d --name mongo \
  -p 27017:27017 \
  -v mongo_data:/data/db \
  mongo:7
Option B — MongoDB installé en local

Assure-toi que MongoDB tourne sur mongodb://127.0.0.1:27017.

Configuration des variables d’environnement
Server (server/.env)

Crée un fichier server/.env :

PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/petlib
JWT_SECRET=change_me_in_dev
CLIENT_ORIGIN=http://localhost:5173

CLIENT_ORIGIN doit matcher l’URL du front (Vite), sinon les cookies ne passeront pas (CORS + credentials).

Lancer le backend
cd server
npm install
npm run dev

Le serveur démarre par défaut sur http://localhost:4000.

▶️ Lancer le frontend
cd client
npm install
npm run dev

Le front démarre par défaut sur http://localhost:5173.
