# ==========================================
# 1. LES LISTES STANDARDISÉES (Constantes)
# ==========================================

WILAYAS_CHOICES = [
    ('01 - Adrar', '01 - Adrar'), ('02 - Chlef', '02 - Chlef'), ('03 - Laghouat', '03 - Laghouat'),
    ('04 - Oum El Bouaghi', '04 - Oum El Bouaghi'), ('05 - Batna', '05 - Batna'), ('06 - Béjaïa', '06 - Béjaïa'),
    ('07 - Biskra', '07 - Biskra'), ('08 - Béchar', '08 - Béchar'), ('09 - Blida', '09 - Blida'),
    ('10 - Bouira', '10 - Bouira'), ('11 - Tamanrasset', '11 - Tamanrasset'), ('12 - Tébessa', '12 - Tébessa'),
    ('13 - Tlemcen', '13 - Tlemcen'), ('14 - Tiaret', '14 - Tiaret'), ('15 - Tizi Ouzou', '15 - Tizi Ouzou'),
    ('16 - Alger', '16 - Alger'), ('17 - Djelfa', '17 - Djelfa'), ('18 - Jijel', '18 - Jijel'),
    ('19 - Sétif', '19 - Sétif'), ('20 - Saïda', '20 - Saïda'), ('21 - Skikda', '21 - Skikda'),
    ('22 - Sidi Bel Abbès', '22 - Sidi Bel Abbès'), ('23 - Annaba', '23 - Annaba'), ('24 - Guelma', '24 - Guelma'),
    ('25 - Constantine', '25 - Constantine'), ('26 - Médéa', '26 - Médéa'), ('27 - Mostaganem', '27 - Mostaganem'),
    ('28 - M\'Sila', '28 - M\'Sila'), ('29 - Mascara', '29 - Mascara'), ('30 - Ouargla', '30 - Ouargla'),
    ('31 - Oran', '31 - Oran'), ('32 - El Bayadh', '32 - El Bayadh'), ('33 - Illizi', '33 - Illizi'),
    ('34 - Bordj Bou Arréridj', '34 - Bordj Bou Arréridj'), ('35 - Boumerdès', '35 - Boumerdès'), 
    ('36 - El Tarf', '36 - El Tarf'), ('37 - Tindouf', '37 - Tindouf'), ('38 - Tissemsilt', '38 - Tissemsilt'),
    ('39 - El Oued', '39 - El Oued'), ('40 - Khenchela', '40 - Khenchela'), ('41 - Souk Ahras', '41 - Souk Ahras'),
    ('42 - Tipaza', '42 - Tipaza'), ('43 - Mila', '43 - Mila'), ('44 - Aïn Defla', '44 - Aïn Defla'),
    ('45 - Naâma', '45 - Naâma'), ('46 - Aïn Témouchent', '46 - Aïn Témouchent'), ('47 - Ghardaïa', '47 - Ghardaïa'),
    ('48 - Relizane', '48 - Relizane'), ('49 - Timimoun', '49 - Timimoun'), ('50 - Bordj Badji Mokhtar', '50 - Bordj Badji Mokhtar'),
    ('51 - Ouled Djellal', '51 - Ouled Djellal'), ('52 - Béni Abbès', '52 - Béni Abbès'), ('53 - In Salah', '53 - In Salah'),
    ('54 - In Guezzam', '54 - In Guezzam'), ('55 - Touggourt', '55 - Touggourt'), ('56 - Djanet', '56 - Djanet'),
    ('57 - El M\'Ghair', '57 - El M\'Ghair'), ('58 - El Meniaa', '58 - El Meniaa'),
]

# Nomenclature officielle ANEM (Agence Nationale de l'Emploi, Algérie) — niveau Secteur.
# Source : fichier NAME.xlsx fourni par l'ANEM. Le code Django est la lettre préfixe
# (ex: 'A' pour "A-AGRICULTURE ET PÊCHE"). Voir jobs/models.py (Secteur/Domaine/SousDomaine)
# pour la hiérarchie complète — ces 16 valeurs ne servent qu'au niveau le plus large
# (secteur d'activité entreprise, page "Par secteur"). Le matching et la recherche fine
# se font au niveau Domaine (voir MetierReferentiel).
SECTEURS_CHOICES = [
    ('A', 'Agriculture et pêche'),
    ('B', 'Énergie, extraction et hydrocarbure'),
    ('C', 'Industrie'),
    ('D', 'Installation, maintenance et propreté'),
    ('E', "Artisanat d'art"),
    ('F', 'Bâtiment et travaux publics'),
    ('G', 'Commerce'),
    ('H', 'Hôtellerie, restauration et tourisme'),
    ('I', 'Transport et logistique'),
    ('J', 'Communication, média et multimédia'),
    ('K', 'Banque, assurances et immobilier'),
    ('L', "Support à l'entreprise"),
    ('M', 'Santé'),
    ('N', 'Spectacle'),
    ('O', 'Formation, enseignement et recherche scientifique'),
    ('P', 'Services à la personne et à la collectivité'),
]

DIPLOMES_CHOICES = [
    ('NIVEAU_SECONDAIRE', 'Niveau Secondaire'),
    ('NIVEAU_TERMINAL', 'Niveau Terminal'),
    ('BACCALAUREAT', 'Baccalauréat'),
    ('TS', 'TS Bac +2'),
    ('LICENCE', 'Licence (LMD), Bac + 3'),
    ('MASTER_1', 'Master 1, Licence Bac + 4'),
    ('MASTER_2', 'Master 2, Ingéniorat, Bac + 5'),
    ('MAGISTERE', 'Magistère Bac + 7'),
    ('DOCTORAT', 'Doctorat'),
    ('NON_DIPLOMANTE', 'Non Diplômante'),
    ('FORMATION_PRO', 'Formation Professionnelle'),
    ('UNIVERSITAIRE_SANS_DIPLOME', 'Universitaire Sans Diplôme'),
    ('CERTIFICATION', 'Certification'),
]

NIVEAUX_EXPERIENCE = [
    ('DEBUTANT', 'Débutant / Junior'),
    ('JEUNE_DIPLOME', 'Jeune Diplômé'),
    ('STAGIAIRE', 'Stagiaire / Etudiant'),
    ('CONFIRME', 'Confirmé / Expérimenté'),
    ('MANAGER', 'Manager / Responsable Département'),
    ('RESPONSABLE_EQUIPE', 'Responsable d\'Équipe'),
    ('CADRE_DIRIGEANT', 'Cadre Dirigeant'),
]

TYPES_CONTRAT = [
    ('CDI', 'CDI'),
    ('CDD', 'CDD'),
    ('ANEM', 'Contrat ANEM (CTA / DAIP)'),
    ('STAGE', 'Stage / PFE'),
    ('FREELANCE', 'Freelance'),
    ('TEMPS_PARTIEL', 'Temps Partiel'),
]
TAILLES_ENTREPRISE_CHOICES = [
    ('TPE', '1 à 10 employés'),
    ('PE', '11 à 50 employés'),
    ('ME', '51 à 200 employés'),
    ('GE', '201 à 500 employés'),
    ('TGE', 'Plus de 500 employés'),
]

# ==========================================
# CONSTANTES DE MAPPING (alignées sur vos choices Django)
# ==========================================

# Wilayas algériennes pour détection
WILAYAS_LIST = [
    'Adrar', 'Chlef', 'Laghouat', 'Oum El Bouaghi', 'Batna', 'Béjaïa', 'Bejaia',
    'Biskra', 'Béchar', 'Bechar', 'Blida', 'Bouira', 'Tamanrasset', 'Tébessa', 'Tebessa',
    'Tlemcen', 'Tiaret', 'Tizi Ouzou', 'Alger', 'Djelfa', 'Jijel', 'Sétif', 'Setif',
    'Saïda', 'Saida', 'Skikda', 'Sidi Bel Abbès', 'Sidi Bel Abbes', 'Annaba', 'Guelma',
    'Constantine', 'Médéa', 'Medea', 'Mostaganem', "M'Sila", 'Msila', 'Mascara',
    'Ouargla', 'Oran', 'El Bayadh', 'Illizi', 'Bordj Bou Arréridj', 'Boumerdès', 'Boumerdes',
    'El Tarf', 'Tindouf', 'Tissemsilt', 'El Oued', 'Khenchela', 'Souk Ahras',
    'Tipaza', 'Mila', 'Aïn Defla', 'Ain Defla', 'Naâma', 'Naama',
    'Aïn Témouchent', 'Ain Temouchent', 'Ghardaïa', 'Ghardaia', 'Relizane',
]

# Mapping Wilaya -> code Django (ex: "Oran" -> "31 - Oran")
WILAYAS_MAPPING = {
    'adrar': '01 - Adrar', 'chlef': '02 - Chlef', 'laghouat': '03 - Laghouat',
    'oum el bouaghi': '04 - Oum El Bouaghi', 'batna': '05 - Batna',
    'béjaïa': '06 - Béjaïa', 'bejaia': '06 - Béjaïa',
    'biskra': '07 - Biskra', 'béchar': '08 - Béchar', 'bechar': '08 - Béchar',
    'blida': '09 - Blida', 'bouira': '10 - Bouira', 'tamanrasset': '11 - Tamanrasset',
    'tébessa': '12 - Tébessa', 'tebessa': '12 - Tébessa',
    'tlemcen': '13 - Tlemcen', 'tiaret': '14 - Tiaret', 'tizi ouzou': '15 - Tizi Ouzou',
    'alger': '16 - Alger', 'djelfa': '17 - Djelfa', 'jijel': '18 - Jijel',
    'sétif': '19 - Sétif', 'setif': '19 - Sétif',
    'saïda': '20 - Saïda', 'saida': '20 - Saïda', 'skikda': '21 - Skikda',
    'sidi bel abbès': '22 - Sidi Bel Abbès', 'sidi bel abbes': '22 - Sidi Bel Abbès',
    'annaba': '23 - Annaba', 'guelma': '24 - Guelma', 'constantine': '25 - Constantine',
    'médéa': '26 - Médéa', 'medea': '26 - Médéa', 'mostaganem': '27 - Mostaganem',
    "m'sila": "28 - M'Sila", 'msila': "28 - M'Sila", 'mascara': '29 - Mascara',
    'ouargla': '30 - Ouargla', 'oran': '31 - Oran', 'el bayadh': '32 - El Bayadh',
    'illizi': '33 - Illizi', 'bordj bou arréridj': '34 - Bordj Bou Arréridj',
    'boumerdès': '35 - Boumerdès', 'boumerdes': '35 - Boumerdès',
    'el tarf': '36 - El Tarf', 'tindouf': '37 - Tindouf', 'tissemsilt': '38 - Tissemsilt',
    'el oued': '39 - El Oued', 'khenchela': '40 - Khenchela', 'souk ahras': '41 - Souk Ahras',
    'tipaza': '42 - Tipaza', 'mila': '43 - Mila',
    'aïn defla': '44 - Aïn Defla', 'ain defla': '44 - Aïn Defla',
    'naâma': '45 - Naâma', 'naama': '45 - Naâma',
    'aïn témouchent': '46 - Aïn Témouchent', 'ain temouchent': '46 - Aïn Témouchent',
    'ghardaïa': '47 - Ghardaïa', 'ghardaia': '47 - Ghardaïa', 'relizane': '48 - Relizane',
}

# Mapping diplôme texte → code Django
DIPLOMES_MAPPING = [
    (['doctorat', 'phd', 'ph.d', 'دكتوراه'], 'DOCTORAT'),
    (['magistère', 'magistere', 'bac +7', 'bac+7', 'ماجستير'], 'MAGISTERE'),
    (['master 2', 'master2', 'm2', 'master', "master's degree", 'ingéniorat', 'ingeniorat', 'ingénieur d\'état', 'bac +5', 'bac+5', 'ingénieur', 'ماستر 2'], 'MASTER_2'),
    (['master 1', 'master1', 'm1', 'maîtrise', 'maitrise', 'bac +4', 'bac+4', 'ماستر 1'], 'MASTER_1'),
    (['licence', 'lmd', 'bachelor', 'bac +3', 'bac+3', 'ليسانس', 'إجازة'], 'LICENCE'),
    (['ts', 'technicien supérieur', 'technicien superieur', 'bac +2', 'bac+2', 'dut', 'bts', 'تقني سامي'], 'TS'),
    (['baccalauréat', 'baccalaureat', 'bac', 'بكالوريا'], 'BACCALAUREAT'),
    (['terminale', 'terminal', 'سنة نهائية'], 'NIVEAU_TERMINAL'),
    (['secondaire', 'ثانوي'], 'NIVEAU_SECONDAIRE'),
    (['formation professionnelle', 'formation pro', 'cap', 'cfa', 'تكوين مهني'], 'FORMATION_PRO'),
    (['certification', 'certifié', 'certifie', 'certificat', 'شهادة'], 'CERTIFICATION'),
]

# SPECIALITES_MAPPING et SYNONYMES_SPECIALITE (anciens dictionnaires de mots-clés → code
# secteur) sont supprimés depuis le passage à la nomenclature ANEM : la résolution
# spécialité/domaine se fait désormais dynamiquement par recherche dans MetierReferentiel
# (voir jobs/referentiel_utils.py, résoudre_domaine_depuis_texte) au lieu d'un dictionnaire
# codé en dur — la base de 5786 appellations officielles est une source bien plus fiable
# et exhaustive qu'une liste de mots-clés maintenue à la main.
