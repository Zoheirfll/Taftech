"""Exports du tableau de bord recruteur : rapport PDF et classeurs Excel."""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Count
from django.conf import settings
from django.utils import timezone
import datetime
from ..models import OffreEmploi, Candidature
from ..informations_societe import ligne_pied_de_page
from .equipe import get_entreprise_for_user
from ..throttles import WriteActionThrottle
from .export_xlsx import neutraliser_formules, reponse_xlsx
from .recruteur_dashboard import _calculer_kpis_periode



class RapportDashboardPDFAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({"error": "Profil entreprise introuvable."}, status=404)
        date_fin_str = request.GET.get('date_fin')
        date_debut_str = request.GET.get('date_debut')
        aujourdhui = timezone.now().date()
        try:
            date_fin = datetime.date.fromisoformat(date_fin_str) if date_fin_str else aujourdhui
            date_debut = datetime.date.fromisoformat(date_debut_str) if date_debut_str else (date_fin - datetime.timedelta(days=30))
        except ValueError:
            return Response({"error": "Format de date invalide."}, status=400)

        kpis = _calculer_kpis_periode(entreprise, date_debut, date_fin)

        import os
        import io
        from django.conf import settings
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import mm
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

        INDIGO = colors.HexColor("#204883")
        TEAL = colors.HexColor("#307020")
        SLATE = colors.HexColor("#1e293b")
        SLATE_LIGHT = colors.HexColor("#64748b")
        WHITE = colors.white
        BG_LIGHT = colors.HexColor("#f8fafc")
        BORDER = colors.HexColor("#e2e8f0")

        def style(name, **kwargs):
            return ParagraphStyle(name, **kwargs)

        s_tagline = style("tagline", fontSize=9, textColor=colors.HexColor("#93c5fd"), fontName="Helvetica", alignment=TA_LEFT)
        s_h2 = style("h2", fontSize=11, textColor=INDIGO, fontName="Helvetica-Bold", spaceBefore=10, spaceAfter=6)
        s_body = style("body", fontSize=9, textColor=SLATE_LIGHT, fontName="Helvetica")
        s_kpi_label = style("kpi_label", fontSize=8, textColor=SLATE_LIGHT, fontName="Helvetica", alignment=TA_CENTER)
        s_kpi_value = style("kpi_value", fontSize=18, textColor=INDIGO, fontName="Helvetica-Bold", alignment=TA_CENTER)
        s_footer = style("footer", fontSize=8, textColor=SLATE_LIGHT, fontName="Helvetica", alignment=TA_CENTER)

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=20 * mm, leftMargin=20 * mm, topMargin=15 * mm, bottomMargin=20 * mm)
        story = []

        logo_path = os.path.join(settings.BASE_DIR, '..', 'taftech_frontend', 'src', 'assets', 'logo-taftech.png')
        logo_cell = Image(logo_path, width=28 * mm, height=14 * mm) if os.path.exists(logo_path) else Paragraph("TAFTECH", style("brand", fontSize=22, textColor=WHITE, fontName="Helvetica-Bold"))

        # EN-TÊTE
        header_data = [[
            logo_cell,
            Paragraph(f"RAPPORT DE RECRUTEMENT<br/><font size='9' color='#93c5fd'>{entreprise.nom_entreprise}</font>",
                      style("h_right", fontSize=13, textColor=WHITE, fontName="Helvetica-Bold", alignment=TA_RIGHT, leading=18)),
        ], [
            Paragraph("Plateforme de recrutement intelligente en Algérie", s_tagline),
            Paragraph(f"<font size='8' color='#93c5fd'>Généré le {timezone.now().strftime('%d/%m/%Y')}</font>",
                      style("h_date", fontSize=8, textColor=colors.HexColor("#93c5fd"), fontName="Helvetica", alignment=TA_RIGHT)),
        ]]
        header_table = Table(header_data, colWidths=[90 * mm, 80 * mm])
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), INDIGO),
            ('PADDING', (0, 0), (-1, -1), 10),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 6 * mm))

        story.append(Paragraph(f"Période analysée : <b>{date_debut.strftime('%d/%m/%Y')} — {date_fin.strftime('%d/%m/%Y')}</b>", s_body))
        story.append(Spacer(1, 4 * mm))
        story.append(Paragraph("Indicateurs clés", s_h2))

        libelles = {
            "offres_actives": "Offres actives", "candidatures_recues": "Candidatures reçues",
            "candidats_entretien": "En entretien", "recrutements": "Recrutements",
            "taux_conversion": "Taux de conversion",
        }
        kpi_cells = []
        for cle, libelle in libelles.items():
            valeur = kpis[cle]["valeur"]
            suffixe = "%" if cle == "taux_conversion" else ""
            kpi_cells.append(Table(
                [[Paragraph(f"{valeur}{suffixe}", s_kpi_value)], [Paragraph(libelle, s_kpi_label)]],
                colWidths=[32 * mm],
            ))
        kpi_row = Table([kpi_cells], colWidths=[34 * mm] * len(kpi_cells))
        kpi_row.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
            ('BOX', (0, 0), (-1, -1), 0.5, BORDER),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER),
            ('TOPPADDING', (0, 0), (-1, -1), 10), ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(kpi_row)
        story.append(Spacer(1, 8 * mm))
        story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER))
        story.append(Spacer(1, 2 * mm))

        story.append(Paragraph("Top 5 offres (candidatures reçues sur la période)", s_h2))
        offres_periode = OffreEmploi.objects.filter(entreprise=entreprise).annotate(
            nb_candidatures_periode=Count(
                'candidatures', filter=Q(
                    candidatures__date_postulation__date__gte=date_debut,
                    candidatures__date_postulation__date__lte=date_fin,
                )
            )
        ).order_by('-nb_candidatures_periode')[:5]
        offres_rows = [["Offre", "Candidatures"]]
        for o in offres_periode:
            offres_rows.append([o.titre, str(o.nb_candidatures_periode)])
        if len(offres_rows) == 1:
            offres_rows.append(["Aucune offre sur cette période.", ""])
        offres_table = Table(offres_rows, colWidths=[130 * mm, 40 * mm])
        offres_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), INDIGO), ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9), ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, BG_LIGHT]),
            ('TOPPADDING', (0, 0), (-1, -1), 7), ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(offres_table)
        story.append(Spacer(1, 10 * mm))
        story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER))
        story.append(Spacer(1, 2 * mm))
        story.append(Paragraph(
            ligne_pied_de_page(),
            s_footer,
        ))

        doc.build(story)
        buffer.seek(0)
        from django.http import HttpResponse
        response = HttpResponse(buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="rapport_taftech_{date_debut}_{date_fin}.pdf"'
        return response


def _construire_classeur_candidatures(candidatures, inclure_offre=False):
    """Construit un classeur Excel (openpyxl) à partir d'un queryset/liste de Candidature."""
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment

    wb = Workbook()
    ws = wb.active
    ws.title = "Candidatures"

    entetes = ["Date", "Candidat", "Email", "Téléphone"]
    if inclure_offre:
        entetes.append("Offre")
    entetes += [
        "Statut", "Score matching IA (%)",
        "Note technique (/5)", "Note communication (/5)",
        "Note motivation (/5)", "Note expérience (/5)",
        "Note globale (/20)", "Commentaire recruteur",
    ]
    ws.append(entetes)
    for cell in ws[1]:
        cell.font = Font(bold=True)
        cell.alignment = Alignment(vertical="center")

    for cand in candidatures:
        if cand.candidat:
            nom = f"{cand.candidat.last_name} {cand.candidat.first_name}".strip()
            email = cand.candidat.email
            telephone = getattr(cand.candidat, 'telephone', '') or ''
        else:
            nom = f"{cand.nom_rapide or ''} {cand.prenom_rapide or ''}".strip()
            email = cand.email_rapide or ''
            telephone = getattr(cand, 'telephone_rapide', '') or ''
        ligne = [
            cand.date_postulation.strftime("%d/%m/%Y") if cand.date_postulation else '',
            nom, email, telephone,
        ]
        if inclure_offre:
            ligne.append(cand.offre.titre)
        ligne += [
            cand.get_statut_display(),
            cand.score_matching if cand.score_matching is not None else '',
            cand.note_technique if cand.note_technique is not None else '',
            cand.note_communication if cand.note_communication is not None else '',
            cand.note_motivation if cand.note_motivation is not None else '',
            cand.note_experience if cand.note_experience is not None else '',
            float(cand.note_globale) if cand.note_globale is not None else '',
            cand.commentaire_evaluation or '',
        ]
        ws.append(ligne)
    neutraliser_formules(ws)

    for col_cells in ws.columns:
        longueur = max((len(str(c.value)) for c in col_cells if c.value is not None), default=10)
        ws.column_dimensions[col_cells[0].column_letter].width = min(longueur + 2, 50)
    ws.freeze_panes = "A2"
    return wb


class ExportCandidaturesOffreExcelAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, offre_id):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({"error": "Profil entreprise introuvable."}, status=status.HTTP_404_NOT_FOUND)
        from ..paliers_utils import reponse_entreprise_non_validee
        refus = reponse_entreprise_non_validee(entreprise)
        if refus:
            return refus
        try:
            offre = OffreEmploi.objects.get(id=offre_id, entreprise=entreprise)
        except OffreEmploi.DoesNotExist:
            return Response({"error": "Offre introuvable."}, status=status.HTTP_404_NOT_FOUND)
        candidatures = offre.candidatures.select_related('candidat').order_by('-date_postulation')
        wb = _construire_classeur_candidatures(candidatures, inclure_offre=False)

        from django.http import HttpResponse
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        nom_fichier = f"candidatures_{offre.titre[:40].replace(' ', '_')}.xlsx"
        response['Content-Disposition'] = f'attachment; filename="{nom_fichier}"'
        wb.save(response)
        return response


class ExportCandidaturesExcelAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({"error": "Profil entreprise introuvable."}, status=status.HTTP_404_NOT_FOUND)
        from ..paliers_utils import reponse_entreprise_non_validee
        refus = reponse_entreprise_non_validee(entreprise)
        if refus:
            return refus
        candidatures = (
            Candidature.objects.select_related('candidat', 'offre')
            .filter(offre__entreprise=entreprise)
            .order_by('-date_postulation')
        )
        wb = _construire_classeur_candidatures(candidatures, inclure_offre=True)

        from django.http import HttpResponse
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="candidatures_taftech.xlsx"'
        wb.save(response)
        return response


EXPORT_GRAPHIQUE_MAX_LIGNES = 20000  # très au-dessus d'un vrai graphique ; borne seulement l'abus
EXPORT_GRAPHIQUE_MAX_COLONNES = 50


class ExportGraphiqueExcelAPIView(APIView):
    """Export .xlsx générique pour les graphiques du dashboard/statistiques recruteur
    (MiniAreaChart) — remplace l'ancien export CSV fait à la main côté client, qui
    s'ouvrait mal sur mobile (tout dans une seule colonne, séparateur/BOM mal interprété
    par les applications mobiles). Les données sont déjà agrégées côté client (le
    graphique les a déjà calculées pour l'affichage) — cette vue se contente de les
    mettre en forme dans un vrai classeur Excel, aucune requête DB supplémentaire.
    Scopée à l'entreprise de l'utilisateur connecté par simple exigence d'authentification
    (aucune donnée sensible d'autrui n'est manipulée ici, uniquement la mise en forme)."""
    permission_classes = [IsAuthenticated]
    throttle_classes = [WriteActionThrottle]

    def post(self, request):
        titre = str(request.data.get('titre', 'export'))[:80] or 'export'
        colonnes = request.data.get('colonnes')
        lignes = request.data.get('lignes')
        if not isinstance(colonnes, list) or not colonnes or not isinstance(lignes, list):
            return Response({"error": "Format invalide : 'colonnes' (liste) et 'lignes' (liste de listes) requis."}, status=400)

        if len(lignes) > EXPORT_GRAPHIQUE_MAX_LIGNES or len(colonnes) > EXPORT_GRAPHIQUE_MAX_COLONNES:
            return Response(
                {"error": f"Export trop volumineux (maximum {EXPORT_GRAPHIQUE_MAX_LIGNES} lignes et {EXPORT_GRAPHIQUE_MAX_COLONNES} colonnes)."},
                status=400,
            )

        nom_fichier = "".join(c if c.isalnum() or c in "-_ " else "_" for c in titre)[:60] or "export"
        return reponse_xlsx(nom_fichier, titre, colonnes, lignes)
