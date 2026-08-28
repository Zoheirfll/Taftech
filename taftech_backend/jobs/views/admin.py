from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.pagination import PageNumberPagination
from django.contrib.auth import get_user_model
from django.db.models import Q, Avg, Count
from django.http import HttpResponse
from django.core.mail import EmailMessage, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
import csv
import re
import datetime
from ..models import (
    OffreEmploi, Candidature, ProfilCandidat,
    ProfilEntreprise, AuditLog, DemandeActivationPremium, Domaine, Secteur,
    Article, FaqItem, CompetenceReferentiel, BanniereAccueil,
    Palier, AbonnementEntreprise,
)
from ..constants import WILAYAS_CHOICES
import django.utils.timezone as timezone
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


def _get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    return x_forwarded.split(',')[0].strip() if x_forwarded else request.META.get('REMOTE_ADDR')


def _audit(request, action, detail=''):
    AuditLog.objects.create(admin=request.user, action=action, detail=detail, ip=_get_client_ip(request))


def _envoyer_email_offre_approuvee(offre):
    entreprise = offre.entreprise
    email_destinataire = entreprise.user.email
    if not email_destinataire:
        return
    try:
        ctx = {
            'nom_entreprise': entreprise.nom_entreprise,
            'titre_offre': offre.titre,
            'annee': timezone.now().year,
        }
        html_body = render_to_string('emails/offre_approuvee.html', ctx)
        texte = f"Votre offre \"{offre.titre}\" a été approuvée et est désormais en ligne sur TafTech."
        msg = EmailMultiAlternatives(
            f"Offre approuvée — {offre.titre}",
            texte,
            settings.EMAIL_HOST_USER,
            [email_destinataire],
        )
        msg.attach_alternative(html_body, 'text/html')
        msg.send(fail_silently=True)
    except Exception:
        pass


class AdminOffresListAPIView(APIView):
    permission_classes = [IsAdminUser]

    ORDERING_FIELDS = {
        'date_publication': 'date_publication',
        'date_expiration': 'date_expiration',
        'titre': 'titre',
    }

    def get(self, request):
        search = request.query_params.get('search', '')
        statut = request.query_params.get('statut', '')
        ordering = request.query_params.get('ordering', '-date_publication')
        field = ordering.lstrip('-')
        if field not in self.ORDERING_FIELDS:
            ordering = '-date_publication'
        offres = OffreEmploi.objects.select_related('entreprise').all().order_by(ordering)
        if search:
            offres = offres.filter(
                Q(titre__icontains=search) | Q(entreprise__nom_entreprise__icontains=search)
            )
        if statut == 'CLOTUREE':
            offres = offres.filter(est_cloturee=True)
        elif statut in ('EN_ATTENTE', 'APPROUVEE', 'REJETEE'):
            offres = offres.filter(statut_moderation=statut, est_cloturee=False)
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
        statut_avant = offre.statut_moderation
        serializer = OffreEmploiSerializer(offre, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            nouveau_statut = request.data.get('statut_moderation', '')
            action = 'APPROUVER_OFFRE' if nouveau_statut == 'APPROUVEE' else 'REFUSER_OFFRE' if nouveau_statut == 'REFUSEE' else 'AUTRE'
            _audit(request, action, f"offre #{offre.id} - {offre.titre}")
            if nouveau_statut == 'APPROUVEE' and statut_avant != 'APPROUVEE':
                _envoyer_email_offre_approuvee(offre)
            return Response({
                "message": "Offre modérée avec succès !",
                "offre": OffreDashboardDTO(offre).data
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminEntreprisesListAPIView(APIView):
    permission_classes = [IsAdminUser]
    ORDERING_FIELDS = {'id': 'id', 'nom_entreprise': 'nom_entreprise'}

    def get(self, request):
        search = request.query_params.get('search', '')
        ordering = request.query_params.get('ordering', '-id')
        field = ordering.lstrip('-')
        if field not in self.ORDERING_FIELDS:
            ordering = '-id'
        entreprises = ProfilEntreprise.objects.all().order_by(ordering)
        if search:
            entreprises = entreprises.filter(
                Q(nom_entreprise__icontains=search) | Q(registre_commerce__icontains=search)
            )
        paginator = AdminPagination()
        result_page = paginator.paginate_queryset(entreprises, request)
        serializer = EntrepriseDashboardDetailSerializer(result_page, many=True)
        return paginator.get_paginated_response(serializer.data)


def _envoyer_email_entreprise_approuvee(entreprise):
    email_destinataire = entreprise.user.email
    if not email_destinataire:
        return
    try:
        ctx = {
            'nom_entreprise': entreprise.nom_entreprise,
            'annee': timezone.now().year,
        }
        html_body = render_to_string('emails/entreprise_approuvee.html', ctx)
        texte = f"Votre entreprise \"{entreprise.nom_entreprise}\" a été validée sur TafTech."
        msg = EmailMultiAlternatives(
            "Entreprise validée — TafTech",
            texte,
            settings.EMAIL_HOST_USER,
            [email_destinataire],
        )
        msg.attach_alternative(html_body, 'text/html')
        msg.send(fail_silently=True)
    except Exception:
        pass


class AdminEntrepriseModerateAPIView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, entreprise_id):
        try:
            entreprise = ProfilEntreprise.objects.get(id=entreprise_id)
        except ProfilEntreprise.DoesNotExist:
            return Response({"error": "Entreprise introuvable."}, status=status.HTTP_404_NOT_FOUND)
        etait_approuvee = entreprise.est_approuvee
        serializer = EntrepriseDashboardDetailSerializer(entreprise, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            approuvee = request.data.get('est_approuvee')
            action = 'APPROUVER_ENTREPRISE' if approuvee is True or approuvee == 'true' else 'REFUSER_ENTREPRISE' if approuvee is False or approuvee == 'false' else 'AUTRE'
            _audit(request, action, f"entreprise #{entreprise.id} - {entreprise.nom_entreprise}")
            if (approuvee is True or approuvee == 'true') and not etait_approuvee:
                _envoyer_email_entreprise_approuvee(entreprise)
            return Response({"message": "Statut mis à jour !"}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminStatsAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        maintenant = timezone.now()
        abonnements_actifs = AbonnementEntreprise.objects.select_related('palier').filter(
            Q(date_expiration__isnull=True) | Q(date_expiration__gte=maintenant)
        )
        premium_expirant_bientot = abonnements_actifs.filter(
            date_expiration__isnull=False,
            date_expiration__lte=maintenant + datetime.timedelta(days=7),
        ).count()

        # Revenu estimé : dernier paiement réel enregistré par entreprise abonnée (PaiementAbonnement),
        # sinon repli sur le prix mensuel catalogue du palier actif — approximation raisonnable,
        # pas une comptabilité exacte (n'inclut pas les activations manuelles sans paiement Chargily).
        revenu_premium_estime = 0
        for a in abonnements_actifs:
            dernier_paiement = a.entreprise.paiements_abonnement.order_by('-date_paiement').first()
            if dernier_paiement:
                revenu_premium_estime += dernier_paiement.montant_da
            elif a.palier.prix_mensuel_da:
                revenu_premium_estime += a.palier.prix_mensuel_da

        stats = {
            "total_offres": OffreEmploi.objects.count(),
            "offres_attente": OffreEmploi.objects.filter(statut_moderation='EN_ATTENTE').count(),
            "total_entreprises": ProfilEntreprise.objects.count(),
            "entreprises_attente": ProfilEntreprise.objects.filter(est_approuvee=False).count(),
            "total_candidats": User.objects.filter(role='CANDIDAT').count(),
            "total_recruteurs": User.objects.filter(role='RECRUTEUR').count(),
            "total_recrutements": Candidature.objects.filter(statut='RETENU').count(),
            "demandes_premium_attente": DemandeActivationPremium.objects.filter(est_traitee=False).count(),
            "premium_actifs": abonnements_actifs.count(),
            "premium_expirant_bientot": premium_expirant_bientot,
            "revenu_premium_estime": revenu_premium_estime,
            "nb_articles_publies": Article.objects.filter(statut='PUBLIE').count(),
            "nb_articles_brouillons": Article.objects.filter(statut='BROUILLON').count(),
            "nb_faq_actives": FaqItem.objects.filter(actif=True).count(),
            "nb_competences_referentiel": CompetenceReferentiel.objects.count(),
            "nb_bannieres_actives": BanniereAccueil.objects.filter(actif=True).count(),
        }
        return Response(stats, status=status.HTTP_200_OK)


class AdminSeoStatsAPIView(APIView):
    """Compteurs réels par type de page publique + un exemple d'URL tel que généré par
    seo_views.py::SitemapXMLView — pour que le panel SEO admin ne montre jamais un
    statut ✓ figé ou une URL d'exemple qui ne correspond plus au vrai schéma."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        base = settings.SITE_URL.rstrip('/')

        offre = OffreEmploi.objects.select_related('entreprise').filter(
            est_active=True, statut_moderation='APPROUVEE', est_cloturee=False
        ).only('titre', 'specialite', 'code_public', 'entreprise__slug').first()
        nb_offres = OffreEmploi.objects.filter(
            est_active=True, statut_moderation='APPROUVEE', est_cloturee=False
        ).count()
        exemple_offre = None
        if offre:
            from django.utils.text import slugify
            domaine = Domaine.objects.select_related('secteur').filter(code=offre.specialite).first()
            secteur_slug = slugify(domaine.secteur.libelle) if domaine else "offres-d-emploi"
            titre_slug = slugify(offre.titre)
            chemin = f"{titre_slug}-{offre.code_public}" if titre_slug else offre.code_public
            exemple_offre = f"{base}/entreprises/{offre.entreprise.slug}/offres-d-emploi/{secteur_slug}/{chemin}/"

        entreprise = ProfilEntreprise.objects.filter(est_approuvee=True).only('slug').first()
        nb_entreprises = ProfilEntreprise.objects.filter(est_approuvee=True).count()

        domaine_exemple = Domaine.objects.only('code', 'libelle').first()
        nb_domaines = Domaine.objects.count()

        secteur_exemple = Secteur.objects.only('code', 'libelle').first()
        nb_secteurs = Secteur.objects.count()

        wilaya_exemple = WILAYAS_CHOICES[0][0] if WILAYAS_CHOICES else None
        nb_wilayas = len(WILAYAS_CHOICES)

        article = Article.objects.filter(statut='PUBLIE').only('slug').order_by('-date_publication').first()
        nb_articles = Article.objects.filter(statut='PUBLIE').count()

        from django.utils.text import slugify as _slugify

        pages = [
            {
                "type": "Offre d'emploi",
                "url": exemple_offre,
                "nb_pages_indexables": nb_offres,
                "ok": nb_offres > 0,
            },
            {
                "type": "Entreprise",
                "url": f"{base}/entreprise/{entreprise.slug}/" if entreprise else None,
                "nb_pages_indexables": nb_entreprises,
                "ok": nb_entreprises > 0,
            },
            {
                "type": "Métier",
                "url": f"{base}/metiers/{domaine_exemple.code.lower()}-{_slugify(domaine_exemple.libelle)}/" if domaine_exemple else None,
                "nb_pages_indexables": nb_domaines,
                "ok": nb_domaines > 0,
            },
            {
                "type": "Secteur",
                "url": f"{base}/secteurs/{secteur_exemple.code.lower()}-{_slugify(secteur_exemple.libelle)}/" if secteur_exemple else None,
                "nb_pages_indexables": nb_secteurs,
                "ok": nb_secteurs > 0,
            },
            {
                "type": "Wilaya",
                "url": (
                    f"{base}/regions/{wilaya_exemple.partition(' - ')[0]}-{_slugify(wilaya_exemple.partition(' - ')[2])}/"
                    if wilaya_exemple else None
                ),
                "nb_pages_indexables": nb_wilayas,
                "ok": nb_wilayas > 0,
            },
            {
                "type": "Blog / Article",
                "url": f"{base}/blog/{article.slug}/" if article else None,
                "nb_pages_indexables": nb_articles,
                "ok": nb_articles > 0,
            },
        ]

        return Response({
            "pages": pages,
            "sitemap_url": f"{base}/sitemap.xml",
            "robots_url": f"{base}/robots.txt",
            "total_urls_sitemap": sum(p["nb_pages_indexables"] for p in pages) + 9,  # +9 = STATIC_PATHS
        }, status=status.HTTP_200_OK)


class AdminUsersListAPIView(APIView):
    permission_classes = [IsAdminUser]
    ORDERING_FIELDS = {'date_joined': 'date_joined', 'last_name': 'last_name'}

    def get(self, request):
        search = request.query_params.get('search', '')
        role = request.query_params.get('role', '')
        ordering = request.query_params.get('ordering', '-date_joined')
        field = ordering.lstrip('-')
        if field not in self.ORDERING_FIELDS:
            ordering = '-date_joined'
        users = User.objects.exclude(is_superuser=True).order_by(ordering)
        if search:
            users = users.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search)
            )
        counts = {
            'CANDIDAT': users.filter(role='CANDIDAT').count(),
            'RECRUTEUR': users.filter(role='RECRUTEUR').count(),
            'ADMIN': users.filter(role='ADMIN').count(),
        }
        if role in ('CANDIDAT', 'RECRUTEUR', 'ADMIN'):
            users = users.filter(role=role)
        paginator = AdminPagination()
        result_page = paginator.paginate_queryset(users, request)
        serializer = AdminUserSerializer(result_page, many=True)
        response = paginator.get_paginated_response(serializer.data)
        response.data['counts'] = counts
        return response


class AdminUserModerateAPIView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            user.is_active = not user.is_active
            user.save()
            statut = "débloqué" if user.is_active else "bloqué"
            _audit(request, 'SUPPRIMER_USER', f"user #{user.id} - {user.email} ({statut})")
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
            ctx = {'sujet': sujet, 'message': message, 'annee': datetime.datetime.now().year}
            html_body = render_to_string('emails/broadcast.html', ctx)
            email = EmailMultiAlternatives(
                subject=sujet,
                body=message,
                from_email=settings.EMAIL_HOST_USER,
                to=[settings.EMAIL_HOST_USER],
                bcc=liste_emails,
            )
            email.attach_alternative(html_body, 'text/html')
            email.send(fail_silently=False)
            return Response({"message": f"Email envoyé à {len(liste_emails)} candidat(s) !"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminCandidaturesListAPIView(APIView):
    permission_classes = [IsAdminUser]
    ORDERING_FIELDS = {'date_postulation': 'date_postulation', 'score_matching': 'score_matching', 'note_globale': 'note_globale'}

    def get(self, request):
        search = request.query_params.get('search', '')
        statut = request.query_params.get('statut', '')
        ordering = request.query_params.get('ordering', '-date_postulation')
        field = ordering.lstrip('-')
        if field not in self.ORDERING_FIELDS:
            ordering = '-date_postulation'
        candidatures = Candidature.objects.select_related('candidat', 'offre__entreprise').order_by(ordering)
        if search:
            candidatures = candidatures.filter(
                Q(candidat__first_name__icontains=search) |
                Q(candidat__last_name__icontains=search) |
                Q(nom_rapide__icontains=search) |
                Q(offre__titre__icontains=search) |
                Q(offre__entreprise__nom_entreprise__icontains=search)
            )
        if statut:
            candidatures = candidatures.filter(statut=statut)
        paginator = PageNumberPagination()
        paginator.page_size = 10
        result_page = paginator.paginate_queryset(candidatures, request)
        serializer = CandidatureRecruteurDTO(result_page, many=True)
        data = []
        for index, item in enumerate(serializer.data):
            cand_obj = result_page[index]
            item['offre_titre'] = cand_obj.offre.titre
            item['offre_id'] = cand_obj.offre.id
            item['entreprise_nom'] = cand_obj.offre.entreprise.nom_entreprise
            item['entreprise_slug'] = cand_obj.offre.entreprise.slug
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
    permission_classes = [IsAdminUser]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)

        def extraire_montant(s):
            if not s:
                return None
            chiffres = re.findall(r'\d+', s.replace(' ', ''))
            return int(chiffres[0]) if chiffres else None

        # 🐛 Ancien calcul cassé : comparait le salaire proposé (fiable, saisi par le recruteur)
        # au salaire "souhaité" DÉCLARÉ par le candidat (ProfilCandidat.salaire_souhaite,
        # CharField libre quasi jamais rempli en pratique) — résultat : moy_candidats/écart
        # toujours None/"N/A" pour toutes les lignes, pas un bug de calcul mais une donnée
        # source vide. Remplacé par un signal fiable : les CANDIDATURES réellement déposées
        # par secteur (toujours peuplé, chaque candidature est liée à une offre avec une
        # spécialité réelle) — mesure la tension marché (offres vs candidatures) au lieu
        # d'une comparaison de salaires qui n'a jamais eu de données côté candidat.
        offres_avec_salaire = OffreEmploi.objects.filter(
            salaire_propose__isnull=False, statut_moderation='APPROUVEE'
        ).exclude(salaire_propose='').values('specialite', 'salaire_propose')
        salaires_offres = {}
        for o in offres_avec_salaire:
            m = extraire_montant(o['salaire_propose'])
            if m and o['specialite']:
                salaires_offres.setdefault(o['specialite'], []).append(m)

        nb_offres_par_secteur = {
            row['specialite']: row['n']
            for row in OffreEmploi.objects.filter(statut_moderation='APPROUVEE')
            .exclude(specialite__isnull=True).exclude(specialite='')
            .values('specialite').annotate(n=Count('id'))
        }
        nb_candidatures_par_secteur = {
            row['offre__specialite']: row['n']
            for row in Candidature.objects.exclude(offre__specialite__isnull=True).exclude(offre__specialite='')
            .values('offre__specialite').annotate(n=Count('id'))
        }

        tous_secteurs = set(list(salaires_offres.keys()) + list(nb_offres_par_secteur.keys()) + list(nb_candidatures_par_secteur.keys()))
        libelles_domaines = dict(
            Domaine.objects.filter(code__in=tous_secteurs).values_list('code', 'libelle')
        )
        tension_par_secteur = []
        for secteur in tous_secteurs:
            ol = salaires_offres.get(secteur, [])
            nb_offres = nb_offres_par_secteur.get(secteur, 0)
            nb_candidatures = nb_candidatures_par_secteur.get(secteur, 0)
            tension_par_secteur.append({
                'secteur': libelles_domaines.get(secteur, secteur),
                'moy_salaire_offres': int(sum(ol) / len(ol)) if ol else None,
                'nb_offres': nb_offres,
                'nb_candidatures': nb_candidatures,
                # Candidatures par offre publiée — élevé = beaucoup d'intérêt par poste (marché
                # employeur), bas/proche de 0 = peu de candidats pour beaucoup de postes (pénurie
                # de profils, marché candidat). None si secteur sans offre active (rien à mesurer).
                'candidatures_par_offre': round(nb_candidatures / nb_offres, 1) if nb_offres else None,
            })
        tension_par_secteur.sort(key=lambda x: x['nb_offres'] + x['nb_candidatures'], reverse=True)

        top_wilayas = list(
            OffreEmploi.objects.filter(statut_moderation='APPROUVEE')
            .values('wilaya').annotate(nb_offres=Count('id')).order_by('-nb_offres')[:10]
        )
        top_secteurs = list(
            OffreEmploi.objects.filter(statut_moderation='APPROUVEE')
            .values('specialite').annotate(nb_offres=Count('id')).order_by('-nb_offres')[:10]
        )
        for s in top_secteurs:
            # Candidatures réellement déposées sur des offres de ce secteur — remplace l'ancien
            # `ProfilCandidat.secteur_souhaite` (préférence déclarée, très rarement renseignée).
            s['nb_candidats'] = nb_candidatures_par_secteur.get(s['specialite'], 0)

        matching_moyen = Candidature.objects.filter(
            score_matching__isnull=False
        ).aggregate(moy=Avg('score_matching'))['moy']

        return Response({
            'tension_par_secteur': tension_par_secteur[:8],
            'top_wilayas': top_wilayas,
            'top_secteurs': top_secteurs,
            'matching_moyen': round(float(matching_moyen), 1) if matching_moyen else None,
        })


class AdminAuditLogAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        logs = AuditLog.objects.select_related('admin').all()
        search = request.query_params.get('search', '').strip()
        if search:
            logs = logs.filter(
                Q(admin__email__icontains=search) |
                Q(action__icontains=search) |
                Q(detail__icontains=search)
            )
        paginator = AdminPagination()
        paginator.page_size = int(request.query_params.get('page_size', 20))
        result_page = paginator.paginate_queryset(logs, request)
        data = [
            {
                'id': log.id,
                'admin': log.admin.email if log.admin else '—',
                'action': log.action,
                'detail': log.detail,
                'ip': log.ip,
                'date': log.date.strftime('%d/%m/%Y %H:%M'),
            }
            for log in result_page
        ]
        return paginator.get_paginated_response(data)


class AdminDemandesPremiumAPIView(APIView):
    """Activation manuelle CIB/EDAHABIA — depuis le 27/08/2026, crée/prolonge un
    AbonnementEntreprise(palier=<choisi par l'admin>) au lieu d'écrire est_premium/
    premium_expire_at (système legacy supprimé). `nb_mois` reste sur DemandeActivationPremium
    pour l'affichage historique de la demande, mais n'est plus utilisé pour calculer un prix."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from ..paliers_utils import get_palier_actif
        demandes = DemandeActivationPremium.objects.select_related('entreprise__user', 'entreprise__abonnement__palier').order_by('-date_demande')
        data = []
        for d in demandes:
            palier = get_palier_actif(d.entreprise)
            abonnement = getattr(d.entreprise, 'abonnement', None)
            data.append({
                'id': d.id,
                'entreprise_id': d.entreprise.id,
                'nom_entreprise': d.entreprise.nom_entreprise,
                'email': d.entreprise.user.email,
                'telephone': d.entreprise.user.telephone,
                'moyen_paiement': d.moyen_paiement,
                'nb_mois': d.nb_mois,
                'date_demande': d.date_demande.strftime('%d/%m/%Y %H:%M'),
                'est_traitee': d.est_traitee,
                'date_traitement': d.date_traitement.strftime('%d/%m/%Y %H:%M') if d.date_traitement else None,
                'palier_actif': palier.nom if palier else None,
                'abonnement_expire_at': abonnement.date_expiration.strftime('%d/%m/%Y') if abonnement and abonnement.date_expiration else None,
            })
        return Response(data)

    def patch(self, request, demande_id):
        try:
            demande = DemandeActivationPremium.objects.get(id=demande_id)
        except DemandeActivationPremium.DoesNotExist:
            return Response({'error': 'Demande introuvable.'}, status=404)
        try:
            nb_mois = max(1, min(int(request.data.get('nb_mois', demande.nb_mois)), 60))
        except (TypeError, ValueError):
            return Response({'error': 'nb_mois doit être un nombre entier.'}, status=400)
        nom_palier = request.data.get('palier', 'BUSINESS')
        try:
            palier = Palier.objects.get(nom=nom_palier)
        except Palier.DoesNotExist:
            return Response({'error': f"Palier '{nom_palier}' introuvable."}, status=400)

        entreprise = demande.entreprise
        from ..paliers_utils import get_palier_actif
        palier_actuel = get_palier_actif(entreprise)
        abonnement = getattr(entreprise, 'abonnement', None)
        # Prolonger si un abonnement (même expiré) existe déjà, sinon partir de maintenant
        base = abonnement.date_expiration if (abonnement and abonnement.date_expiration and palier_actuel) else timezone.now()
        nouvelle_expiration = base + datetime.timedelta(days=30 * nb_mois)
        if abonnement:
            abonnement.palier = palier
            abonnement.date_expiration = nouvelle_expiration
            abonnement.save(update_fields=['palier', 'date_expiration'])
        else:
            AbonnementEntreprise.objects.create(
                entreprise=entreprise, palier=palier, date_expiration=nouvelle_expiration,
            )
        demande.est_traitee = True
        demande.date_traitement = timezone.now()
        demande.save()
        _audit(request, 'AUTRE', f"Palier {palier.get_nom_display()} ({nb_mois} mois) activé pour {entreprise.nom_entreprise} — expire {nouvelle_expiration.strftime('%d/%m/%Y')}")
        return Response({
            'message': 'Abonnement activé.',
            'palier': palier.nom,
            'abonnement_expire_at': nouvelle_expiration.strftime('%d/%m/%Y'),
        })


class AdminCompteAdminsAPIView(APIView):
    """Gestion des comptes administrateurs (liste, créer, modifier, supprimer)."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        admins = User.objects.filter(is_staff=True).order_by('-date_joined')
        data = [
            {
                'id': u.id,
                'email': u.email,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'telephone': u.telephone or '',
                'is_superuser': u.is_superuser,
                'is_active': u.is_active,
                'date_joined': u.date_joined.strftime('%d/%m/%Y'),
            }
            for u in admins
        ]
        return Response(data)

    def post(self, request):
        email = request.data.get('email', '').strip()
        password = request.data.get('password', '').strip()
        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()
        telephone = request.data.get('telephone', '').strip()

        if not email or not password:
            return Response({'error': 'Email et mot de passe obligatoires.'}, status=400)
        if User.objects.filter(email=email).exists():
            return Response({'error': 'Un compte avec cet email existe déjà.'}, status=400)
        if len(password) < 8:
            return Response({'error': 'Le mot de passe doit contenir au moins 8 caractères.'}, status=400)

        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            telephone=telephone,
            is_active=True,
        )
        user.is_staff = True
        user.role = 'ADMIN'
        user.save(update_fields=['is_staff', 'role'])
        _audit(request, 'AUTRE', f"Nouveau compte admin créé : {email}")
        return Response({'message': 'Compte admin créé.', 'id': user.id}, status=201)

    def patch(self, request, admin_id):
        try:
            user = User.objects.get(id=admin_id, is_staff=True)
        except User.DoesNotExist:
            return Response({'error': 'Admin introuvable.'}, status=404)

        if user.is_superuser and not request.user.is_superuser:
            return Response({'error': 'Impossible de modifier un superutilisateur.'}, status=403)

        email = request.data.get('email', user.email).strip()
        first_name = request.data.get('first_name', user.first_name).strip()
        last_name = request.data.get('last_name', user.last_name).strip()
        telephone = request.data.get('telephone', '').strip()
        password = request.data.get('password', '').strip()

        if email != user.email and User.objects.filter(email=email).exclude(id=admin_id).exists():
            return Response({'error': 'Cet email est déjà utilisé.'}, status=400)

        user.email = email
        user.username = email
        user.first_name = first_name
        user.last_name = last_name
        user.telephone = telephone
        if password:
            if len(password) < 8:
                return Response({'error': 'Le mot de passe doit contenir au moins 8 caractères.'}, status=400)
            user.set_password(password)
        user.save()
        _audit(request, 'AUTRE', f"Compte admin modifié : {email}")
        return Response({'message': 'Compte mis à jour.'})

    def delete(self, request, admin_id):
        try:
            user = User.objects.get(id=admin_id, is_staff=True)
        except User.DoesNotExist:
            return Response({'error': 'Admin introuvable.'}, status=404)

        if user.id == request.user.id:
            return Response({'error': 'Impossible de supprimer votre propre compte.'}, status=400)
        if user.is_superuser:
            return Response({'error': 'Impossible de supprimer un superutilisateur.'}, status=403)

        email = user.email
        user.delete()
        _audit(request, 'AUTRE', f"Compte admin supprimé : {email}")
        return Response({'message': 'Compte admin supprimé.'}, status=204)
