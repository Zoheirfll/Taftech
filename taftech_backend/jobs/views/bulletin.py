from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from django.conf import settings
from django.utils import timezone
import os
import io
from ..models import Candidature


class GenererBulletinPDFAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, candidature_id):
        try:
            candidature = Candidature.objects.get(id=candidature_id)
        except Candidature.DoesNotExist:
            return Response({"error": "Candidature introuvable."}, status=404)

        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import mm
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table,
            TableStyle, HRFlowable, Image
        )
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

        INDIGO = colors.HexColor("#1e3a8a")
        AMBER = colors.HexColor("#f59e0b")
        SLATE = colors.HexColor("#1e293b")
        SLATE_LIGHT = colors.HexColor("#64748b")
        WHITE = colors.white
        BG_LIGHT = colors.HexColor("#f8fafc")
        EMERALD = colors.HexColor("#059669")

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, pagesize=A4,
            rightMargin=20*mm, leftMargin=20*mm,
            topMargin=15*mm, bottomMargin=20*mm,
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

        ref_num = f"TT-{timezone.now().strftime('%Y%m%d')}-{candidature.id:04d}"
        logo_path = os.path.join(settings.BASE_DIR, '..', 'taftech_frontend', 'src', 'assets', 'logo-taftech.png')
        logo_cell = Image(logo_path, width=28*mm, height=14*mm) if os.path.exists(logo_path) else Paragraph("TAFTECH", style("brand", fontSize=26, textColor=WHITE, fontName="Helvetica-Bold"))

        # EN-TÊTE
        header_data = [[
            logo_cell,
            Paragraph(
                f"BULLETIN DE PRÉSENTATION OFFICIEL<br/><font size='8' color='#93c5fd'>Réf : {ref_num}</font>",
                style("h_right", fontSize=13, textColor=WHITE, fontName="Helvetica-Bold", alignment=TA_RIGHT, leading=20)
            ),
        ], [
            Paragraph("Plateforme de recrutement intelligente en Algérie", s_tagline),
            Paragraph(f"<font size='8' color='#93c5fd'>{timezone.now().strftime('%d/%m/%Y')}</font>",
                      style("h_date", fontSize=8, textColor=colors.HexColor("#93c5fd"), fontName="Helvetica", alignment=TA_RIGHT)),
        ]]
        header_table = Table(header_data, colWidths=[90*mm, 80*mm])
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), INDIGO),
            ('PADDING', (0, 0), (-1, -1), 10),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 4*mm))

        # BANDEAU AMBER
        amber_table = Table([[Paragraph(
            f"<b>DOCUMENT OFFICIEL DE PLACEMENT — {timezone.now().strftime('%d %B %Y').upper()}</b>",
            style("amber_txt", fontSize=9, textColor=WHITE, fontName="Helvetica-Bold", alignment=TA_CENTER)
        )]], colWidths=[170*mm])
        amber_table.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), AMBER), ('PADDING', (0, 0), (-1, -1), 6)]))
        story.append(amber_table)
        story.append(Spacer(1, 6*mm))

        story.append(Paragraph(
            "La plateforme <b>TafTech</b> certifie que le candidat mentionné ci-dessous a été sélectionné "
            "à l'issue du processus de recrutement intelligent conduit sur notre plateforme.",
            style("intro", fontSize=10, textColor=SLATE, fontName="Helvetica", leading=16, spaceAfter=6)
        ))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0")))
        story.append(Spacer(1, 4*mm))

        # INFOS CANDIDAT
        if candidature.candidat:
            nom = f"{candidature.candidat.last_name.upper()} {candidature.candidat.first_name}"
            email = candidature.candidat.email
            telephone = candidature.candidat.telephone or "—"
            try:
                profil = candidature.candidat.profil_candidat
                titre = profil.titre_professionnel or "—"
                wilaya = profil.wilaya or "—"
                diplome = profil.diplome or "—"
            except Exception:
                titre = wilaya = diplome = "—"
        else:
            nom = f"{(candidature.nom_rapide or '').upper()} {candidature.prenom_rapide or ''}"
            email = candidature.email_rapide or "—"
            telephone = candidature.telephone_rapide or "—"
            titre = wilaya = diplome = "—"

        story.append(Paragraph("IDENTITÉ DU CANDIDAT", s_section))
        cand_table = Table([
            [Paragraph("Nom complet", s_label), Paragraph(nom, s_value), Paragraph("Titre professionnel", s_label), Paragraph(titre, s_value)],
            [Paragraph("Email", s_label), Paragraph(email, s_body), Paragraph("Téléphone", s_label), Paragraph(telephone, s_body)],
            [Paragraph("Wilaya", s_label), Paragraph(wilaya, s_body), Paragraph("Niveau d'études", s_label), Paragraph(diplome, s_body)],
        ], colWidths=[35*mm, 50*mm, 35*mm, 50*mm])
        cand_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
            ('PADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        story.append(cand_table)
        story.append(Spacer(1, 5*mm))

        # INFOS POSTE
        entreprise = candidature.offre.entreprise
        story.append(Paragraph("DÉTAILS DU POSTE ATTRIBUÉ", s_section))
        poste_table = Table([
            [Paragraph("Intitulé du poste", s_label), Paragraph(candidature.offre.titre, s_value), Paragraph("Type de contrat", s_label), Paragraph(candidature.offre.type_contrat or "—", s_value)],
            [Paragraph("Entreprise", s_label), Paragraph(entreprise.nom_entreprise, s_value), Paragraph("Secteur", s_label), Paragraph(entreprise.secteur_activite or "—", s_body)],
            [Paragraph("Localisation", s_label), Paragraph(candidature.offre.wilaya or "—", s_body), Paragraph("Salaire", s_label), Paragraph(candidature.offre.salaire_propose or "À négocier", s_body)],
        ], colWidths=[35*mm, 50*mm, 35*mm, 50*mm])
        poste_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
            ('PADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        story.append(poste_table)
        story.append(Spacer(1, 5*mm))

        # SCORE IA
        if candidature.score_matching and float(candidature.score_matching) >= 60:
            score = float(candidature.score_matching)
            score_color = "#059669" if score >= 80 else "#d97706"
            score_table = Table([[
                Paragraph(f'<b><font color="{score_color}">{score:.0f}%</font></b> de compatibilité avec le poste',
                          style("score_txt", fontSize=12, textColor=SLATE, fontName="Helvetica", leading=18)),
                Paragraph("Score calculé par l'algorithme TafTech (spécialité, diplôme, expérience, localisation, compétences).",
                          style("score_desc", fontSize=8, textColor=SLATE_LIGHT, fontName="Helvetica", leading=12)),
            ]], colWidths=[45*mm, 125*mm])
            score_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f0fdf4")),
                ('PADDING', (0, 0), (-1, -1), 10),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#bbf7d0")),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            story.append(Paragraph("ANALYSE IA — SCORE DE COMPATIBILITÉ", s_section))
            story.append(score_table)
            story.append(Spacer(1, 5*mm))

        # ÉVALUATION
        if candidature.note_globale:
            story.append(Paragraph("ÉVALUATION POST-ENTRETIEN", s_section))
            eval_rows = []
            for label, note in [
                ("Compétence technique", candidature.note_technique),
                ("Communication", candidature.note_communication),
                ("Motivation", candidature.note_motivation),
                ("Expérience pertinente", candidature.note_experience),
            ]:
                if note:
                    stars = "★" * int(note) + "☆" * (5 - int(note))
                    eval_rows.append([
                        Paragraph(label, s_label),
                        Paragraph(f"<b>{stars}</b> ({note}/5)", style("stars", fontSize=10, textColor=AMBER, fontName="Helvetica-Bold")),
                    ])
            eval_rows.append([
                Paragraph("<b>Note globale</b>", style("note_label", fontSize=10, textColor=SLATE, fontName="Helvetica-Bold")),
                Paragraph(f"<b>{candidature.note_globale}/20</b>", style("note_val", fontSize=14, textColor=INDIGO, fontName="Helvetica-Bold")),
            ])
            eval_table = Table(eval_rows, colWidths=[70*mm, 100*mm])
            eval_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -2), BG_LIGHT),
                ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor("#eff6ff")),
                ('PADDING', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            story.append(eval_table)
            story.append(Spacer(1, 5*mm))

        # CERTIFICATION
        story.append(HRFlowable(width="100%", thickness=2, color=INDIGO))
        story.append(Spacer(1, 4*mm))
        cert_table = Table([[
            Paragraph(
                "Ce bulletin a été généré automatiquement par <b>TafTech</b> et certifie que le candidat "
                "a été sélectionné via notre processus de recrutement intelligent.",
                style("cert", fontSize=9, textColor=SLATE_LIGHT, fontName="Helvetica", leading=14)
            ),
            Paragraph(
                f"✓ CANDIDAT RETENU\n{timezone.now().strftime('%d/%m/%Y')}",
                style("stamp2", fontSize=11, textColor=EMERALD, fontName="Helvetica-Bold", alignment=TA_CENTER, leading=18)
            ),
        ]], colWidths=[120*mm, 50*mm])
        cert_table.setStyle(TableStyle([
            ('PADDING', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOX', (1, 0), (1, 0), 2, EMERALD),
            ('BACKGROUND', (1, 0), (1, 0), colors.HexColor("#f0fdf4")),
        ]))
        story.append(cert_table)
        story.append(Spacer(1, 6*mm))

        # SIGNATURES
        sig_table = Table([[
            Paragraph(
                "<b>L'Équipe TafTech</b><br/>"
                "<font color='#64748b' size='8'>Plateforme de recrutement intelligente<br/>Oran, Algérie</font>",
                style("sig_left", fontSize=10, textColor=SLATE, fontName="Helvetica", leading=16)
            ),
            Paragraph(
                f"<b>Signature électronique</b><br/>"
                f"<font color='#64748b' size='8'>Réf: {ref_num}<br/>Émis le {timezone.now().strftime('%d/%m/%Y à %H:%M')}</font>",
                style("sig_right", fontSize=10, textColor=SLATE, fontName="Helvetica", leading=16, alignment=TA_RIGHT)
            ),
        ]], colWidths=[85*mm, 85*mm])
        sig_table.setStyle(TableStyle([
            ('PADDING', (0, 0), (-1, -1), 8),
            ('LINEABOVE', (0, 0), (-1, 0), 1, colors.HexColor("#e2e8f0")),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        story.append(sig_table)
        story.append(Spacer(1, 4*mm))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0")))
        story.append(Spacer(1, 2*mm))
        story.append(Paragraph(
            "TAFTECH — Plateforme de recrutement intelligente en Algérie | taftech963@gmail.com | Oran, Algérie",
            s_footer
        ))

        doc.build(story)
        buffer.seek(0)
        response = HttpResponse(buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="Bulletin_TafTech_{ref_num}.pdf"'
        return response