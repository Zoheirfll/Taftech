"""Nouveau tableau de bord candidat (session specs/important-features) — refonte demandée par
l'employeur sur mockup IA, discutée point par point : score de profil composite, compétences
structurées avec niveau, documents privés, prise de rendez-vous, fil d'activité."""
from django.utils import timezone
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.parsers import MultiPartParser, FormParser

from ..models import (
    CompetenceCandidat, TypeDocument, DocumentCandidat,
    ConfigRendezVous, DisponibiliteRecurrente, JourBloque, RendezVous,
    ActiviteProfil, Candidature,
)
from ..profile_score import calculer_score_profil


# ═══════════════════════════════════════════════════════════════════════════
# SCORE DE PROFIL
# ═══════════════════════════════════════════════════════════════════════════

class ScoreProfilAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'CANDIDAT' or not hasattr(request.user, 'profil_candidat'):
            return Response({"error": "Réservé aux candidats."}, status=403)
        return Response(calculer_score_profil(request.user), status=200)


# ═══════════════════════════════════════════════════════════════════════════
# COMPÉTENCES STRUCTURÉES (candidat) — synchronise ProfilCandidat.competences (texte libre)
# à chaque écriture pour ne rien casser côté matcher.py/cv_parser.py.
# ═══════════════════════════════════════════════════════════════════════════

def _resynchroniser_competences_texte(profil):
    labels = list(profil.competences_detail.values_list('label', flat=True))
    profil.competences = ', '.join(labels)
    profil.save(update_fields=['competences'])


class CompetenceCandidatAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'CANDIDAT':
            return Response({"error": "Réservé aux candidats."}, status=403)
        profil = request.user.profil_candidat
        data = [
            {'id': c.id, 'label': c.label, 'niveau': c.niveau, 'niveau_libelle': c.get_niveau_display(), 'source': c.source}
            for c in profil.competences_detail.all()
        ]
        return Response(data, status=200)

    def post(self, request):
        if request.user.role != 'CANDIDAT':
            return Response({"error": "Réservé aux candidats."}, status=403)
        profil = request.user.profil_candidat
        label = str(request.data.get('label', '')).strip()
        niveau = request.data.get('niveau', 'DEBUTANT')
        if not label:
            return Response({"error": "Le nom de la compétence est requis."}, status=400)
        if niveau not in dict(CompetenceCandidat.NIVEAU_CHOICES):
            niveau = 'DEBUTANT'
        comp, created = CompetenceCandidat.objects.update_or_create(
            profil=profil, label=label, defaults={'niveau': niveau}
        )
        _resynchroniser_competences_texte(profil)
        return Response(
            {'id': comp.id, 'label': comp.label, 'niveau': comp.niveau, 'niveau_libelle': comp.get_niveau_display(), 'source': comp.source},
            status=201 if created else 200,
        )

    def delete(self, request):
        if request.user.role != 'CANDIDAT':
            return Response({"error": "Réservé aux candidats."}, status=403)
        profil = request.user.profil_candidat
        comp_id = request.data.get('id')
        try:
            comp = profil.competences_detail.get(id=comp_id)
        except CompetenceCandidat.DoesNotExist:
            return Response({"error": "Compétence introuvable."}, status=404)
        comp.delete()
        _resynchroniser_competences_texte(profil)
        return Response({"message": "Compétence supprimée."}, status=200)


# ═══════════════════════════════════════════════════════════════════════════
# DOCUMENTS PRIVÉS (candidat)
# ═══════════════════════════════════════════════════════════════════════════

class TypeDocumentPublicAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        types = TypeDocument.objects.filter(actif=True)
        return Response([{'id': t.id, 'label': t.label} for t in types], status=200)


class DocumentCandidatAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def get(self, request):
        if request.user.role != 'CANDIDAT':
            return Response({"error": "Réservé aux candidats."}, status=403)
        profil = request.user.profil_candidat
        data = [
            {
                'id': d.id,
                'nom_personnalise': d.nom_personnalise,
                'type_document': d.type_document.label if d.type_document else None,
                'type_document_id': d.type_document_id,
                'fichier_url': request.build_absolute_uri(d.fichier.url) if d.fichier else None,
                'date_upload': d.date_upload,
            }
            for d in profil.documents.all()
        ]
        return Response(data, status=200)

    def post(self, request):
        if request.user.role != 'CANDIDAT':
            return Response({"error": "Réservé aux candidats."}, status=403)
        profil = request.user.profil_candidat
        fichier = request.FILES.get('fichier')
        if not fichier:
            return Response({"error": "Aucun fichier reçu."}, status=400)
        type_id = request.data.get('type_document')
        type_doc = TypeDocument.objects.filter(id=type_id).first() if type_id else None
        doc = DocumentCandidat.objects.create(
            profil=profil,
            type_document=type_doc,
            nom_personnalise=str(request.data.get('nom_personnalise', '')).strip()[:150],
            fichier=fichier,
        )
        return Response({
            'id': doc.id,
            'nom_personnalise': doc.nom_personnalise,
            'type_document': doc.type_document.label if doc.type_document else None,
            'fichier_url': request.build_absolute_uri(doc.fichier.url),
            'date_upload': doc.date_upload,
        }, status=201)

    def delete(self, request):
        if request.user.role != 'CANDIDAT':
            return Response({"error": "Réservé aux candidats."}, status=403)
        profil = request.user.profil_candidat
        try:
            doc = profil.documents.get(id=request.data.get('id'))
        except DocumentCandidat.DoesNotExist:
            return Response({"error": "Document introuvable."}, status=404)
        doc.fichier.delete(save=False)
        doc.delete()
        return Response({"message": "Document supprimé."}, status=200)


# ═══════════════════════════════════════════════════════════════════════════
# PRISE DE RENDEZ-VOUS
# ═══════════════════════════════════════════════════════════════════════════

def _generer_creneaux_disponibles(nb_jours=None):
    import datetime as dt
    config = ConfigRendezVous.get_solo()
    horizon = nb_jours or config.horizon_max_jours
    maintenant = timezone.now()
    pas_avant = maintenant + dt.timedelta(hours=config.delai_min_reservation_heures)

    gabarits = list(DisponibiliteRecurrente.objects.filter(actif=True))
    jours_bloques = set(JourBloque.objects.values_list('date', flat=True))
    deja_pris = set(
        RendezVous.objects.filter(
            statut='CONFIRME', date_heure__gte=maintenant
        ).values_list('date_heure', flat=True)
    )

    creneaux = []
    for i in range(horizon + 1):
        jour = (maintenant + dt.timedelta(days=i)).date()
        if jour in jours_bloques:
            continue
        jour_semaine = jour.weekday()
        for gab in gabarits:
            if gab.jour_semaine != jour_semaine:
                continue
            heure_courante = dt.datetime.combine(jour, gab.heure_debut)
            fin = dt.datetime.combine(jour, gab.heure_fin)
            pas = dt.timedelta(minutes=gab.duree_creneau_minutes)
            heure_courante = timezone.make_aware(heure_courante) if timezone.is_naive(heure_courante) else heure_courante
            fin = timezone.make_aware(fin) if timezone.is_naive(fin) else fin
            while heure_courante + pas <= fin:
                if heure_courante >= pas_avant and heure_courante not in deja_pris:
                    creneaux.append(heure_courante)
                heure_courante += pas
    creneaux.sort()
    return creneaux


class DisponibilitesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'CANDIDAT':
            return Response({"error": "Réservé aux candidats."}, status=403)
        creneaux = _generer_creneaux_disponibles()
        return Response([c.isoformat() for c in creneaux], status=200)


class RendezVousAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'CANDIDAT':
            return Response({"error": "Réservé aux candidats."}, status=403)
        rdvs = RendezVous.objects.filter(candidat=request.user)
        data = [
            {'id': r.id, 'date_heure': r.date_heure, 'motif': r.motif, 'statut': r.statut}
            for r in rdvs
        ]
        return Response(data, status=200)

    def post(self, request):
        if request.user.role != 'CANDIDAT':
            return Response({"error": "Réservé aux candidats."}, status=403)
        from django.utils.dateparse import parse_datetime
        date_heure_str = request.data.get('date_heure')
        date_heure = parse_datetime(date_heure_str) if date_heure_str else None
        if not date_heure:
            return Response({"error": "Date/heure invalide."}, status=400)
        if timezone.is_naive(date_heure):
            date_heure = timezone.make_aware(date_heure)

        creneaux_valides = _generer_creneaux_disponibles()
        if date_heure not in creneaux_valides:
            return Response({"error": "Ce créneau n'est plus disponible."}, status=400)

        rdv = RendezVous.objects.create(
            candidat=request.user,
            date_heure=date_heure,
            motif=str(request.data.get('motif', '')).strip()[:300],
        )
        return Response({'id': rdv.id, 'date_heure': rdv.date_heure, 'motif': rdv.motif, 'statut': rdv.statut}, status=201)


class RendezVousAnnulerAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != 'CANDIDAT':
            return Response({"error": "Réservé aux candidats."}, status=403)
        try:
            rdv = RendezVous.objects.get(id=pk, candidat=request.user)
        except RendezVous.DoesNotExist:
            return Response({"error": "Rendez-vous introuvable."}, status=404)
        if rdv.statut != 'CONFIRME':
            return Response({"error": "Ce rendez-vous ne peut plus être annulé."}, status=400)
        rdv.statut = 'ANNULE'
        rdv.date_annulation = timezone.now()
        rdv.save(update_fields=['statut', 'date_annulation'])
        return Response({"message": "Rendez-vous annulé."}, status=200)


# ═══════════════════════════════════════════════════════════════════════════
# FIL D'ACTIVITÉ
# ═══════════════════════════════════════════════════════════════════════════

class ActiviteProfilAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'CANDIDAT':
            return Response({"error": "Réservé aux candidats."}, status=403)
        activites = ActiviteProfil.objects.filter(candidat=request.user).select_related('entreprise', 'candidature__offre')[:20]
        data = []
        for a in activites:
            item = {
                'id': a.id,
                'type_activite': a.type_activite,
                'entreprise': a.entreprise.nom_entreprise,
                'date_creation': a.date_creation,
                'score': float(a.score) if a.score is not None else None,
            }
            if a.candidature:
                item['offre_titre'] = a.candidature.offre.titre
            data.append(item)
        return Response(data, status=200)


# ═══════════════════════════════════════════════════════════════════════════
# ADMIN — Rendez-vous & Types de documents
# ═══════════════════════════════════════════════════════════════════════════

class ConfigRendezVousAdminAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({"error": "Accès refusé."}, status=403)
        c = ConfigRendezVous.get_solo()
        return Response({'delai_min_reservation_heures': c.delai_min_reservation_heures, 'horizon_max_jours': c.horizon_max_jours}, status=200)

    def put(self, request):
        if request.user.role != 'ADMIN':
            return Response({"error": "Accès refusé."}, status=403)
        c = ConfigRendezVous.get_solo()
        c.delai_min_reservation_heures = int(request.data.get('delai_min_reservation_heures', c.delai_min_reservation_heures))
        c.horizon_max_jours = int(request.data.get('horizon_max_jours', c.horizon_max_jours))
        c.save()
        return Response({'delai_min_reservation_heures': c.delai_min_reservation_heures, 'horizon_max_jours': c.horizon_max_jours}, status=200)


class DisponibiliteRecurrenteAdminAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({"error": "Accès refusé."}, status=403)
        data = [
            {'id': d.id, 'jour_semaine': d.jour_semaine, 'jour_libelle': d.get_jour_semaine_display(),
             'heure_debut': d.heure_debut, 'heure_fin': d.heure_fin,
             'duree_creneau_minutes': d.duree_creneau_minutes, 'actif': d.actif}
            for d in DisponibiliteRecurrente.objects.all()
        ]
        return Response(data, status=200)

    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({"error": "Accès refusé."}, status=403)
        d = DisponibiliteRecurrente.objects.create(
            jour_semaine=request.data.get('jour_semaine'),
            heure_debut=request.data.get('heure_debut'),
            heure_fin=request.data.get('heure_fin'),
            duree_creneau_minutes=request.data.get('duree_creneau_minutes', 30),
        )
        return Response({'id': d.id}, status=201)

    def put(self, request, pk):
        if request.user.role != 'ADMIN':
            return Response({"error": "Accès refusé."}, status=403)
        try:
            d = DisponibiliteRecurrente.objects.get(id=pk)
        except DisponibiliteRecurrente.DoesNotExist:
            return Response({"error": "Introuvable."}, status=404)
        for champ in ['jour_semaine', 'heure_debut', 'heure_fin', 'duree_creneau_minutes', 'actif']:
            if champ in request.data:
                setattr(d, champ, request.data[champ])
        d.save()
        return Response({'id': d.id}, status=200)

    def delete(self, request, pk):
        if request.user.role != 'ADMIN':
            return Response({"error": "Accès refusé."}, status=403)
        DisponibiliteRecurrente.objects.filter(id=pk).delete()
        return Response({"message": "Supprimé."}, status=200)


class JourBloqueAdminAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({"error": "Accès refusé."}, status=403)
        data = [{'id': j.id, 'date': j.date, 'motif': j.motif} for j in JourBloque.objects.all()]
        return Response(data, status=200)

    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({"error": "Accès refusé."}, status=403)
        j, _ = JourBloque.objects.get_or_create(
            date=request.data.get('date'), defaults={'motif': request.data.get('motif', '')}
        )
        return Response({'id': j.id}, status=201)

    def delete(self, request, pk):
        if request.user.role != 'ADMIN':
            return Response({"error": "Accès refusé."}, status=403)
        JourBloque.objects.filter(id=pk).delete()
        return Response({"message": "Supprimé."}, status=200)


class RendezVousAdminListAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({"error": "Accès refusé."}, status=403)
        rdvs = RendezVous.objects.select_related('candidat').all()
        statut = request.query_params.get('statut')
        if statut:
            rdvs = rdvs.filter(statut=statut)
        data = [
            {
                'id': r.id, 'date_heure': r.date_heure, 'motif': r.motif, 'statut': r.statut,
                'notes_admin': r.notes_admin,
                'candidat_nom': f"{r.candidat.first_name} {r.candidat.last_name}",
                'candidat_email': r.candidat.email,
            }
            for r in rdvs
        ]
        return Response(data, status=200)

    def patch(self, request, pk):
        if request.user.role != 'ADMIN':
            return Response({"error": "Accès refusé."}, status=403)
        try:
            rdv = RendezVous.objects.get(id=pk)
        except RendezVous.DoesNotExist:
            return Response({"error": "Introuvable."}, status=404)
        if 'statut' in request.data and request.data['statut'] in dict(RendezVous.STATUT_CHOICES):
            rdv.statut = request.data['statut']
        if 'notes_admin' in request.data:
            rdv.notes_admin = request.data['notes_admin']
        rdv.save()
        return Response({"message": "Mis à jour."}, status=200)


class TypeDocumentAdminAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({"error": "Accès refusé."}, status=403)
        data = [{'id': t.id, 'label': t.label, 'ordre': t.ordre, 'actif': t.actif} for t in TypeDocument.objects.all()]
        return Response(data, status=200)

    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({"error": "Accès refusé."}, status=403)
        label = str(request.data.get('label', '')).strip()
        if not label:
            return Response({"error": "Le libellé est requis."}, status=400)
        t = TypeDocument.objects.create(label=label, ordre=request.data.get('ordre', 0))
        return Response({'id': t.id}, status=201)

    def put(self, request, pk):
        if request.user.role != 'ADMIN':
            return Response({"error": "Accès refusé."}, status=403)
        try:
            t = TypeDocument.objects.get(id=pk)
        except TypeDocument.DoesNotExist:
            return Response({"error": "Introuvable."}, status=404)
        for champ in ['label', 'ordre', 'actif']:
            if champ in request.data:
                setattr(t, champ, request.data[champ])
        t.save()
        return Response({'id': t.id}, status=200)

    def delete(self, request, pk):
        if request.user.role != 'ADMIN':
            return Response({"error": "Accès refusé."}, status=403)
        TypeDocument.objects.filter(id=pk).delete()
        return Response({"message": "Supprimé."}, status=200)
