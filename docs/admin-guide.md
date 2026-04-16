# Guide Administrateur — Portail Admitta

> Guide d'utilisation du portail d'administration pour les agents d'admission d'Ignito Academy.

---

## Accès au portail

1. Rendez-vous sur [https://admissions.ignitoacademy.com/admin](https://admissions.ignitoacademy.com/admin)
2. Saisissez votre adresse e-mail et votre mot de passe
3. Cliquez sur **Se connecter**

> Si vous n'avez pas encore de compte, contactez le responsable système pour créer votre accès via le tableau de bord Supabase.

---

## Tableau de bord principal

Le tableau de bord affiche la liste de toutes les candidatures reçues. Vous pouvez :

- **Rechercher** par nom, prénom ou numéro de candidature (IGN-2026-XXXXX)
- **Filtrer** par statut de dossier, statut de paiement ou statut d'examen
- **Trier** par colonne en cliquant sur l'en-tête
- **Naviguer** entre les pages (25 candidatures par page)

### Statuts de dossier

| Statut | Signification |
|--------|---------------|
| Dossier créé | Le candidat a créé son compte et son dossier |
| Paiement effectué | Le paiement de 29 USD a été confirmé |
| Documents soumis | Le candidat a déposé tous ses documents |
| En cours d'examen | Le dossier est en cours d'évaluation |
| Admission sous réserve | Acceptation conditionnelle (documents à compléter) |
| Admission définitive | Acceptation définitive |
| Dossier refusé | Dossier rejeté |

---

## Consultation d'un dossier

1. Cliquez sur le nom ou le numéro de candidature dans la liste
2. La page de détail affiche :
   - **Informations personnelles** du candidat
   - **Statut du paiement** et référence de transaction
   - **Documents téléversés** avec prévisualisation PDF/image
   - **Dossier de bourse** (si soumis) : GPA, besoin financier, URL vidéo
   - **Historique des décisions** précédentes

---

## Prise de décision

### Demande de documents complémentaires

Si des documents sont manquants ou illisibles :

1. Dans le dossier du candidat, accédez à la section **Documents**
2. Cochez les documents à demander à nouveau
3. Cliquez sur **Demander les documents manquants**
4. Le candidat reçoit un e-mail avec les instructions

### Rendre une décision d'admission

Une fois le dossier complet et examiné :

1. Dans le dossier du candidat, accédez à la section **Décision**
2. Sélectionnez l'une des options :
   - **Admission sous réserve** — avec commentaire explicatif
   - **Admission définitive** — confirmation d'admission
   - **Dossier refusé** — avec motif de refus
3. Rédigez le **commentaire officiel** (il sera inclus dans la lettre PDF)
4. Cliquez sur **Enregistrer la décision**

> Le système génère automatiquement une **lettre PDF** et l'envoie par e-mail au candidat.

### Règles importantes

- Une décision **Admission définitive** est irréversible. Vérifiez le dossier attentivement.
- Tous les commentaires doivent être rédigés en **français formel et académique**.
- Ne jamais mentionner le nom de l'organisme partenaire original dans les communications — utilisez uniquement **"UK Level 3 Foundation Diploma"**.

---

## Gestion des bourses

Les candidatures à la bourse sont évaluées automatiquement par le système. Vous pouvez consulter :

- Le **pourcentage de bourse proposé** (0 %, 25 %, 50 %, 75 % ou 100 %)
- Les **critères remplis** (GPA, âge, besoin financier)
- Le **lien vers la vidéo de présentation** (YouTube ou Vimeo)

La décision de bourse est **indépendante** de la décision d'admission.

---

## Bonnes pratiques

- Examinez chaque dossier de manière **impartiale et objective**
- Utilisez la **langue française formelle** dans tous les commentaires
- Vérifiez l'**authenticité des documents** avant de rendre une décision définitive
- En cas de doute, utilisez **"Admission sous réserve"** plutôt qu'une décision définitive
- Déconnectez-vous toujours après votre session (`Se déconnecter` en haut à droite)

---

## Problèmes courants

**"La décision n'a pas été enregistrée"**
- Vérifiez votre connexion internet
- Assurez-vous que le commentaire est renseigné (champ obligatoire)
- Rechargez la page et réessayez

**"Le candidat n'a pas reçu sa lettre"**
- Vérifiez les journaux d'envoi dans Resend (resend.com/emails)
- Vérifiez que l'adresse e-mail du candidat est correcte dans son profil

**"Impossible de prévisualiser un document"**
- Le document peut être dans un format non supporté
- Essayez de télécharger le document directement

---

*Guide version 1.0 — Ignito Academy — Avril 2026*
