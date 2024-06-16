# Snookicker-Server
_custom server for snookicker in nodejs, LAN mode_

## Configuration du projet

Ce guide décrit les étapes à suivre pour configurer votre environnement de développement et installer les dépendances nécessaires à l'exécution du code de ce dépôt GitHub.

## Prérequis

- **Système d'exploitation:** Windows, macOS ou Linux

## Installation de Node.js et npm

1. **Téléchargement et installation de Node.js:**
  
  - Visitez la page officielle de téléchargement de Node.js : [Node.js — Download Node.js®](https://nodejs.org/en/download/prebuilt-binaries)
  - Téléchargez le programme d'installation adapté à votre système d'exploitation.
  - Exécutez le programme d'installation et suivez les instructions à l'écran.
2. **Vérification de l'installation:** (Facultatif)
  
  - Ouvrez une fenêtre de terminal `cmd` ou d'invite de commande.
  - Tapez `node -v` et `npm -v`. Ces commandes doivent afficher les versions de Node.js et npm installées, respectivement.

## Dépendances du projet

Ce projet nécessite les modules Node.js suivants :

- `https` : Fournit des fonctionnalités pour effectuer des requêtes HTTPS sécurisées.
- `url` : Offre des utilitaires pour parser et travailler avec les URL.
- `fs` : Permet des opérations sur le système de fichiers, telles que la lecture et l'écriture de fichiers.
- `ws` : Implémente un serveur WebSocket en utilisant la bibliothèque populaire `ws`.

## Installation des dépendances

1. **Navigation vers le répertoire du projet:**
  
  - Ouvrez une fenêtre de terminal ou d'invite de commande.
  - Utilisez la commande `cd` pour naviguer vers le répertoire racine de votre projet. C'est généralement là où se trouve le fichier `README.md`.
2. **Installation des dépendances:**
  
  - Exécutez la commande suivante dans votre terminal :
  
  Bash
  
  ```
  npm install https url fs ws
  ```
  
  Cette commande téléchargera et installera les modules requis à partir du registre npm et les stockera dans le répertoire `node_modules` de votre projet.
  

## Exécution du code

Une fois que vous avez terminé les étapes de configuration ci-dessus, vous devriez être en mesure d'exécuter le code en utilisant Node.js. Le mécanisme d'exécution spécifique peut varier en fonction de la structure de votre code. Voici deux scénarios courants :

**Scénario 1 : Fichier JavaScript unique (par exemple, `room.js`):**

1. Ouvrez un terminal dans le répertoire de votre projet.
  
2. Exécutez la commande :
  
  Bash
  
  ```
  node room.js
  ```
  
  Cela exécutera le code dans le fichier `room.js`.
