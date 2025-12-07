\# Kimai Timer – Extension Chrome



Petite extension Chrome pour lancer rapidement un suivi de temps dans \*\*Kimai\*\* à partir de l’onglet courant (façon Clockify, mais self-hosted 😎).



L’extension :



\- récupère \*\*l’URL\*\* et le \*\*titre\*\* de l’onglet actif ;

\- les transmet à votre instance Kimai (via paramètres d’URL, ex. `?source=` et `\&title=`) ;

\- ouvre votre Kimai dans la popup de l’extension pour créer ou gérer vos entrées de temps plus vite.



> ⚠️ Cette extension n’est pas publiée sur le Chrome Web Store.  

> Elle s’installe en \*\*mode développeur\*\* à partir de ce dépôt.



---



\## 🚀 Fonctionnalités



\- Bouton dans la barre d’outils Chrome.

\- Récupération automatique :

&nbsp; - du \*\*titre\*\* de l’onglet,

&nbsp; - de l’\*\*URL\*\* de l’onglet.

\- Envoi de ces infos à votre instance Kimai (par URL) pour :

&nbsp; - préremplir la description / source,

&nbsp; - gagner du temps sur la création des fiches.



Le fonctionnement exact côté Kimai (comment sont exploités `source`, `title`, etc.) peut être adapté selon votre configuration et/ou plugin côté serveur.



---



\## 📦 Contenu du dépôt



Structure typique :



```text

.

├─ manifest.json

├─ html/

│  ├─ popup.html

│  └─ options.html

├─ js/

│  ├─ popup.js

│  └─ inject.js

└─ icons/

&nbsp;  ├─ icon16.png

&nbsp;  ├─ icon48.png

&nbsp;  └─ icon128.png



