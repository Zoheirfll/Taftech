from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.http import HttpResponse
from django.conf import settings
from django.utils import timezone
import os
import io

from .equipe import get_entreprise_for_user
from ..models import PaiementAbonnement, MentionsLegalesEntreprise

NOM_PALIERS = {"STARTER": "Starter", "PRO": "Pro", "BUSINESS": "Business", "ENTERPRISE": "Enterprise"}


class FacturesListAPIView(APIView):
    """Historique des factures (paiements de palier) de l'entreprise connectée."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entreprise = get_entreprise_for_user(request.user)
        if not entreprise:
            return Response({"error": "Profil entreprise introuvable."}, status=404)
        paiements = PaiementAbonnement.objects.filter(entreprise=entreprise)
        data = [
            {
                "id": p.id,
                "numero_facture": p.numero_facture,
                "palier_nom": p.palier_nom,
                "montant_da": p.montant_da,
                "periode": p.periode,
                "date_paiement": p.date_paiement.strftime('%d/%m/%Y'),
            }
            for p in paiements
        ]
        return Response(data)


class FacturePDFAPIView(APIView):
    """Génère la facture PDF d'un paiement — accès restreint à l'entreprise concernée ou un admin."""
    permission_classes = [IsAuthenticated]

    def get(self, request, paiement_id):
        try:
            paiement = PaiementAbonnement.objects.select_related('entreprise').get(id=paiement_id)
        except PaiementAbonnement.DoesNotExist:
            return Response({"error": "Facture introuvable."}, status=404)

        entreprise = get_entreprise_for_user(request.user)
        if request.user.role != 'ADMIN' and (not entreprise or entreprise.id != paiement.entreprise_id):
            return Response({"error": "Accès refusé."}, status=403)

        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import mm
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image,
        )
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER

        mentions = MentionsLegalesEntreprise.get_solo()

        INDIGO = colors.HexColor("#1e3a8a")
        TEAL = colors.HexColor("#0f766e")
        SLATE = colors.HexColor("#1e293b")
        SLATE_LIGHT = colors.HexColor("#64748b")
        WHITE = colors.white
        BG_LIGHT = colors.HexColor("#f8fafc")
        EMERALD = colors.HexColor("#059669")

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, pagesize=A4,
            rightMargin=20 * mm, leftMargin=20 * mm,
            topMargin=15 * mm, bottomMargin=20 * mm,
        )
        story = []

        def style(name, **kwargs):
            return ParagraphStyle(name, **kwargs)

        s_tagline = style("tagline", fontSize=9, textColor=colors.HexColor("#93c5fd"), fontName="Helvetica", alignment=TA_LEFT)
        s_section = style("section", fontSize=10, textColor=INDIGO, fontName="Helvetica-Bold", spaceBefore=6, spaceAfter=4)
        s_label = style("label", fontSize=8, textColor=SLATE_LIGHT, fontName="Helvetica", leading=14)
        s_value = style("value", fontSize=10, textColor=SLATE, fontName="Helvetica-Bold", leading=14)
        s_body = style("body", fontSize=9, textColor=SLATE_LIGHT, fontName="Helvetica", leading=14)
        s_footer = style("footer", fontSize=8, textColor=SLATE_LIGHT, fontName="Helvetica", alignment=TA_CENTER)

        logo_path = os.path.join(settings.BASE_DIR, '..', 'taftech_frontend', 'src', 'assets', 'logo-taftech.png')
        logo_cell = Image(logo_path, width=28 * mm, height=14 * mm) if os.path.exists(logo_path) else Paragraph(
            "TAFTECH", style("brand", fontSize=26, textColor=WHITE, fontName="Helvetica-Bold")
        )

        # EN-TÊTE
        header_data = [[
            logo_cell,
            Paragraph(
                f"FACTURE<br/><font size='8' color='#93c5fd'>N° {paiement.numero_facture}</font>",
                style("h_right", fontSize=13, textColor=WHITE, fontName="Helvetica-Bold", alignment=TA_RIGHT, leading=20),
            ),
        ], [
            Paragraph("Plateforme de recrutement intelligente en Algérie", s_tagline),
            Paragraph(
                f"<font size='8' color='#93c5fd'>{paiement.date_paiement.strftime('%d/%m/%Y')}</font>",
                style("h_date", fontSize=8, textColor=colors.HexColor("#93c5fd"), fontName="Helvetica", alignment=TA_RIGHT),
            ),
        ]]
        header_table = Table(header_data, colWidths=[90 * mm, 80 * mm])
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), INDIGO),
            ('PADDING', (0, 0), (-1, -1), 10),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 4 * mm))

        # BANDEAU TEAL — statut payé
        teal_table = Table([[Paragraph(
            "<b>PAIEMENT CONFIRMÉ — ABONNEMENT ACTIVÉ</b>",
            style("teal_txt", fontSize=9, textColor=WHITE, fontName="Helvetica-Bold", alignment=TA_CENTER),
        )]], colWidths=[170 * mm])
        teal_table.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), TEAL), ('PADDING', (0, 0), (-1, -1), 6)]))
        story.append(teal_table)
        story.append(Spacer(1, 6 * mm))

        # ÉMETTEUR
        story.append(Paragraph("ÉMIS PAR", s_section))
        story.append(Paragraph(
            f"<b>{mentions.raison_sociale or 'TafTech'}</b><br/>"
            f"{mentions.adresse or '[Adresse à compléter]'}<br/>"
            f"RC : {mentions.registre_commerce or '[à compléter]'} — NIF : {mentions.nif or '[à compléter]'}"
            + (f" — TVA : {mentions.tva}" if mentions.tva else ""),
            s_body,
        ))
        story.append(Spacer(1, 5 * mm))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0")))
        story.append(Spacer(1, 4 * mm))

        # CLIENT
        story.append(Paragraph("FACTURÉ À", s_section))
        client_table = Table([
            [Paragraph("Entreprise", s_label), Paragraph(paiement.entreprise.nom_entreprise, s_value)],
            [Paragraph("Registre de commerce", s_label), Paragraph(paiement.entreprise.registre_commerce or "—", s_body)],
        ], colWidths=[45 * mm, 125 * mm])
        client_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
            ('PADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        story.append(client_table)
        story.append(Spacer(1, 5 * mm))

        # DÉTAIL DE LA PRESTATION
        story.append(Paragraph("DÉTAIL", s_section))
        detail_data = [
            [
                Paragraph("<b>Description</b>", style("th", fontSize=8, textColor=WHITE, fontName="Helvetica-Bold")),
                Paragraph("<b>Période</b>", style("th", fontSize=8, textColor=WHITE, fontName="Helvetica-Bold", alignment=TA_CENTER)),
                Paragraph("<b>Montant</b>", style("th", fontSize=8, textColor=WHITE, fontName="Helvetica-Bold", alignment=TA_RIGHT)),
            ],
            [
                Paragraph(f"Abonnement TafTech — Palier {NOM_PALIERS.get(paiement.palier_nom, paiement.palier_nom)}", s_body),
                Paragraph("Mensuel" if paiement.periode == "MENSUEL" else "Annuel", style("body_c", fontSize=9, textColor=SLATE_LIGHT, fontName="Helvetica", alignment=TA_CENTER)),
                Paragraph(f"{paiement.montant_da:,} DA".replace(",", " "), style("body_r", fontSize=9, textColor=SLATE, fontName="Helvetica-Bold", alignment=TA_RIGHT)),
            ],
        ]
        detail_table = Table(detail_data, colWidths=[95 * mm, 35 * mm, 40 * mm])
        detail_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), INDIGO),
            ('PADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(detail_table)

        total_table = Table([[
            Paragraph("<b>TOTAL PAYÉ</b>", style("total_label", fontSize=11, textColor=SLATE, fontName="Helvetica-Bold")),
            Paragraph(f"<b>{paiement.montant_da:,} DA</b>".replace(",", " "), style("total_val", fontSize=14, textColor=TEAL, fontName="Helvetica-Bold", alignment=TA_RIGHT)),
        ]], colWidths=[130 * mm, 40 * mm])
        total_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f0fdfa")),
            ('PADDING', (0, 0), (-1, -1), 8),
            ('LINEABOVE', (0, 0), (-1, 0), 1, colors.HexColor("#e2e8f0")),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(total_table)
        story.append(Spacer(1, 5 * mm))

        story.append(Paragraph(
            f"Moyen de paiement : <b>{paiement.moyen_paiement or '—'}</b>",
            s_body,
        ))
        story.append(Spacer(1, 6 * mm))

        # CERTIFICATION / TAMPON
        story.append(HRFlowable(width="100%", thickness=2, color=INDIGO))
        story.append(Spacer(1, 4 * mm))
        cert_table = Table([[
            Paragraph(
                "Cette facture est générée automatiquement par <b>TafTech</b> suite à la confirmation "
                "du paiement par notre prestataire de paiement en ligne.",
                style("cert", fontSize=9, textColor=SLATE_LIGHT, fontName="Helvetica", leading=14),
            ),
            Paragraph(
                f"✓ PAYÉE\n{paiement.date_paiement.strftime('%d/%m/%Y')}",
                style("stamp", fontSize=11, textColor=EMERALD, fontName="Helvetica-Bold", alignment=TA_CENTER, leading=18),
            ),
        ]], colWidths=[120 * mm, 50 * mm])
        cert_table.setStyle(TableStyle([
            ('PADDING', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOX', (1, 0), (1, 0), 2, EMERALD),
            ('BACKGROUND', (1, 0), (1, 0), colors.HexColor("#f0fdf4")),
        ]))
        story.append(cert_table)
        story.append(Spacer(1, 6 * mm))

        # SIGNATURE
        sig_table = Table([[
            Paragraph(
                "<b>L'Équipe TafTech</b><br/>"
                "<font color='#64748b' size='8'>Plateforme de recrutement intelligente<br/>Oran, Algérie</font>",
                style("sig_left", fontSize=10, textColor=SLATE, fontName="Helvetica", leading=16),
            ),
            Paragraph(
                f"<b>Facture n° {paiement.numero_facture}</b><br/>"
                f"<font color='#64748b' size='8'>Émise le {timezone.now().strftime('%d/%m/%Y à %H:%M')}</font>",
                style("sig_right", fontSize=10, textColor=SLATE, fontName="Helvetica", leading=16, alignment=TA_RIGHT),
            ),
        ]], colWidths=[85 * mm, 85 * mm])
        sig_table.setStyle(TableStyle([
            ('PADDING', (0, 0), (-1, -1), 8),
            ('LINEABOVE', (0, 0), (-1, 0), 1, colors.HexColor("#e2e8f0")),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        story.append(sig_table)
        story.append(Spacer(1, 4 * mm))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0")))
        story.append(Spacer(1, 2 * mm))
        story.append(Paragraph(
            "TAFTECH — Plateforme de recrutement intelligente en Algérie | taftech963@gmail.com | Oran, Algérie",
            s_footer,
        ))

        doc.build(story)
        buffer.seek(0)
        response = HttpResponse(buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="Facture_TafTech_{paiement.numero_facture}.pdf"'
        return response


class MentionsLegalesAdminAPIView(APIView):
    """Singleton — mentions légales TafTech affichées sur les factures, éditables par l'admin."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        m = MentionsLegalesEntreprise.get_solo()
        return Response({
            'raison_sociale': m.raison_sociale, 'registre_commerce': m.registre_commerce,
            'nif': m.nif, 'adresse': m.adresse, 'tva': m.tva,
        })

    def put(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Accès refusé.'}, status=403)
        m = MentionsLegalesEntreprise.get_solo()
        for field in ('raison_sociale', 'registre_commerce', 'nif', 'adresse', 'tva'):
            if field in request.data:
                setattr(m, field, request.data[field])
        m.save()
        return Response({'message': 'Mentions légales mises à jour.'})
