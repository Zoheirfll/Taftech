# Backfill des prompts par défaut dans AIConfig — texte dupliqué en dur (pas d'import de
# jobs.views.ia / jobs.cv_parser) volontairement : une migration doit rester un instantané figé,
# indépendant de toute évolution future du code applicatif (voir DEFAULT_PROMPT_* dans
# jobs/views/ia.py et PROMPT_CV_COMPLET dans jobs/cv_parser.py pour les versions "vivantes").
from django.db import migrations

PROMPT_CV_COMPLET = """Tu es un expert en analyse de CV. Voici le texte brut d'un CV.

Analyse-le et extrais TOUT ce qui suit en UN SEUL objet JSON strict (rien d'autre avant/après).

1. TITRE PROFESSIONNEL : la phrase courte juste sous le nom (ex: "INGÉNIEUR LOGICIEL"). Si absent : null.

2. EXPÉRIENCES PROFESSIONNELLES (emplois, stages rémunérés — PAS les formations/diplômes/études) :
⚠️ NE METS JAMAIS DE FORMATIONS, DIPLÔMES OU ÉTUDES DEDANS ("Licence en...", "Master en...", "Bac", "Étudiant en...", cours, certifications, écoles où la personne n'a pas travaillé).
Les VRAIES expériences sont des EMPLOIS (Caissier, Ingénieur, Développeur, Stage en entreprise...).
- Pour chaque expérience : titre_poste, entreprise, date_debut_raw, date_fin_raw, description, secteur.
- Si poste actuel (pas de date de fin) : date_fin_raw = "Aujourd'hui". Garde les dates dans le format brut du CV.
- Si info manquante : "" (chaîne vide), jamais null.
- Pour "description" : NE FUSIONNE PAS les points/missions en un paragraphe. Garde chaque point sur sa propre ligne, préfixé par "- ", séparés par \n. Ne reformule pas, reste proche du texte original.
- Pour "secteur" : choisis le CODE le plus pertinent dans cette liste de domaines d'activité officiels.
⚠️ Base-toi sur le MÉTIER/LA FONCTION réellement exercée par le candidat (titre_poste + missions), PAS sur le secteur d'activité de l'entreprise employeuse. Un développeur web chez un fabricant de véhicules reste dans le domaine informatique, pas "Production industrielle" ; un comptable dans une clinique reste en comptabilité/finance, pas en santé.
{domaines_list}
Si vraiment aucun ne correspond : "".
- Si aucune expérience : tableau vide [].

3. FORMATIONS ET DIPLÔMES (Master, Licence, Bac, certifications, cours suivis — PAS les emplois) :
⚠️ NE METS JAMAIS D'EMPLOIS DEDANS (postes occupés, stages en entreprise sauf stage académique avec école).
- Pour chaque formation : diplome, etablissement, date_debut_raw, date_fin_raw, description.
- Mêmes règles de "" et de description (points sur lignes séparées, préfixés "- ") que ci-dessus.

4. INFOS PERSONNELLES :
- nom_complet : nom + prénom du candidat (ex: "FILALI Zoheir"), PAS son titre professionnel. Si absent : null.
- telephone : tous les chiffres, format brut. Si absent : null.
- competences : TOUTES les compétences techniques (langages, outils, logiciels, soft skills), séparées par virgules. Si absent : null.
- langues : format "Langue:Niveau" (ex: "Arabe:Maternelle, Anglais:Avancé"). Si pas de niveau précisé : "Intermédiaire". Si absent : null.
- linkedin : URL complète du profil LinkedIn si présente. Sinon null.
- github : URL complète du profil GitHub si présente. Sinon null.
- bio : résumé percutant et professionnel du profil en 2 phrases maximum basé sur ses expériences. Sinon null.

FORMAT EXIGÉ (JSON strict, un seul objet) :
{
  "titre_professionnel": "string ou null",
  "experiences": [
    {"titre_poste": "string", "entreprise": "string", "date_debut_raw": "string", "date_fin_raw": "string", "description": "string", "secteur": "code ou vide"}
  ],
  "formations": [
    {"diplome": "string", "etablissement": "string", "date_debut_raw": "string", "date_fin_raw": "string", "description": "string"}
  ],
  "nom_complet": "string ou null",
  "telephone": "string ou null",
  "competences": "string ou null",
  "langues": "string ou null",
  "linkedin": "string ou null",
  "github": "string ou null",
  "bio": "string ou null"
}

CV À ANALYSER :
---
{cv_text}
---

RÉPONDS UNIQUEMENT AVEC L'OBJET JSON :
"""

DEFAULT_PROMPT_ANALYSE_CARRIERE = (
    'Tu es un conseiller carrière expert du marché algérien. '
    'Analyse ce profil de façon STRICTEMENT PERSONNALISÉE : base-toi précisément sur son titre, '
    'ses compétences, ses expériences et ses formations réels. '
    'Interdiction absolue de conseils génériques valables pour n\'importe quel profil — '
    'chaque section doit citer des éléments concrets tirés du profil analysé. '
    'Réponds UNIQUEMENT en français avec EXACTEMENT ces 5 sections : '
    '\n###MÉTIERS POSSIBLES###\n'
    '(3 à 5 métiers précis auxquels CE profil peut prétendre dès maintenant, cohérents avec son titre/ses compétences réels)'
    '\n###POINTS FORTS###\n'
    '(atouts concrets de ce profil, en t\'appuyant sur ses expériences, diplômes et compétences listés)'
    '\n###COMPÉTENCES MANQUANTES###\n'
    '(compétences précises qui lui manquent pour progresser dans SON métier, pas des généralités)'
    '\n###FORMATIONS RECOMMANDÉES###\n'
    '(formations ou certifications concrètes et reconnues, en lien direct avec les compétences manquantes identifiées)'
    '\n###ÉVOLUTION PROFESSIONNELLE###\n'
    '(2 à 3 pistes d\'évolution réalistes à moyen terme dans SON secteur, à partir de SA situation actuelle)'
    '\nPas de markdown, texte simple, phrases courtes et concrètes, jamais de généralités.'
)

DEFAULT_PROMPT_ANALYSE_RECRUTEUR = """Tu es un expert RH algérien. Analyse la compatibilité entre ce candidat et cette offre.
OFFRE : {offre_titre} | {entreprise} | {specialite} | {type_contrat} | {offre_wilaya}
CANDIDAT : {nom_candidat} | {titre_candidat} | {diplome} | {wilaya_candidat}
Compétences : {competences}
Expériences : {experiences}
Formations : {formations}
Score IA : {score}%

Réponds avec EXACTEMENT ces 3 sections :
###VERDICT###
###POINTS FORTS###
###RECOMMANDATION###
Pas de markdown, maximum 150 mots."""

DEFAULT_PROMPT_GENERATION_OFFRE = """Tu es un expert RH algérien. Génère le contenu d'une offre d'emploi professionnelle en français pour le marché algérien.

Poste : {titre}
Spécialité / Secteur : {specialite}
Diplôme requis : {diplome}
Expérience : {experience}
Type de contrat : {contrat}
Wilaya : {wilaya}

Pour les questions d'entretien, choisis le type le plus adapté à chaque question parmi : COURT (réponse texte courte), LONG (réponse texte développée), NUMERIQUE (un nombre, ex: années d'expérience), CHOIX_UNIQUE (QCM une seule bonne réponse), CHOIX_MULTIPLE (QCM plusieurs réponses possibles). Pour CHOIX_UNIQUE/CHOIX_MULTIPLE, fournis 3 à 5 options de réponse plausibles et réalistes pour ce poste précis (pas des options génériques "Oui/Non" sauf si vraiment pertinent).

Génère EXACTEMENT ce format JSON (sans markdown, sans explication) :
{
  "description": "2-3 phrases présentant le contexte de ce poste et de l'entreprise.",
  "missions": "Liste de 4 à 6 missions concrètes, une par ligne, commençant par un tiret.",
  "profil_recherche": "Liste de 4 à 5 exigences du profil (formation, savoir-être), une par ligne, commençant par un tiret.",
  "competences": "Liste de 5 à 8 compétences techniques/outils concrets attendus pour ce poste précis, une par ligne, commençant par un tiret.",
  "questions_entretien": [
    {"texte": "Texte de la question", "type_question": "COURT|LONG|NUMERIQUE|CHOIX_UNIQUE|CHOIX_MULTIPLE", "choix": ["option 1", "option 2", "..."] }
  ]
}
Le champ "choix" ne doit contenir des valeurs que si type_question est CHOIX_UNIQUE ou CHOIX_MULTIPLE, sinon un tableau vide. Génère 4 à 6 questions au total, en variant les types (pas uniquement du texte libre)."""


def backfill(apps, schema_editor):
    AIConfig = apps.get_model('jobs', 'AIConfig')
    AIConfig.objects.filter(parser_cv_prompt='').update(parser_cv_prompt=PROMPT_CV_COMPLET)
    AIConfig.objects.filter(analyse_carriere_prompt='').update(analyse_carriere_prompt=DEFAULT_PROMPT_ANALYSE_CARRIERE)
    AIConfig.objects.filter(analyse_recruteur_prompt='').update(analyse_recruteur_prompt=DEFAULT_PROMPT_ANALYSE_RECRUTEUR)
    AIConfig.objects.filter(generation_offre_prompt='').update(generation_offre_prompt=DEFAULT_PROMPT_GENERATION_OFFRE)


def inverser(apps, schema_editor):
    AIConfig = apps.get_model('jobs', 'AIConfig')
    AIConfig.objects.update(
        parser_cv_prompt='', analyse_carriere_prompt='',
        analyse_recruteur_prompt='', generation_offre_prompt='',
    )


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0074_aiconfig_analyse_carriere_prompt_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill, inverser),
    ]
