from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.utils import timezone

import os

from .models import FoodAnalysis

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    user = request.user
    if request.method == 'GET':
        return Response({
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
        })
    elif request.method == 'PATCH':
        user.first_name = request.data.get('first_name', user.first_name)
        user.last_name = request.data.get('last_name', user.last_name)
        user.email = request.data.get('email', user.email)
        user.save()
        return Response({
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
        })

@api_view(['POST'])
def register(request):
    email = request.data.get('email')
    password = request.data.get('password')
    first_name = request.data.get('first_name')
    last_name = request.data.get('last_name')
    if not email or not password or not first_name or not last_name:
        return Response({'error': 'Eksik alan var.'}, status=400)
    if User.objects.filter(email=email).exists():
        return Response({'error': 'Bu e-posta zaten kayıtlı.'}, status=400)

    # username zorunlu olduğundan email'i username olarak kullanalım
    user = User.objects.create_user(
        username=email,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name
    )
    return Response({'message': 'Kayıt başarılı!'}, status=201)

@api_view(['POST'])
def login(request):
    email = request.data.get('email')
    password = request.data.get('password')
    user = authenticate(username=email, password=password)
    if user is None:
        return Response({'error': 'Geçersiz giriş.'}, status=status.HTTP_400_BAD_REQUEST)
    refresh = RefreshToken.for_user(user)
    return Response({
        'refresh': str(refresh),
        'access': str(refresh.access_token),
        'user': {
            'email': user.email,
            'fullName': user.first_name,
        }
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_images(request):
    if 'images' not in request.FILES:
        return Response({'error': 'No images were uploaded.'}, status=status.HTTP_400_BAD_REQUEST)

    date_str = request.POST.get('date')
    if date_str:
        try:
            from datetime import datetime
            analysis_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            analysis_date = timezone.now().date()
    else:
        analysis_date = timezone.now().date()

    image_directory = 'images'
    if not os.path.exists(image_directory):
        os.makedirs(image_directory)

    saved_files = []
    for image_file in request.FILES.getlist('images'):
        file_path = os.path.join(image_directory, image_file.name)
        with open(file_path, 'wb+') as destination:
            for chunk in image_file.chunks():
                destination.write(chunk)
        saved_files.append(file_path)

    # Büyük ML/vision importu burada fonksiyon içinde:
    from .main import main as process_images
    process_images(saved_files, analysis_date, request.user)

    return Response({'message': 'Images uploaded and processed successfully.'}, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_analysis_results(request):
    results = FoodAnalysis.objects.filter(user=request.user).order_by('-analysis_date')
    data = [
        {
            'category': res.category,
            'food_type': res.food_type,
            'waste_count': res.waste_count,
            'no_waste_count': res.no_waste_count,
            'waste_ratio': res.waste_ratio,
            'analysis_date': res.analysis_date.strftime("%Y-%m-%d"),
        }
        for res in results
    ]
    return Response(data)
