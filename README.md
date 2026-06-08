# Bank Vault

Bank Vault est une application de finances personnelles desktop pensée pour suivre ses comptes, ses transactions, ses budgets et ses échéances dans une interface claire, rapide et rassurante. L'application s'appuie sur Tauri pour livrer un binaire léger et multiplateforme à partir d'une base React + TypeScript.

## Pourquoi Bank Vault

Bank Vault vise un usage simple au quotidien : comprendre où va l'argent, anticiper les sorties à venir et garder une vision nette du mois sans tableur dispersé ni interface bancaire limitée. L'approche desktop de Tauri permet de distribuer l'outil sur macOS, Windows et Linux avec une base de code unique.

## Fonctionnalités

### Comptes

- Gestion de plusieurs comptes avec soldes d'ouverture.
- Lecture immédiate des indicateurs **Actuel**, **Prévision** et **À venir** pour chaque compte.
- Sélection rapide d'un compte pour naviguer dans les données associées.

### Transactions

- Suivi des opérations passées et à venir.
- Distinction entre transactions pointées et non pointées pour séparer le réel du prévisionnel.
- Import d'un fichier TSV par compte pour accélérer l'alimentation des données.

### Échéances

- Gestion d'échéances mensuelles, trimestrielles ou annuelles.
- Calcul automatique des occurrences du mois.
- Statuts visuels pour identifier les échéances à venir, payées ou en retard.
- Action rapide pour marquer une échéance comme payée puis annuler ce paiement si nécessaire.

### Budgets

- Budgets annuels mensualisés pour garder une lecture concrète mois par mois.
- Vue lisible pour comparer objectif, consommé et restant.
- Base adaptée à un pilotage personnel simple plutôt qu'à une comptabilité complexe.

### Expérience produit

- Interface dark moderne avec cartes arrondies, tableaux lisibles, headers sticky et modales.
- Application desktop locale, orientée vitesse et lisibilité.
- Base technique moderne en React, TypeScript et Tauri, adaptée à une évolution produit continue.

## Cas d'usage

Bank Vault est utile pour centraliser la gestion personnelle quand plusieurs flux coexistent : dépenses courantes, abonnements, échéances fixes, prévisions de mois et budgets par catégorie. L'application aide à répondre vite à trois questions simples : combien il reste réellement, combien il restera à la fin du mois et quelles sorties arrivent bientôt.

## Positionnement

Bank Vault se place entre le tableur maison et l'outil bancaire figé. Le projet combine la souplesse d'un outil personnel avec une vraie UX desktop, tout en reposant sur une stack Tauri conçue pour produire des applications natives légères.

## Stack technique

| Couche | Choix |
|---|---|
| Front-end | React + TypeScript |
| Desktop shell | Tauri |
| Distribution | Builds natifs via GitHub Actions et Tauri Action |
| Cible | macOS, Windows, Linux |

## Points forts

- Vision claire du réel et du prévisionnel.
- Gestion intégrée des échéances récurrentes.
- UX desktop moderne et rapide.
- Socle technique léger grâce à Tauri, qui met en avant la distribution multiplateforme depuis une base commune.

## Promesse

Bank Vault aide à piloter ses finances personnelles avec plus de clarté, moins de friction et une meilleure anticipation. L'outil est conçu pour rester sobre, lisible et utile au quotidien, avec un angle produit centré sur le suivi opérationnel plutôt que sur la complexité comptable.