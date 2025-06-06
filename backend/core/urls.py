# core/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('upload/', views.upload_images, name='upload_images'),
    path('results/', views.get_analysis_results, name='get_analysis_results'),
    path('auth/register/', views.register),
    path('auth/login/', views.login),
    path('auth/me/', views.user_profile),
]
