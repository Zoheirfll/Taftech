from rest_framework import serializers
from django.contrib.auth import get_user_model
from ..models import ProfilCandidat, ExperienceCandidat, FormationCandidat, CompetenceCandidat, DemandeAjout

User = get_user_model()


def _demande_metier_autorisee(serializer, champ, demande):
    """Une demande de métier ne se lie au profil que si elle est celle du compte connecté (ouverte, de type
    métier). Un lien déjà posé sur l'objet modifié reste valable tel quel (le formulaire peut le renvoyer).
    Sans utilisateur dans le contexte de la vue : refus (fermé par défaut)."""
    if demande is None:
        return None
    instance = serializer.instance
    if instance is not None and getattr(instance, f'{champ}_id', None) == demande.pk:
        return demande
    from ..demandes_ajout.metiers import demande_metier_utilisable
    utilisateur = serializer.context.get('utilisateur_demandeur')
    if utilisateur is None or not demande_metier_utilisable(demande, utilisateur):
        raise serializers.ValidationError("Cette demande de métier ne peut pas être liée à votre profil.")
    return demande


def _metier_propose(demande):
    from ..demandes_ajout.metiers import resume_demande_metier
    return resume_demande_metier(demande)


def _appliquer_choix_metier(attrs, champ_metier, champ_demande, champ_appellation=None):
    """Un vrai métier choisi retire la proposition ; une proposition remplace le métier choisi avant (jamais les
    deux : seul le métier officiel compte pour le calcul)."""
    if attrs.get(champ_metier):
        attrs[champ_demande] = None
    elif attrs.get(champ_demande) is not None:
        attrs[champ_metier] = None
        if champ_appellation:
            attrs[champ_appellation] = None


def appellation_appartient_au_metier(appellation, metier):
    """Vrai si l'appellation relève de ce métier, directement ou via son métier canonique. Sans métier, une
    appellation n'a pas de sens : faux."""
    if metier is None:
        return False
    metier_appellation = appellation.metier.metier_canonique or appellation.metier
    return metier.pk in (appellation.metier_id, metier_appellation.pk)


class ExperienceSerializer(serializers.ModelSerializer):
    metier_libelle = serializers.CharField(source='metier.libelle', read_only=True, default=None)
    appellation_libelle = serializers.CharField(source='appellation.libelle', read_only=True, default=None)
    # Métier proposé en attente de décision : écrit par le candidat, lu seulement par lui (jamais par un
    # recruteur : `inclure_metier_propose` n'est posé que par les vues du candidat), jamais un critère de calcul.
    demande_metier = serializers.PrimaryKeyRelatedField(
        queryset=DemandeAjout.objects.filter(type=DemandeAjout.TYPE_METIER),
        required=False, allow_null=True, write_only=True,
    )
    metier_propose = serializers.SerializerMethodField()

    class Meta:
        model = ExperienceCandidat
        fields = [
            'id', 'titre_poste', 'entreprise', 'metier', 'metier_libelle',
            'appellation', 'appellation_libelle', 'date_debut', 'date_fin', 'date_debut_precision', 'date_fin_precision', 'description',
            'demande_metier', 'metier_propose',
        ]

    def get_metier_propose(self, obj):
        return _metier_propose(obj.demande_metier)

    def to_representation(self, instance):
        donnees = super().to_representation(instance)
        if not self.context.get('inclure_metier_propose'):
            donnees.pop('metier_propose', None)
        return donnees

    def validate_demande_metier(self, demande):
        return _demande_metier_autorisee(self, 'demande_metier', demande)

    def validate(self, attrs):
        """L'appellation affichée doit appartenir au métier de l'expérience (le métier, éventuellement via son
        métier canonique, reste la clé du calcul) : jamais un intitulé sans rapport avec lui."""
        _appliquer_choix_metier(attrs, 'metier', 'demande_metier', 'appellation')
        metier, appellation = attrs.get('metier'), attrs.get('appellation')
        if metier and appellation and not appellation_appartient_au_metier(appellation, metier):
            raise serializers.ValidationError({'appellation': "Cette appellation n'appartient pas au métier choisi."})
        return attrs


class FormationSerializer(serializers.ModelSerializer):
    diplome_ref_libelle = serializers.CharField(source='diplome_ref.libelle', read_only=True, default=None)
    specialite_ref_libelle = serializers.CharField(source='specialite_ref.libelle', read_only=True, default=None)

    class Meta:
        model = FormationCandidat
        fields = [
            'id', 'diplome', 'etablissement', 'date_debut', 'date_fin', 'date_fin_prevue',
            'date_debut_precision', 'date_fin_precision', 'description', 'specialite_texte',
            'diplome_ref', 'diplome_ref_libelle', 'specialite_ref', 'specialite_ref_libelle', 'statut',
            'pays_formation', 'statut_validation', 'document_reference', 'est_principale', 'version_referentiel',
        ]
        # Pas de validation bloquante sur le couple diplome_ref/specialite_ref : REGLES_FORMATION F02
        # (client) — la couverture universitaire n'est pas exhaustive, un couple absent du référentiel
        # doit rester saisissable (repli "Autre, préciser"), jamais rejeté. La contrainte "même
        # formation" (ne pas combiner diplôme et spécialité de deux formations différentes) se
        # respecte côté matcher.py en comparant chaque FormationCandidat comme un tout atomique,
        # pas en interdisant une combinaison à la saisie.


class CompetenceCandidatSerializer(serializers.ModelSerializer):
    niveau_libelle = serializers.CharField(source='get_niveau_display', read_only=True)

    class Meta:
        model = CompetenceCandidat
        fields = ['id', 'label', 'niveau', 'niveau_libelle', 'source', 'origine', 'competence_ref']


class ProfilCandidatDTO(serializers.ModelSerializer):
    first_name = serializers.SerializerMethodField()
    last_name = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    telephone = serializers.SerializerMethodField()
    nin = serializers.SerializerMethodField()
    # La vraie date de naissance vit sur CustomUser (saisie à l'inscription) —
    # ProfilCandidat.date_naissance est une colonne jamais consommée ailleurs
    # dans le code, ce champ mappe explicitement sur celle du User pour ne
    # pas exposer/écraser la colonne morte du modèle ProfilCandidat.
    date_naissance = serializers.SerializerMethodField()
    adresse = serializers.SerializerMethodField()
    salaire_souhaite = serializers.SerializerMethodField()
    date_joined = serializers.SerializerMethodField()
    last_login = serializers.SerializerMethodField()
    user_id = serializers.SerializerMethodField()
    est_debloque = serializers.SerializerMethodField()
    debloque_le = serializers.SerializerMethodField()
    debloque_par_nom = serializers.SerializerMethodField()
    is_favori = serializers.SerializerMethodField()
    experiences_detail = serializers.SerializerMethodField()
    formations_detail = FormationSerializer(many=True, read_only=True)
    competences_detail = CompetenceCandidatSerializer(many=True, read_only=True)
    linkedin = serializers.SerializerMethodField()
    github = serializers.SerializerMethodField()
    bio = serializers.SerializerMethodField()
    photo_profil = serializers.SerializerMethodField()
    commune = serializers.SerializerMethodField()
    diplome = serializers.SerializerMethodField()
    metier_libelle = serializers.SerializerMethodField()
    metier_souhaite_libelle = serializers.CharField(source='metier_souhaite.libelle', read_only=True, default=None)
    metier_appellation_libelle = serializers.SerializerMethodField()  # masqué avant déblocage, comme le métier
    metier_souhaite_appellation_libelle = serializers.CharField(
        source='metier_souhaite_appellation.libelle', read_only=True, default=None)
    diplome_ref_libelle = serializers.SerializerMethodField()
    niveau_scolaire_ref_libelle = serializers.CharField(source='niveau_scolaire_ref.libelle', read_only=True, default=None)
    # Métiers proposés en attente de décision : voir ExperienceSerializer. Absents de la réponse hors vues du candidat.
    demande_metier = serializers.PrimaryKeyRelatedField(
        queryset=DemandeAjout.objects.filter(type=DemandeAjout.TYPE_METIER),
        required=False, allow_null=True, write_only=True,
    )
    demande_metier_souhaite = serializers.PrimaryKeyRelatedField(
        queryset=DemandeAjout.objects.filter(type=DemandeAjout.TYPE_METIER),
        required=False, allow_null=True, write_only=True,
    )
    metier_propose = serializers.SerializerMethodField()
    metier_souhaite_propose = serializers.SerializerMethodField()

    class Meta:
        model = ProfilCandidat
        fields = (
            'titre_professionnel', 'cv_pdf', 'cv_pdf_maj_le', 'photo_profil', 'diplome', 'sexe',
            'diplome_ref', 'diplome_ref_libelle', 'niveau_scolaire_ref_libelle',
            'metier', 'metier_libelle', 'metier_souhaite', 'metier_souhaite_libelle',
            'metier_appellation', 'metier_appellation_libelle',
            'metier_souhaite_appellation', 'metier_souhaite_appellation_libelle',
            'demande_metier', 'demande_metier_souhaite', 'metier_propose', 'metier_souhaite_propose',
            'experiences', 'competences', 'competences_detail', 'langues',
            'first_name', 'last_name', 'email', 'telephone', 'nin', 'date_naissance',
            'experiences_detail', 'formations_detail',
            'service_militaire', 'permis_conduire', 'vehicule_personnel', 'passeport_valide',
            'salaire_souhaite', 'mobilite', 'situation_actuelle',
            'wilaya', 'commune', 'adresse', 'date_joined', 'is_favori', 'last_login', 'user_id',
            'est_debloque', 'debloque_le', 'debloque_par_nom', 'bio', 'linkedin', 'github', 'visible_cvtheque',
            'derniers_conseils_dashboard', 'conseils_dashboard_le',
            'derniere_analyse_carriere', 'analyse_carriere_le',
        )

    def _peut_voir_coordonnees(self, obj):
        """True si ce candidat précis est débloqué pour l'entreprise du contexte
        ('unlocked_ids', calculé une fois par la vue) — ou repli sur l'ancien flag
        'is_premium' pour les appelants hors CVthèque (ex: le candidat consultant son
        propre profil, toujours is_premium=True)."""
        unlocked_ids = self.context.get('unlocked_ids')
        if unlocked_ids is not None:
            return obj.user_id in unlocked_ids
        return self.context.get('is_premium', False)

    def get_est_debloque(self, obj):
        return self._peut_voir_coordonnees(obj)

    def _acces_debloque(self, obj):
        """Ligne AccesCandidatDebloque de ce candidat (contexte 'unlocked_ids' sous forme de dict
        {candidat_id: accès}, posé par la CVthèque) ; None hors CVthèque ou si non débloqué."""
        unlocked_ids = self.context.get('unlocked_ids')
        return unlocked_ids.get(obj.user_id) if isinstance(unlocked_ids, dict) else None

    def get_debloque_le(self, obj):
        acces = self._acces_debloque(obj)
        return acces.date_debloque if acces else None

    def get_debloque_par_nom(self, obj):
        """Membre de l'équipe qui a débloqué (vue recruteur uniquement : le contexte n'existe pas
        côté candidat) ; None pour un déblocage antérieur à l'enregistrement de l'auteur."""
        acces = self._acces_debloque(obj)
        auteur = acces.debloque_par if acces else None
        if not auteur:
            return None
        return f"{auteur.first_name} {auteur.last_name}".strip() or auteur.email

    def get_first_name(self, obj):
        """Masqué avant déblocage en CVthèque — combiné au nom de famille et à la photo,
        le prénom seul reste trop identifiable (contrairement à la wilaya/au titre de poste,
        qui restent affichés pour permettre de parcourir la liste). Reste toujours visible
        hors contexte CVthèque (candidat consultant son propre profil, admin)."""
        return obj.user.first_name if self._peut_voir_coordonnees(obj) else None

    def get_last_name(self, obj):
        """Masqué avant déblocage — voir get_first_name."""
        return obj.user.last_name if self._peut_voir_coordonnees(obj) else None

    def get_photo_profil(self, obj):
        """Masquée avant déblocage — photo la plus identifiante du profil, au même titre
        que le nom complet."""
        if not self._peut_voir_coordonnees(obj):
            return None
        return obj.photo_profil.url if obj.photo_profil else None

    def get_commune(self, obj):
        """Masquée avant déblocage — précision géographique fine, contrairement à la
        wilaya (gardée visible, nécessaire pour parcourir/filtrer la liste)."""
        return obj.commune if self._peut_voir_coordonnees(obj) else None

    def get_diplome(self, obj):
        return obj.diplome if self._peut_voir_coordonnees(obj) else None

    def get_diplome_ref_libelle(self, obj):
        return obj.diplome_ref.libelle if obj.diplome_ref_id and self._peut_voir_coordonnees(obj) else None

    def get_metier_libelle(self, obj):
        return obj.metier.libelle if obj.metier_id and self._peut_voir_coordonnees(obj) else None

    def get_metier_appellation_libelle(self, obj):
        return obj.metier_appellation.libelle if obj.metier_appellation_id and self._peut_voir_coordonnees(obj) else None

    def get_metier_propose(self, obj):
        return _metier_propose(obj.demande_metier)

    def get_metier_souhaite_propose(self, obj):
        return _metier_propose(obj.demande_metier_souhaite)

    def to_representation(self, instance):
        donnees = super().to_representation(instance)
        if not self.context.get('inclure_metier_propose'):  # jamais montré à un recruteur
            donnees.pop('metier_propose', None)
            donnees.pop('metier_souhaite_propose', None)
        return donnees

    def validate_demande_metier(self, demande):
        return _demande_metier_autorisee(self, 'demande_metier', demande)

    def validate_demande_metier_souhaite(self, demande):
        return _demande_metier_autorisee(self, 'demande_metier_souhaite', demande)

    def validate(self, attrs):
        """Une appellation doit appartenir au métier correspondant ; changer de métier sans renvoyer
        d'appellation efface l'ancienne (elle n'appartient plus au nouveau métier)."""
        _appliquer_choix_metier(attrs, 'metier', 'demande_metier', 'metier_appellation')
        _appliquer_choix_metier(attrs, 'metier_souhaite', 'demande_metier_souhaite', 'metier_souhaite_appellation')
        for champ_metier, champ_appellation in (
                ('metier', 'metier_appellation'), ('metier_souhaite', 'metier_souhaite_appellation')):
            if champ_metier not in attrs and champ_appellation not in attrs:
                continue
            metier = attrs[champ_metier] if champ_metier in attrs else getattr(self.instance, champ_metier, None)
            if champ_appellation in attrs:
                appellation = attrs[champ_appellation]
            else:
                appellation = getattr(self.instance, champ_appellation, None)
                if appellation and not appellation_appartient_au_metier(appellation, metier):
                    attrs[champ_appellation] = None
                    appellation = None
            if appellation and not appellation_appartient_au_metier(appellation, metier):
                raise serializers.ValidationError({champ_appellation: "Cette appellation n'appartient pas au métier choisi."})
        return attrs

    def get_date_naissance(self, obj):
        """Masquée tant que le profil n'est pas débloqué en CVthèque — au même titre
        qu'email/téléphone, oubliée du masquage initial (audit du 03/09/2026)."""
        return obj.user.date_naissance if self._peut_voir_coordonnees(obj) else None

    def get_adresse(self, obj):
        """Adresse complète (rue) masquée avant déblocage — wilaya/commune restent visibles
        pour l'aperçu géographique, l'adresse précise est une coordonnée de contact au même
        titre que le téléphone (oubliée du masquage initial, audit du 03/09/2026)."""
        return obj.adresse if self._peut_voir_coordonnees(obj) else None

    def get_salaire_souhaite(self, obj):
        """Masqué avant déblocage — un recruteur ne doit pas connaître la prétention salariale
        du candidat sans avoir débloqué le profil (levier de négociation, demande utilisateur)."""
        return obj.salaire_souhaite if self._peut_voir_coordonnees(obj) else None

    def get_email(self, obj): return obj.user.email if self._peut_voir_coordonnees(obj) else None
    def get_telephone(self, obj): return obj.user.telephone if self._peut_voir_coordonnees(obj) else None
    def get_nin(self, obj): return obj.user.nin if self.context.get('include_nin') else None
    def get_date_joined(self, obj): return obj.user.date_joined
    def get_last_login(self, obj): return obj.user.last_login
    def get_user_id(self, obj): return obj.user.id

    def get_is_favori(self, obj):
        recruteur = self.context.get('recruteur')
        if not recruteur:
            return False
        from ..models import ProfilCandidatFavori
        return ProfilCandidatFavori.objects.filter(
            recruteur=recruteur, candidat=obj.user
        ).exists()

    def get_experiences_detail(self, obj):
        """Le nom de l'employeur (info la plus identifiante d'une expérience — permet souvent
        de retrouver/contacter le candidat sans jamais débloquer le profil) est masqué tant
        que le profil n'est pas débloqué en CVthèque — le reste (titre, dates, description)
        reste visible pour donner un vrai aperçu et inciter au déblocage."""
        data = ExperienceSerializer(obj.experiences_detail.all(), many=True, context=self.context).data
        if not self._peut_voir_coordonnees(obj):
            for exp in data:
                exp['entreprise'] = "Entreprise non communiquée"
        return data

    def get_linkedin(self, obj):
        p = obj
        val = getattr(p, 'linkedin', None)
        return val if self._peut_voir_coordonnees(obj) else None

    def get_github(self, obj):
        p = obj
        val = getattr(p, 'github', None)
        return val if self._peut_voir_coordonnees(obj) else None

    def get_bio(self, obj):
        """Masqué avant déblocage — texte libre du candidat, mentionne fréquemment des noms
        d'employeurs/entreprises réels (identifiant au même titre qu'une expérience nommée)."""
        return obj.bio if self._peut_voir_coordonnees(obj) else None


class ProfilCandidatAdminSerializer(serializers.ModelSerializer):
    """Vue admin complète (`fields='__all__'`, jamais de masquage de type CVthèque —
    l'admin voit tout) — bug réel corrigé (26/09/2026) : `'__all__'` ne renvoie que les FK
    brutes du référentiel v2 (`metier_souhaite`, `diplome_ref`...), jamais leur libellé
    lisible, contrairement à `ProfilCandidatDTO` (candidat) qui les résout déjà. L'admin
    voyait donc un ID numérique brut ("2497") à la place du métier souhaité, et aucun
    libellé de type de diplôme malgré sa présence réelle en base."""
    experiences_detail = ExperienceSerializer(many=True, read_only=True)
    formations_detail = FormationSerializer(many=True, read_only=True)
    metier_libelle = serializers.CharField(source='metier.libelle', read_only=True, default=None)
    metier_souhaite_libelle = serializers.CharField(source='metier_souhaite.libelle', read_only=True, default=None)
    metier_appellation_libelle = serializers.CharField(source='metier_appellation.libelle', read_only=True, default=None)
    metier_souhaite_appellation_libelle = serializers.CharField(
        source='metier_souhaite_appellation.libelle', read_only=True, default=None)
    diplome_ref_libelle = serializers.CharField(source='diplome_ref.libelle', read_only=True, default=None)
    niveau_scolaire_ref_libelle = serializers.CharField(source='niveau_scolaire_ref.libelle', read_only=True, default=None)

    class Meta:
        model = ProfilCandidat
        fields = '__all__'


class AdminUserSerializer(serializers.ModelSerializer):
    profil_candidat = ProfilCandidatAdminSerializer(read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name', 'role',
            'is_active', 'date_joined', 'telephone', 'nin', 'date_naissance',
            'consentement_loi_18_07', 'profil_candidat'
        )


class ParametresNotificationsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfilCandidat
        fields = ['notif_offres_exclusives', 'notif_newsletter', 'notif_mise_a_jour']