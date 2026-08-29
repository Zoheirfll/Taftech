from django.core.validators import MinValueValidator
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0092_alter_notification_type_notif'),
    ]

    operations = [
        migrations.AddField(
            model_name='palier',
            name='credits_mois',
            field=models.PositiveIntegerField(
                blank=True, null=True,
                validators=[MinValueValidator(1)],
                verbose_name='Crédits CVthèque/mois (vide = illimité)',
            ),
        ),
    ]
