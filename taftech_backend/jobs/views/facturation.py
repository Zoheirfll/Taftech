from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.http import HttpResponse
import io

from .equipe import get_entreprise_for_user
from ..models import PaiementAbonnement, MentionsLegalesEntreprise


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
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER

        mentions = MentionsLegalesEntreprise.get_solo()
        TEAL = colors.HexColor("#0f766e")
        SLATE = colors.HexColor("#1e293b")
        SLATE_LIGHT = colors.HexColor("#64748b")

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=20 * mm, leftMargin=20 * mm, topMargin=20 * mm, bottomMargin=20 * mm)
        story = []

        s_title = ParagraphStyle("title", fontSize=18, textColor=TEAL, fontName="Helvetica-Bold")
        s_label = ParagraphStyle("label", fontSize=9, textColor=SLATE_LIGHT, fontName="Helvetica", leading=13)
        s_value = ParagraphStyle("value", fontSize=10, textColor=SLATE, fontName="Helvetica-Bold", leading=13)
        s_footer = ParagraphStyle("footer", fontSize=8, textColor=SLATE_LIGHT, fontName="Helvetica", alignment=TA_CENTER)

        story.append(Paragraph(mentions.raison_sociale or "TafTech", s_title))
        story.append(Paragraph(
            f"{mentions.adresse or '[Adresse à compléter]'}<br/>"
            f"RC : {mentions.registre_commerce or '[à compléter]'} — NIF : {mentions.nif or '[à compléter]'}"
            + (f" — TVA : {mentions.tva}" if mentions.tva else ""),
            s_label,
        ))
        story.append(Spacer(1, 10 * mm))
        story.append(Paragraph(f"Facture n° {paiement.numero_facture}", s_title))
        story.append(Spacer(1, 4 * mm))

        NOM_LABELS = {"STARTER": "Starter", "PRO": "Pro", "BUSINESS": "Business", "ENTERPRISE": "Enterprise"}
        data = [
            ["Date", paiement.date_paiement.strftime('%d/%m/%Y')],
            ["Client", paiement.entreprise.nom_entreprise],
            ["Palier", NOM_LABELS.get(paiement.palier_nom, paiement.palier_nom)],
            ["Période", "Mensuel" if paiement.periode == "MENSUEL" else "Annuel"],
            ["Moyen de paiement", paiement.moyen_paiement or "—"],
            ["Montant", f"{paiement.montant_da:,} DA".replace(",", " ")],
        ]
        table = Table(data, colWidths=[50 * mm, 100 * mm])
        table.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("TEXTCOLOR", (0, 0), (0, -1), SLATE_LIGHT),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LINEBELOW", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ]))
        story.append(table)
        story.append(Spacer(1, 15 * mm))
        story.append(Paragraph("Facture générée automatiquement — TafTech", s_footer))

        doc.build(story)
        pdf = buffer.getvalue()
        buffer.close()
        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{paiement.numero_facture}.pdf"'
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
