# GAME.md — Babel, chapitre 1

## Concept
Asher, jeune berger d'un village au bord de l'Euphrate, part à la recherche de son frère Yonah, emmené par les soldats de Nimrod pour bâtir une grande ville dans les plaines de Shinar. Il est accompagné de Tamar, guérisseuse, et d'Eber, vieux sage. Le chapitre se termine aux portes des plaines de Shinar.

Le jeu distingue clairement :
- **Écrit** : ce que dit la Genèse (10:8-10, 11:1-4), paraphrasé ou cité d'après Louis Segond 1910 ;
- **Légende du jeu** : les idées de l'article (Nimrod « gibbor » et géant, gardiens ailés, langue pure d'Adam), racontées par des personnages comme des rumeurs ou des méditations.

## Déroulement (20 à 30 minutes)
1. Village : Adah annonce l'enlèvement de Yonah.
2. Tamar, près du puits, demande 3 herbes de baume dans les roseaux de la berge (est). Rencontres : serpents, chacals, scorpions.
3. Tamar se joint à l'équipe. Eber, dans les champs (nord-ouest), explique ce qui est écrit et ce qui se raconte, puis se joint.
4. Le vieux Lavan laisse passer l'équipe complète dans le canyon. Deux patrouilles visibles, une source de soin.
5. Boss : Kish, contremaître de Nimrod (appelle des renforts, fouet, ordre cinglant). Pas de fuite.
6. Porte émaillée, écran « À suivre : les plaines de Shinar ».

## Contrôles
- Clavier : WASD / flèches pour marcher, E / Entrée / Espace pour parler et valider, Échap pour le menu ou revenir.
- Téléphone : joystick à gauche, bouton A à droite, ☰ en haut à droite. Toucher une boîte de dialogue la fait avancer.

## Systèmes
- Combat au tour par tour, ordre selon la vitesse : Attaquer, Magie, Objets, Défense, Fuir.
- Sorts : Asher Fronde (niv. 2) ; Tamar Soin (niv. 1), Baume (niv. 3) ; Eber Éclair (niv. 1), Tempête de sable (niv. 3).
- Objets : Dattes (35 PV), Eau de source (12 PM), Sel de réveil (relève un allié K.-O.). Marchand Ilan au village, 4 jarres cachées.
- XP complète pour chaque membre vivant, niveaux 1 à 10. Le puits et la source soignent toute l'équipe.
- Défaite : réveil au puits avec PV/PM pleins, 25 % du cuivre perdu, XP conservée.
- Menu : Équipe, Objets, Quête, Légendes, Options (qualité Auto/Haute/Moyenne/Basse/Minimale, plein écran, nouvelle partie).
- Sauvegarde automatique (`localStorage`, clé `babel.save`, version 1) : après chaque dialogue, combat, objet, toutes les 8 s et en quittant l'onglet.
- Qualité auto : baisse pixel ratio, ombres et densité du décor si le jeu passe sous ~48 FPS ; remonte prudemment.

## État
- Chapitre 1 complet et terminable (vérifié par une simulation Node sur 140 graines et un parcours navigateur headless).
- Non vérifié : vrai Samsung S20 (fluidité réelle, tactile physique), sons (aucun son pour l'instant).

## Prochaines idées
- Chapitre 2 : les plaines de Shinar et les caravanes.
- Musique et effets sonores (WebAudio, compositions originales).
- Animations d'attaque propres à chaque ennemi, statuts (poison du scorpion).
- Mode PWA hors ligne, portraits plus détaillés, carte du monde.
