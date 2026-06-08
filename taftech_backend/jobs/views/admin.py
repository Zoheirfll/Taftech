from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.pagination import PageNumberPagination
from django.contrib.auth import get_user_model
from django.db.models import Q, Avg, Count
from django.http import HttpResponse
from django.core.mail import EmailMessage
from django.conf import settings
import csv
import re
import datetime
from ..models import (
    OffreEmploi, Candidature, ProfilCandidat,
    ProfilEntreprise
)
from ..serializers import (
    OffreEmploiSerializer, OffreDashboardDTO,
    EntrepriseDashboardDetailSerializer,
    AdminUserSerializer, CandidatureRecruteurDTO
)

User = get_user_model()


class AdminPagination(PageNumberPagination):
    page_size = 5
    page_size_query_param = 'page_size'
    max_page_size = 100


class AdminOffresListAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        search = request.query_params.get('search', '')
        offres = OffreEmploi.objects.all().order_by('-date_publication')
        if search:
            offres = offres.filter(
                Q(titre__icontains=search) | Q(entreprise__nom_entreprise__icontains=search)
            )
        paginator = AdminPagination()
        result_page = paginator.paginate_queryset(offres, request)
        serializer = OffreDashboardDTO(result_page, many=True)
        return paginator.get_paginated_response(serializer.data)


class AdminOffreModerateAPIView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, offre_id):
        try:
            offre = OffreEmploi.objects.get(id=offre_id)
        except OffreEmploi.DoesNotExist:
            return Response({"error": "Offre introuvable."}, status=status.HTTP_404_NOT_FOUND)
        serializer = OffreEmploiSerializer(offre, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "message": "Offre modérée avec succès !",
                "offre": OffreDashboardDTO(offre).data
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminEntreprisesListAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        search = request.query_params.get('search', '')
        entreprises = ProfilEntreprise.objects.all().order_by('-id')
        if search:
            entreprises = entreprises.filter(
                Q(nom_entreprise__icontains=search) | Q(registre_commerce__icontains=search)
            )
        paginator = AdminPagination()
        result_page = paginator.paginate_queryset(entreprises, request)
        serializer = EntrepriseDashboardDetailSerializer(result_page, many=True)
        return paginator.get_paginated_response(serializer.data)


class AdminEntrepriseModerateAPIView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, entreprise_id):
        try:
            entreprise = ProfilEntreprise.objects.get(id=entreprise_id)
        except ProfilEntreprise.DoesNotExist:
            return Response({"error": "Entreprise introuvable."}, status=status.HTTP_404_NOT_FOUND)
        serializer = EntrepriseDashboardDetailSerializer(entreprise, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Statut mis à jour !"}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminStatsAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        stats = {
            "total_offres": OffreEmploi.objects.count(),
            "offres_attente": OffreEmploi.objects.filter(statut_moderation='EN_ATTENTE').count(),
            "total_entreprises": ProfilEntreprise.objects.count(),
            "entreprises_attente": ProfilEntreprise.objects.filter(est_approuvee=False).count(),
            "total_candidats": User.objects.filter(role='CANDIDAT').count(),
            "total_recruteurs": User.objects.filter(role='RECRUTEUR').count(),
            "total_recrutements": Candidature.objects.filter(statut='RETENU').count(),
        }
        return Response(stats, status=status.HTTP_200_OK)


class AdminUsersListAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        search = request.query_params.get('search', '')
        users = User.objects.exclude(is_superuser=True).order_by('-date_joined')
        if search:
            users = users.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search)
            )
        paginator = AdminPagination()
        result_page = paginator.paginate_queryset(users, request)
        serializer = AdminUserSerializer(result_page, many=True)
        return paginator.get_paginated_response(serializer.data)


class AdminUserModerateAPIView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            user.is_active = not user.is_active
            user.save()
            statut = "débloqué" if user.is_active else "bloqué"
            return Response({"message": f"Utilisateur {statut} !"}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "Utilisateur introuvable."}, status=status.HTTP_404_NOT_FOUND)


class AdminBroadcastEmailAPIView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        sujet = request.data.get('sujet')
        message = request.data.get('message')
        type_envoi = request.data.get('type_envoi')
        if not sujet or not message or type_envoi not in ['NEWSLETTER', 'EXCLUSIF']:
            return Response({"error": "Sujet, message et type valides requis."}, status=status.HTTP_400_BAD_REQUEST)
        if type_envoi == 'NEWSLETTER':
            profils = ProfilCandidat.objects.filter(notif_newsletter=True)
        else:
            profils = ProfilCandidat.objects.filter(notif_offres_exclusives=True)
        liste_emails = [p.user.email for p in profils if p.user.email]
        if not liste_emails:
            return Response({"message": "Aucun candidat abonné."}, status=status.HTTP_200_OK)
        try:
            email = EmailMessage(
                subject=sujet,
                body=message,
                from_email=settings.EMAIL_HOST_USER,
                to=[settings.EMAIL_HOST_USER],
                bcc=liste_emails
            )
            email.send(fail_silently=False)
            return Response({"message": f"Email envoyé à {len(liste_emails)} candidat(s) !"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminCandidaturesListAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        search = request.query_params.get('search', '')
        candidatures = Candidature.objects.all().order_by('-date_postulation')
        if search:
            candidatures = candidatures.filter(
                Q(candidat__first_name__icontains=search) |
                Q(candidat__last_name__icontains=search) |
                Q(nom_rapide__icontains=search) |
                Q(offre__titre__icontains=search) |
                Q(offre__entreprise__nom_entreprise__icontains=search)
            )
        paginator = PageNumberPagination()
        paginator.page_size = 10
        result_page = paginator.paginate_queryset(candidatures, request)
        serializer = CandidatureRecruteurDTO(result_page, many=True)
        data = []
        for index, item in enumerate(serializer.data):
            cand_obj = result_page[index]
            item['offre_titre'] = cand_obj.offre.titre
            item['entreprise_nom'] = cand_obj.offre.entreprise.nom_entreprise
            data.append(item)
        return paginator.get_paginated_response(data)


class ExportCandidaturesCSVAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
        response['Content-Disposition'] = 'attachment; filename="candidatures_taftech.csv"'
        writer = csv.writer(response, delimiter=';')
        writer.writerow(['ID', 'Date', 'Candidat', 'Email / Tel', 'Offre', 'Entreprise', 'Statut', 'Score IA (%)', 'Note Entretien (/20)'])
        for cand in Candidature.objects.all().order_by('-date_postulation'):
            if cand.candidat:
                nom = f"{cand.candidat.last_name} {cand.candidat.first_name}"
                contact = cand.candidat.email
            else:
                nom = f"{cand.nom_rapide} {cand.prenom_rapide} (Rapide)"
                contact = cand.email_rapide
            writer.writerow([
                cand.id,
                cand.date_postulation.strftime("%d/%m/%Y"),
                nom, contact,
                cand.offre.titre,
                cand.offre.entreprise.nom_entreprise,
                cand.get_statut_display(),
                cand.score_matching if cand.score_matching is not None else "N/A",
                cand.note_globale if cand.note_globale is not None else "Non évalué"
            ])
        return response


class ExportEntreprisesCSVAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
        response['Content-Disposition'] = 'attachment; filename="entreprises_taftech.csv"'
        writer = csv.writer(response, delimiter=';')
        writer.writerow(['ID', 'Nom', 'Secteur', 'Wilaya', 'Approuvée', 'Email', 'Téléphone'])
        for ent in ProfilEntreprise.objects.all().order_by('-id'):
            writer.writerow([
                ent.id, ent.nom_entreprise,
                ent.get_secteur_activite_display() if ent.secteur_activite else "",
                ent.wilaya_siege,
                'Oui' if ent.est_approuvee else 'Non',
                ent.user.email,
                ent.user.telephone if hasattr(ent.user, 'telephone') else ""
            ])
        return response


class ExportOffresCSVAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
        response['Content-Disposition'] = 'attachment; filename="offres_taftech.csv"'
        writer = csv.writer(response, delimiter=';')
        writer.writerow(['ID', 'Titre', 'Entreprise', 'Wilaya', 'Contrat', 'Statut', 'Clôturée', 'Date'])
        for offre in OffreEmploi.objects.all().order_by('-date_publication'):
            writer.writerow([
                offre.id, offre.titre,
                offre.entreprise.nom_entreprise,
                offre.wilaya,
                offre.get_type_contrat_display() if offre.type_contrat else "",
                offre.get_statut_moderation_display(),
                'Oui' if offre.est_cloturee else 'Non',
                offre.date_publication.strftime("%d/%m/%Y")
            ])
        return response


class ExportUtilisateursCSVAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
        response['Content-Disposition'] = 'attachment; filename="utilisateurs_taftech.csv"'
        writer = csv.writer(response, delimiter=';')
        writer.writerow(['ID', 'Email', 'Nom', 'Prénom', 'Rôle', 'Actif', 'Date Inscription'])
        for u in User.objects.all().order_by('-date_joined'):
            writer.writerow([
                u.id, u.email, u.last_name, u.first_name,
                getattr(u, 'role', 'CANDIDAT'),
                'Oui' if u.is_active else 'Non',
                u.date_joined.strftime("%d/%m/%Y") if u.date_joined else ""
            ])
        return response


class AdminMarcheAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)

        def extraire_montant(s):
            if not s:
                return None
            chiffres = re.findall(r'\d+', s.replace(' ', ''))
            return int(chiffres[0]) if chiffres else None

        offres_avec_salaire = OffreEmploi.objects.filter(
            salaire_propose__isnull=False, statut_moderation='APPROUVEE'
        ).exclude(salaire_propose='').values('specialite', 'salaire_propose')
        salaires_offres = {}
        for o in offres_avec_salaire:
            m = extraire_montant(o['salaire_propose'])
            if m and o['specialite']:
                salaires_offres.setdefault(o['specialite'], []).append(m)

        candidats_avec_salaire = ProfilCandidat.objects.filter(
            salaire_souhaite__isnull=False
        ).exclude(salaire_souhaite='').values('secteur_souhaite', 'salaire_souhaite')
        salaires_candidats = {}
        for c in candidats_avec_salaire:
            m = extraire_montant(c['salaire_souhaite'])
            if m and c['secteur_souhaite']:
                salaires_candidats.setdefault(c['secteur_souhaite'], []).append(m)

        tous_secteurs = set(list(salaires_offres.keys()) + list(salaires_candidats.keys()))
        salaires_par_secteur = []
        for secteur in tous_secteurs:
            ol = salaires_offres.get(secteur, [])
            cl = salaires_candidats.get(secteur, [])
            salaires_par_secteur.append({
                'secteur': secteur,
                'moy_offres': int(sum(ol) / len(ol)) if ol else None,
                'moy_candidats': int(sum(cl) / len(cl)) if cl else None,
                'nb_offres': len(ol),
                'nb_candidats': len(cl),
            })
        salaires_par_secteur.sort(key=lambda x: x['nb_offres'] + x['nb_candidats'], reverse=True)

        top_wilayas = list(
            OffreEmploi.objects.filter(statut_moderation='APPROUVEE')
            .values('wilaya').annotate(nb_offres=Count('id')).order_by('-nb_offres')[:10]
        )
        top_secteurs = list(
            OffreEmploi.objects.filter(statut_moderation='APPROUVEE')
            .values('specialite').annotate(nb_offres=Count('id')).order_by('-nb_offres')[:10]
        )
        for s in top_secteurs:
            s['nb_candidats'] = ProfilCandidat.objects.filter(secteur_souhaite=s['specialite']).count()

        matching_moyen = Candidature.objects.filter(
            score_matching__isnull=False
        ).aggregate(moy=Avg('score_matching'))['moy']

        return Response({
            'salaires_par_secteur': salaires_par_secteur[:8],
            'top_wilayas': top_wilayas,
            'top_secteurs': top_secteurs,
            'matching_moyen': round(float(matching_moyen), 1) if matching_moyen else None,
        })