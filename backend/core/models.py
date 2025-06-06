# core/models.py
from django.db import models
from django.contrib.auth.models import User

class FoodAnalysis(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="food_analyses")
    category = models.CharField(max_length=100)
    food_type = models.CharField(max_length=100)
    waste_count = models.IntegerField(default=0)
    no_waste_count = models.IntegerField(default=0)
    waste_ratio = models.FloatField(default=0.0)
    analysis_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} - {self.category} - {self.food_type} - Waste Ratio: {self.waste_ratio:.2f}"
    


    