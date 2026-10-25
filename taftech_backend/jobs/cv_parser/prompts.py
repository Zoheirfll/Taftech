"""Prompt Groq par défaut pour l'analyse complète d'un CV."""




# ==========================================
# 9. PARSING VIA OLLAMA (IA LOCALE)
# ==========================================
# === CONFIGURATION IA (Groq aujourd'hui, Ollama post-déploiement — voir jobs/ai_engine.py) ===
# Fournisseur/modèle/reasoning_effort lus dynamiquement depuis AIConfig (panel admin), plus de
# valeur figée dans le code.
PROMPT_CV_COMPLET = """Tu es un expert en analyse de CV. Voici le texte brut d'un CV.

Analyse-le et extrais TOUT ce qui suit en UN SEUL objet JSON strict (rien d'autre avant/après).

1. TITRE PROFESSIONNEL : la phrase courte juste sous le nom (ex: "INGÉNIEUR LOGICIEL"). Si absent : null.

2. EXPÉRIENCES PROFESSIONNELLES (emplois, stages rémunérés — PAS les formations/diplômes/études) :
⚠️ NE METS JAMAIS DE FORMATIONS, DIPLÔMES OU ÉTUDES DEDANS ("Licence en...", "Master en...", "Bac", "Étudiant en...", cours, certifications, écoles où la personne n'a pas travaillé).
Les VRAIES expériences sont des EMPLOIS (Caissier, Ingénieur, Développeur, Stage en entreprise...).
- Pour chaque expérience : titre_poste, entreprise, date_debut_raw, date_fin_raw, description.
- Si poste actuel (pas de date de fin) : date_fin_raw = "Aujourd'hui" — UNIQUEMENT si le mot "Aujourd'hui"/"Présent"/"En cours" apparaît réellement dans le texte à côté de CETTE expérience précise. N'attribue JAMAIS "Aujourd'hui" par déduction ou par proximité avec une autre expérience.
- ⚠️ COMPTE le nombre d'occurrences du mot "Aujourd'hui"/"Présent"/"En cours" dans tout le texte AVANT de commencer : n'attribue ce statut qu'à EXACTEMENT ce nombre d'expériences, jamais plus. S'il n'apparaît qu'une seule fois dans tout le CV, une seule expérience (généralement la première/la plus récente) a le droit à date_fin_raw = "Aujourd'hui" — toutes les autres expériences doivent avoir une vraie date de fin extraite du texte, ou "" si aucune date ne leur est associée. Ne recopie jamais ce statut d'une expérience à la suivante.
- ⚠️ CV 2 colonnes : une date peut être sur sa propre ligne juste AVANT le titre (= date_debut de CETTE expérience) ou juste APRÈS titre/entreprise (= date_fin), ou collée en fin de ligne ("N8N Novembre 2025", "Oran Octobre 2025") — extrais-la et RETIRE-la de titre_poste/entreprise. Une seule date isolée trouvée pour une expérience → date_debut_raw = cette date, date_fin_raw = "" (jamais recopiée identique, jamais "Aujourd'hui" par défaut). Si le nombre de dates dans le bloc ne se répartit pas proprement à 2 par expérience, ne force jamais une date/un statut d'une expérience vers une autre — laisse vide plutôt que de deviner.
- Si info manquante : "" (chaîne vide), jamais null.
- Pour "description" : NE FUSIONNE PAS les points/missions en un paragraphe. Garde chaque point sur sa propre ligne, préfixé par "- ", séparés par \n. Ne reformule pas, reste proche du texte original.
- Le métier précis de chaque expérience est classé séparément après cette extraction (agent dédié, référentiel v2) — n'extrais pas de champ "secteur" ici.
- Si aucune expérience : tableau vide [].

3. FORMATIONS ET DIPLÔMES (Master, Licence, Bac, certifications, cours suivis — PAS les emplois) :
⚠️ NE METS JAMAIS D'EMPLOIS DEDANS (postes occupés, stages en entreprise sauf stage académique avec école).
- Pour chaque formation : diplome, etablissement, date_debut_raw, date_fin_raw, description.
- Mêmes règles de "" et de description (points sur lignes séparées, préfixés "- ") que ci-dessus.
- ⚠️ CV 2 colonnes : comme pour les expériences, la date/plage d'une formation peut être sur sa propre ligne juste AVANT le titre du diplôme, ou collée en fin de ligne du titre — cherche-la à ces deux endroits avant de conclure qu'elle est absente.
- ⚠️ Si tu trouves une plage "AAAA - AAAA" / "AAAA-AAAA" (deux années séparées par un tiret) associée à une formation : date_debut_raw = la première année, date_fin_raw = la seconde année — ne garde JAMAIS une seule des deux quand les deux sont présentes dans le texte.
- ⚠️ Une seule date isolée trouvée pour une formation (pas de plage à deux années) = l'année d'OBTENTION du diplôme → date_fin_raw = cette date, date_debut_raw = "". Ne recopie JAMAIS la même date sur date_debut_raw ET date_fin_raw.
- N'écris "Présent"/"En cours"/"Aujourd'hui" comme date_fin_raw QUE si la formation est explicitement en cours (CV indique "en cours", "actuellement", année future). Une formation avec une seule date passée est TERMINÉE — n'invente jamais une date de fin ouverte pour elle.

4. INFOS PERSONNELLES :
- nom_complet : nom + prénom du candidat (ex: "FILALI Zoheir"), PAS son titre professionnel. Si absent : null.
- telephone : UN SEUL numéro de téléphone (le principal/premier trouvé), tous les chiffres, format brut. Ne colle JAMAIS deux numéros ensemble. Si absent : null.
- email : l'adresse email du candidat si présente dans le texte. Sinon null.
- competences : les compétences que le CV CITE EXPLICITEMENT (langages, outils, logiciels, méthodes, savoir-faire techniques ; peu de soft skills), séparées par virgules, 15 AU PLUS (les plus importantes). Chaque compétence est un INTITULÉ COURT (1 à 3 mots, ex: "Python", "Kaizen") tel qu'il est écrit dans le CV — comme une étiquette — JAMAIS une phrase complète copiée d'une expérience professionnelle.
  ⚠️ Chaque compétence doit se retrouver DANS LE TEXTE DU CV. N'ajoute JAMAIS une compétence parce qu'elle est courante pour ce métier, ni parce qu'elle figure dans un exemple de cette consigne : les exemples ne montrent que la FORME attendue.
  ⚠️ EXCLUS SYSTÉMATIQUEMENT de "competences" : les montants ("30 M$", "50 000 DA"), les pourcentages ("50 %"), les dates ou plages d'années ("2019-2023"), les effectifs ("500 employés"), les chiffres isolés ("400", "30"), les phrases complètes, et toute mission/description d'expérience recopiée telle quelle. Ce sont des données d'expérience, jamais des compétences.
  ⚠️ Un mot générique isolé (« coûts », « délais », « risques », « flux », « reporting », « qualité ») n'est PAS une compétence. Une liste de thèmes ou de missions placée sous un titre de domaine (« Gestion de projets : coordination, risques, coûts, délais ») ne se découpe JAMAIS en mots isolés : garde au plus le titre du domaine s'il est court.
  SI LE CV A UNE SECTION DÉDIÉE (« Compétences », « Compétences clés », « Informatique », « Outils »…) : prends UNE compétence PAR LIGNE/puce de cette section, telle qu'écrite (garde un « & » à l'intérieur d'une ligne : « Relations sociales & dialogue syndical » = UNE seule compétence). Ajoute les outils/logiciels cités (ex: « Excel avancé », « Navision », « HR Access », « Word ») comme compétences séparées. Une ligne longue qui décrit un projet (plus de 8 mots) se résume en un intitulé court. N'AJOUTE AUCUNE compétence déduite des expériences professionnelles quand cette section existe.
  SEULEMENT SI le CV n'a aucune section de compétences : reprends 5 à 10 intitulés courts, avec les mots du CV, à partir des outils, méthodes et savoir-faire cités dans les missions (jamais la phrase recopiée, jamais un mot absent du CV).
  Ne mets pas de virgule à l'intérieur d'un intitulé (la virgule sépare les compétences).
  Si absent : null.
- competences_niveaux : pour CHAQUE compétence listée ci-dessus, estime un niveau de maîtrise d'après le contexte du CV (ancienneté, nombre de mentions, poste occupé, mots comme "maîtrise"/"notions"/"expert"). Format "Compétence:Niveau" séparés par virgules, niveau parmi EXACTEMENT : "Débutant", "Intermédiaire", "Avancé", "Confirmé". Ne mets "Confirmé" que si le CV le justifie clairement (plusieurs années sur ce sujet, mention explicite « expert »/« maîtrise ») ; pour une simple liste de compétences sans précision : "Intermédiaire". Si absent : null.
- langues : format "Langue:Niveau" (ex: "Arabe:Maternelle, Anglais:Avancé"). Si pas de niveau précisé : "Débutant". Si absent : null.
- linkedin : URL complète du profil LinkedIn si présente. Sinon null.
- github : URL complète du profil GitHub si présente. Sinon null.
- bio : TOUJOURS rédiger un résumé professionnel du profil en 2 phrases maximum, à la troisième personne implicite (sans « je » inventé), basé sur ses expériences ou, à défaut (étudiant, jeune diplômé, stagiaire), sur sa formation et ses compétences. N'invente aucun fait absent du CV. null SEULEMENT si le CV ne contient quasiment aucune information exploitable.
- wilaya : le nom de la wilaya/ville algérienne de résidence du candidat, tel qu'écrit dans le CV (ex: "Oran", "Alger"). Si non mentionnée : null.
- adresse : l'adresse postale complète du candidat si explicitement écrite dans le CV (rue, quartier, ville — ex: "Cité 100 Logements, Bt 12, El Kerma, Oran"), telle qu'écrite. Ne recopie jamais juste la wilaya seule ici (déjà capturée par le champ wilaya). Si absente : null.
- diplome : le libellé exact du diplôme le PLUS ÉLEVÉ obtenu par le candidat, tel qu'écrit dans le CV (ex: "Master 2 en Informatique", "Licence"). Si non déductible : null.
- service_militaire : uniquement si explicitement mentionné dans le CV, un des mots suivants : "non concerné", "dégagé", "sursitaire", "inapte", "incorporé". Sinon null.
- sexe : déduis "HOMME" ou "FEMME" si le prénom, les accords grammaticaux (ex: "née le", "marié"/"mariée", "responsable" au féminin) ou une mention explicite le permettent clairement. Si vraiment ambigu ou non déductible : null.
- date_naissance : la date de naissance du candidat si mentionnée (ex: "Né(e) le 12/03/1990", "12 mars 1990"), écrite EXACTEMENT comme dans le CV. Sinon null.
- situation_actuelle : uniquement si déductible du CV, un des mots suivants : "en poste" (a un emploi actuel, sans date de fin), "en recherche active" (mentionne explicitement chercher un emploi/disponible immédiatement), "à l'écoute du marché", "étudiant" (formation en cours sans expérience professionnelle significative). Sinon null — ne devine jamais si ambigu.
- mobilite : uniquement si le CV mentionne explicitement une disponibilité géographique, un des mots suivants : "locale" (une seule wilaya), "régionale", "nationale" (toute l'Algérie), "internationale". Sinon null.
- salaire_souhaite : uniquement si un montant de salaire souhaité/attendu est explicitement écrit dans le CV (rare). Sinon null — n'invente jamais un montant.
- permis_conduire : true si le CV mentionne un permis de conduire, sinon false.
- passeport_valide : true si le CV mentionne un passeport valide, sinon false.
- vehicule_personnel : true si le CV mentionne un véhicule personnel/véhiculé, sinon false.

FORMAT EXIGÉ (JSON strict, un seul objet) :
{
  "titre_professionnel": "string ou null",
  "experiences": [
    {"titre_poste": "string", "entreprise": "string", "date_debut_raw": "string", "date_fin_raw": "string", "description": "string"}
  ],
  "formations": [
    {"diplome": "string", "etablissement": "string", "date_debut_raw": "string", "date_fin_raw": "string", "description": "string"}
  ],
  "nom_complet": "string ou null",
  "telephone": "string ou null",
  "email": "string ou null",
  "competences": "string ou null",
  "competences_niveaux": "string ou null",
  "langues": "string ou null",
  "linkedin": "string ou null",
  "github": "string ou null",
  "bio": "string ou null",
  "wilaya": "string ou null",
  "adresse": "string ou null",
  "diplome": "string ou null",
  "service_militaire": "string ou null",
  "sexe": "HOMME ou FEMME ou null",
  "date_naissance_raw": "string ou null",
  "situation_actuelle": "string ou null",
  "mobilite": "string ou null",
  "salaire_souhaite": "string ou null",
  "permis_conduire": false,
  "passeport_valide": false,
  "vehicule_personnel": false
}

CV À ANALYSER :
---
{cv_text}
---

RÉPONDS UNIQUEMENT AVEC L'OBJET JSON :
"""
