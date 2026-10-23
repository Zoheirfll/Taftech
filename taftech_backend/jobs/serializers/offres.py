from rest_framework import serializers
from ..models import OffreEmploi, ProfilEntreprise, CompetenceOffre, ExigenceImperative
from .questionnaires import QuestionnaireSerializer


class CompetenceOffreSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompetenceOffre
        fields = ('id', 'label', 'competence_ref', 'type_exigence', 'niveau_requis')


def _secteur_libelle_pour_offre(obj):
    """Libellé du secteur (groupe racine) du Metier v2 référencé par `metier` — utilisé
    côté frontend pour construire l'URL SEO imbriquée de l'offre."""
    if not obj.metier_id:
        return None
    groupe = obj.metier.groupe_principal
    racine = groupe.parent if groupe and groupe.parent else groupe
    return racine.libelle if racine else None


class EntrepriseSimpleSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = ProfilEntreprise
        fields = ('id', 'slug', 'nom_entreprise', 'wilaya_siege', 'commune_siege', 'adresse_complete', 'logo_url')

    def get_logo_url(self, obj):
        if not obj.logo:
            return None
        request = self.context.get('request')
        return request.build_absolute_uri(obj.logo.url) if request else obj.logo.url


class ExigenceImperativeSerializer(serializers.ModelSerializer):
    """S12 — exigence impérative de l'offre (permis, habilitation...), jamais notée dans le
    score de matching."""
    class Meta:
        model = ExigenceImperative
        fields = ('id', 'label', 'description', 'justificatif_requis', 'categorie')


MAX_NON_RETENUES = 2  # au-delà, la page publique cite les spécialités gardées au lieu d'écrire « sauf … »


def detail_specialites_requises(specialites):
    """`specialites_requises_detail` d'une offre : `id` et `libelle` (inchangés) + le domaine de la
    spécialité, le total des spécialités sélectionnables de ce domaine (hors « Autre, préciser ») et, quand
    il en manque une ou deux, leur libellé. Permet d'écrire « Master 2 en Informatique » ou « … (sauf X) »
    côté public (`utils/phraseFormation.js`) sans lister les spécialités une par une. 2 requêtes au plus."""
    from ..models import DomaineFormation, SpecialiteFormation
    specialites = list(specialites)
    if not specialites:
        return []
    domaine_ids = {s.domaine_id for s in specialites}
    libelles_domaines = dict(DomaineFormation.objects.filter(pk__in=domaine_ids).values_list('id', 'libelle'))
    par_domaine = {}
    selectionnables = (
        SpecialiteFormation.objects.filter(domaine_id__in=domaine_ids, selectionnable=True)
        .exclude(code='SP-AUTRE').exclude(libelle__iregex=r'autre.*préciser').order_by('libelle')
    )
    for s in selectionnables:
        par_domaine.setdefault(s.domaine_id, []).append(s)
    choisies = {s.id for s in specialites}
    detail = []
    for s in specialites:
        du_domaine = par_domaine.get(s.domaine_id, [])
        manquantes = [x.libelle for x in du_domaine if x.id not in choisies]
        detail.append({
            "id": s.id, "libelle": s.libelle,
            "domaine_id": s.domaine_id, "domaine_libelle": libelles_domaines.get(s.domaine_id),
            "domaine_total": len(du_domaine),
            "domaine_non_retenues": manquantes if len(manquantes) <= MAX_NON_RETENUES else [],
        })
    return detail


class OffreEmploiSerializer(serializers.ModelSerializer):
    entreprise = EntrepriseSimpleSerializer(read_only=True)
    questionnaire = QuestionnaireSerializer(read_only=True)
    jours_restants = serializers.SerializerMethodField()
    secteur_libelle = serializers.SerializerMethodField()
    competences_requises = CompetenceOffreSerializer(many=True, read_only=True)
    metier_libelle = serializers.CharField(source='metier.libelle', read_only=True, default=None)
    diplome_ref_libelle = serializers.CharField(source='diplome_ref.libelle', read_only=True, default=None)
    niveau_scolaire_ref_libelle = serializers.CharField(source='niveau_scolaire_ref.libelle', read_only=True, default=None)
    diplomes_requis_detail = serializers.SerializerMethodField()
    specialites_requises_detail = serializers.SerializerMethodField()
    experience_annees = serializers.SerializerMethodField()
    exigences_imperatives = ExigenceImperativeSerializer(many=True, read_only=True)

    class Meta:
        model = OffreEmploi
        fields = '__all__'

    def get_experience_annees(self, obj):
        from ..matcher import annees_experience_pour_niveau
        return annees_experience_pour_niveau(obj.experience_requise)

    def get_diplomes_requis_detail(self, obj):
        return [{"id": d.id, "libelle": d.libelle, "code": d.code} for d in obj.diplomes_requis.all()]

    def get_specialites_requises_detail(self, obj):
        return detail_specialites_requises(obj.specialites_requises.all())

    def get_jours_restants(self, obj):
        if not obj.date_expiration or obj.est_cloturee:
            return None
        from django.utils import timezone
        delta = obj.date_expiration - timezone.now().date()
        # Négatif si la date est dépassée (offre pas encore archivée par le cron
        # `archiver_offres_expirees`) — ne jamais clamper à 0, sinon une offre expirée
        # depuis plusieurs jours s'affiche indéfiniment comme "expire aujourd'hui".
        return delta.days

    def get_secteur_libelle(self, obj):
        return _secteur_libelle_pour_offre(obj)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Règle client : le recruteur garde son intitulé public (`titre`), rattaché en interne à un
        # métier de référence qui ne sert qu'au calcul (matching) et n'est montré qu'au recruteur et
        # à l'admin. Sûr par défaut : retiré de toute réponse publique ou candidat, numéro compris
        # (l'API publique des nomenclatures permet de retrouver le nom à partir du numéro), sauf si
        # l'appelant le demande explicitement (`context={'inclure_metier_reference': True}`).
        if not self.context.get('inclure_metier_reference'):
            data.pop('metier', None)
            data.pop('metier_libelle', None)
        return data


class OffreEmploiCreateDTO(serializers.ModelSerializer):
    class Meta:
        model = OffreEmploi
        fields = (
            'titre', 'wilaya', 'commune', 'metier',
            'description', 'missions', 'profil_recherche', 'competences', 'type_contrat',
            'experience_requise', 'nombre_postes', 'salaire_propose', 'questionnaire', 'date_expiration'
        )


class OffreEmploiPublicSerializer(serializers.ModelSerializer):
    secteur_libelle = serializers.SerializerMethodField()

    class Meta:
        model = OffreEmploi
        fields = ('id', 'code_public', 'secteur_libelle', 'titre', 'wilaya', 'commune', 'type_contrat', 'experience_requise', 'nombre_postes', 'date_publication')

    def get_secteur_libelle(self, obj):
        return _secteur_libelle_pour_offre(obj)


class EntreprisePublicSerializer(serializers.ModelSerializer):
    offres_actives = serializers.SerializerMethodField()
    nombre_offres_actives = serializers.SerializerMethodField()
    logo_url = serializers.SerializerMethodField()
    banniere_url = serializers.SerializerMethodField()
    photos = serializers.SerializerMethodField()
    secteur_activite_libelle = serializers.SerializerMethodField()

    class Meta:
        model = ProfilEntreprise
        fields = (
            'id', 'slug', 'nom_entreprise', 'secteur_activite', 'secteur_activite_libelle',
            'wilaya_siege', 'commune_siege',
            'adresse_complete', 'taille_entreprise', 'description', 'culture_entreprise',
            'annee_creation',
            'logo_url', 'banniere_url', 'photos', 'linkedin', 'site_web',
            'offres_actives', 'nombre_offres_actives',
        )

    def get_secteur_activite_libelle(self, obj):
        from ..referentiel_utils import libelle_secteur_entreprise
        return libelle_secteur_entreprise(obj.secteur_activite)

    def _offres_actives_qs(self, obj):
        return obj.offres.filter(
            est_active=True, statut_moderation='APPROUVEE', est_cloturee=False
        ).order_by('-date_publication')

    def get_offres_actives(self, obj):
        return OffreEmploiPublicSerializer(self._offres_actives_qs(obj), many=True).data

    def get_nombre_offres_actives(self, obj):
        return self._offres_actives_qs(obj).count()

    def get_logo_url(self, obj):
        if not obj.logo:
            return None
        request = self.context.get('request')
        return request.build_absolute_uri(obj.logo.url) if request else obj.logo.url

    def get_banniere_url(self, obj):
        if not obj.banniere:
            return None
        request = self.context.get('request')
        return request.build_absolute_uri(obj.banniere.url) if request else obj.banniere.url

    def get_photos(self, obj):
        request = self.context.get('request')
        return [
            {
                "id": p.id,
                "image": request.build_absolute_uri(p.image.url) if request else p.image.url,
                "legende": p.legende,
            }
            for p in obj.photos.all()
        ]