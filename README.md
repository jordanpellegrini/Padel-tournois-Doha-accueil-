# 🎾 Pádel Doha — Gestion de tournois

Application web pour gérer des tournois de pádel à Doha (et ailleurs !).
Stack : **React + Vite + Supabase + Vercel + GitHub**.

## ✨ Fonctionnalités

- 🏠 **Page d'accueil** : "Bienvenue au tournoi de Pádel de Doha" + bouton Nouveau tournoi
- ⚙ **Configuration** : durée totale, durée match (20min), durée pause (5min), nombre de terrains
- 👥 **Ajout d'équipes** : 2 joueurs par équipe
- 🎲 **Tirage au sort** (2 modes) :
  - Tirer l'ordre des équipes existantes
  - Mélanger les joueurs et reformer des paires aléatoires
- 🚀 **Génération automatique du planning** : calcule combien de matchs/rounds tiennent dans la durée totale, équilibre les matchs entre équipes
- ⏱ **Timer** : compte à rebours match → popup fin de match → pause → popup fin de pause
- 🏆 **Scores et classement temps réel**
- 💾 **Sauvegarde Supabase** : historique complet par tournoi
- 🔒 **Mode Admin** : seul l'admin peut créer/modifier ; les autres voient en lecture seule

## 🚀 Installation locale

```bash
npm install
npm run dev
```

## 📋 Étapes de mise en route

### 1. Créer le projet Supabase

1. Va sur https://supabase.com → Nouveau projet
2. Une fois créé, va dans **SQL Editor**
3. Copie-colle le contenu de `supabase-schema.sql` et exécute
4. Va dans **Database > Replication** et active Realtime pour les 3 tables (`tournaments`, `teams`, `matches`)
5. Récupère ton **Project URL** et **anon key** dans **Settings > API**

### 2. Configurer les clés (en local, JAMAIS dans le chat Claude)

Édite `src/lib/config.js` :

```js
export const SUPABASE_URL = 'https://TON-PROJET.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJxxx...'
export const ADMIN_USERNAME = 'Admin'
export const ADMIN_PASSWORD = 'TON_MOT_DE_PASSE_FORT'
```

### 3. Pousser sur GitHub

Comme pour Recettes de Sylvie, tu peux uploader les fichiers via l'interface web GitHub.

### 4. Déployer sur Vercel

1. Va sur https://vercel.com → Add New Project
2. Importe ton repo GitHub
3. Framework Preset : **Vite** (détecté auto)
4. Deploy → tu obtiens une URL `padel-doha.vercel.app`

## 🎮 Utilisation

1. **Page d'accueil** : clique sur "🎾 Nouveau tournoi" (admin uniquement)
   → Un tournoi "Pádel du [date du jour]" est créé
2. **Configuration** : règle la durée totale, durée match, durée pause, nombre de terrains
3. **Équipes** : ajoute les paires de joueurs
4. **Tirage au sort** (optionnel) : choisis le mode
5. **Lancer le tournoi** : génère le planning des matchs
6. **Pendant le tournoi** :
   - Le timer affiche le compte à rebours du match
   - À la fin du match → popup "Fin du match" → saisis les scores → clique pour démarrer la pause
   - À la fin de la pause → popup "Fin de la pause" → démarrer le match suivant
   - Le classement se met à jour en temps réel
7. **Fin du tournoi** : clique sur "🏆 Terminer le tournoi"

## 🔧 Algorithme de planning

L'app calcule automatiquement :
- **Nombre de rounds** = `(durée_totale + pause) / (match + pause)`
- **Matchs par round** = `min(nb_terrains, nb_équipes / 2)`
- **Équilibrage** : les équipes ayant le moins joué passent en priorité
- **Anti-doublons** : on évite de remettre les mêmes équipes ensemble tant que possible

Exemple : 4h (240min), match 20min, pause 5min, 2 terrains, 8 équipes
→ 9 rounds × 2 terrains = **18 matchs** répartis équitablement (≈ 4.5 matchs par équipe)

## 🔐 Sécurité

- La **anon key Supabase** est publique par design — c'est OK car protégée par RLS
- Le **mot de passe admin** est en clair dans le code (comme Recettes de Sylvie). Pour plus de sécurité, tu peux migrer vers Supabase Auth plus tard.

## 📁 Structure

```
padel-doha/
├── supabase-schema.sql          # À exécuter dans Supabase
├── src/
│   ├── lib/
│   │   ├── config.js            # ⚠️ Tes clés ici
│   │   ├── supabase.js
│   │   ├── auth.jsx             # Context admin
│   │   └── tournamentLogic.js   # Algos de planning + tirage
│   ├── components/
│   │   ├── Header.jsx
│   │   └── MatchTimer.jsx       # Timer + popups
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   ├── TournamentPage.jsx   # ⭐ Coeur de l'app
│   │   └── HistoryPage.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
└── vercel.json
```
