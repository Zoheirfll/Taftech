import json
import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "taftech_backend.settings")
django.setup()

from jobs.models import MetierReferentiel

secteur_map = {
    "A": "AGRICULTURE", "B": "ARTS", "C": "FINANCE",
    "D": "COMMERCIAL", "E": "COMMUNICATION", "F": "BTP",
    "G": "TOURISME", "H": "INGENIERIE", "I": "MAINTENANCE",
    "J": "SANTE", "K": "SERVICE_PUBLIC", "L": "SPECTACLE",
    "M": "ADMIN", "N": "LOGISTIQUE",
}

secteur_lvl2_map = {
    ("M", 14): "RH", ("M", 16): "JURIDIQUE",
    ("M", 17): "MARKETING", ("M", 18): "IT",
    ("H", 15): "PRODUCTION", ("H", 16): "PRODUCTION",
}

with open("ROME_OGR.json", encoding="utf-8") as f:
    data = json.load(f)

MetierReferentiel.objects.all().delete()
print(f"Ancien données supprimées.")

batch = []
for d in data:
    titre = d["label"].replace(" / ", "/").strip()
    key = (d["lvl_1_rome_prefix"], d["lvl_2_rome_prefix"])
    secteur = secteur_lvl2_map.get(key, secteur_map.get(d["lvl_1_rome_prefix"], "AUTRE"))
    batch.append(MetierReferentiel(
        titre=titre,
        secteur=secteur,
        mots_cles=f"ROME:{d['ogr']}",
        est_actif=True,
    ))
    if len(batch) >= 500:
        MetierReferentiel.objects.bulk_create(batch)
        print(f"  {MetierReferentiel.objects.count()} importés...")
        batch = []

if batch:
    MetierReferentiel.objects.bulk_create(batch)

print(f"Import terminé: {MetierReferentiel.objects.count()} métiers.")
