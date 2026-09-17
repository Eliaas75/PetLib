# Tester l’espace professionnel PetLib en local

Cette démonstration est réservée au développement local. Le seed est bloqué lorsque `NODE_ENV=production`.

## 1. Recréer les données de démonstration

Depuis `server/` :

```bash
npm run seed:demo
```

Le seed recrée les structures, praticiens, disponibilités et comptes ci-dessous. Il peut être relancé pour repartir d’un état propre.

## 2. Comptes de démonstration

Mot de passe commun : `PetLibDemo2026!`

| Profil | Email |
| --- | --- |
| Admin clinique | `demo.clinique@petlib.local` |
| Vétérinaire 1 | `demo.veto@petlib.local` |
| Vétérinaire 2 | `demo.veto2@petlib.local` |
| Propriétaire | `demo.proprietaire@petlib.local` |

Le mot de passe peut être remplacé localement en définissant `DEMO_PASSWORD` avant de lancer le seed.

## 3. Scénario admin clinique

Connecte-toi avec `demo.clinique@petlib.local` puis ouvre `/pro`.

À tester :

1. Dashboard : métriques de la clinique et prochains rendez-vous.
2. Agenda : l’admin voit les rendez-vous des deux vétérinaires et le praticien assigné.
3. Équipe : les deux praticiens sont visibles dans la même structure.
4. Disponibilités : choisir la structure puis l’un des deux vétérinaires et créer une nouvelle plage.
5. Créneaux : bloquer puis rouvrir un créneau libre.
6. Statistiques : consulter les données agrégées de la structure.

## 4. Scénario vétérinaire

Connecte-toi avec `demo.veto@petlib.local`.

Le seed crée :

- un rendez-vous déjà commencé aujourd’hui, afin de tester `Terminer` ou `Marquer absent` immédiatement ;
- un rendez-vous futur en attente, afin de tester `Confirmer` puis éventuellement l’annulation avant son début ;
- des créneaux libres sur les prochains jours.

Le vétérinaire ne voit et ne modifie que ses propres rendez-vous et disponibilités.

## 5. Scénario Smart Waitlist / annulation pro

Connecte-toi avec le compte admin clinique ou vétérinaire, ouvre un rendez-vous futur puis clique sur `Annuler le rendez-vous`.

PetLib :

1. marque le rendez-vous comme annulé ;
2. libère le créneau lié ;
3. relance automatiquement le matching Smart Waitlist.

Pour tester une attribution réelle, crée auparavant une demande Smart Waitlist compatible avec un autre compte propriétaire.

## 6. Scénario propriétaire

Connecte-toi avec `demo.proprietaire@petlib.local`.

Le compte possède déjà l’animal fictif **Moka**, un chien. Il peut servir à tester :

- la recherche ;
- la réservation d’un nouveau créneau ;
- l’affichage des rendez-vous ;
- l’annulation côté propriétaire ;
- la Smart Waitlist.

## Important

Toutes les structures, personnes et données créées par le seed sont fictives et destinées uniquement au développement de PetLib.
