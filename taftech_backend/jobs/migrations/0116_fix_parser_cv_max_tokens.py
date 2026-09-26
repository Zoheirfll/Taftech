from django.db import migrations

# Corrige une valeur de configuration erronée trouvée en base de dev
# (AIConfig.parser_cv_max_tokens=3500, bien en dessous du défaut du modèle 6000) :
# avec un CV comportant plusieurs expériences ET formations (formations toujours
# générées APRÈS les expériences dans le JSON demandé à Groq), un budget de tokens
# trop bas coupait la réponse en plein milieu du tableau "formations" (voire avant
# même qu'il commence) — certaines formations n'étaient jamais extraites. Remonté à
# 7000 (au-dessus du défaut du modèle) pour laisser de la marge sur les CV longs.


def fix_max_tokens(apps, schema_editor):
    AIConfig = apps.get_model('jobs', 'AIConfig')
    AIConfig.objects.filter(parser_cv_max_tokens__lt=6000).update(parser_cv_max_tokens=7000)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0115_relationspecialite'),
    ]

    operations = [
        migrations.RunPython(fix_max_tokens, noop),
    ]
