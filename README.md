# Projet Web Developpement Marketplace

Plateforme web de presentation d'articles inspiree d'un catalogue e-commerce.

## Stack installee

- Frontend : HTML, CSS, JavaScript.
- Backend : Node.js natif.
- Base de donnees locale : SQLite via `node:sqlite`.
- Base de donnees production : PostgreSQL via `DATABASE_URL`.
- Runtime : Node portable deja disponible dans `..\OPV\.tools\node-v24.18.0-win-x64`.
- Hebergement retenu : Render.
- Base distante retenue : Neon PostgreSQL.

## Lancer l'application

Double-cliquer sur :

`start_marketplace.cmd`

Ou lancer dans PowerShell :

```powershell
.\start_marketplace.ps1
```

Puis ouvrir :

`http://localhost:3000`

## Fonctionnalites

- catalogue produits avec images ;
- recherche par nom, marque, reference, description et tags ;
- filtres par categorie et prix ;
- tri par nouveaute, prix, note, stock et nom ;
- fiche detail article ;
- bouton Demo optionnel par produit avec lecteur video integre ;
- panier avec quantites modifiables ;
- creation de commande ;
- administration produit ;
- ajout, modification et suppression d'articles ;
- modification de l'image par URL dans l'administration ;
- choix d'une image locale depuis le PC, convertie et sauvegardee avec l'article ;
- ajout d'une URL de video demo ou d'une video locale dans l'administration ;
- ajout, modification et suppression des categories ;
- renommage d'une categorie avec mise a jour automatique des articles associes ;
- prix affiches en Ariary `Ar` ;
- statistiques simples ;
- base SQLite creee automatiquement dans `data\marketplace.db`.

## API principale

- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`
- `GET /api/categories`
- `POST /api/categories`
- `PUT /api/categories/:id`
- `DELETE /api/categories/:id`
- `POST /api/orders`
- `DELETE /api/orders/:id`
- `GET /api/admin/stats`

## Evolution possible

- authentification admin/client ;
- paiement en ligne ;
- gestion des livraisons ;
- avis clients ;
## Deploiement Render + Neon

1. Creer une base PostgreSQL gratuite sur Neon.
2. Copier la connection string Neon.
3. Sur Render, creer un Web Service.
4. Choisir ce depot et definir `Root Directory` sur `Projet_Web_Developpement`.
5. Build Command : `npm install`.
6. Start Command : `npm start`.
7. Ajouter les variables d'environnement :
   - `NODE_VERSION=24.18.0`
   - `DATABASE_URL=<connection string Neon>`
   - `PGSSL=require`
   - `ADMIN_PASSWORD=<mot de passe fort>`
8. Au premier demarrage, les tables et les articles demo sont crees automatiquement.

Le fichier `render.yaml` a ete ajoute a la racine du workspace pour un deploiement Render Blueprint.

En production, `ADMIN_PASSWORD` doit etre defini. Sinon l'administration restera ouverte.

## Evolution possible

- authentification admin/client ;
- paiement en ligne ;
- gestion des livraisons ;
- avis clients ;
- stockage image Cloudinary ou Supabase Storage ;
- nom de domaine.
