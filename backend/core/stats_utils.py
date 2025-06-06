# core/stats_utils.py

import os
from datetime import datetime

def collect_and_print_statistics(output_base_dir, analysis_date=None):
    """
    Tüm kategoriler ve türler için israf istatistiklerini toplar ve yazdırır
    analysis_date parametresi eklendi (opsiyonel).
    """
    statistics = {
        'corba': {'total': {'israf-var': 0, 'israf-yok': 0}, 'types': {}},
        'ana-yemek': {'total': {'israf-var': 0, 'israf-yok': 0}, 'types': {}},
        'yan-yemek': {'total': {'israf-var': 0, 'israf-yok': 0}, 'types': {}},
        'ek-yemek': {'total': {'israf-var': 0, 'israf-yok': 0}, 'types': {}}
    }

    # İstatistikleri topla
    for category in statistics.keys():
        category_path = os.path.join(output_base_dir, category)
        if not os.path.exists(category_path):
            continue

        # Tür klasörlerini kontrol et
        for type_name in os.listdir(category_path):
            type_path = os.path.join(category_path, type_name)
            if not os.path.isdir(type_path):
                continue

            # Her tür için israf istatistiklerini başlat
            if type_name not in statistics[category]['types']:
                statistics[category]['types'][type_name] = {
                    'israf-var': 0,
                    'israf-yok': 0
                }

            # İsraf durumlarını say
            for waste_status in ['israf-var', 'israf-yok']:
                waste_path = os.path.join(type_path, waste_status)
                if os.path.exists(waste_path):
                    file_count = len([f for f in os.listdir(waste_path)
                                   if f.lower().endswith(('.jpg', '.jpeg', '.png'))])

                    # Tür bazında sayıları güncelle
                    statistics[category]['types'][type_name][waste_status] += file_count

                    # Kategori toplamını güncelle
                    statistics[category]['total'][waste_status] += file_count

    # İstatistikleri yazdır
    print("\n" + "="*50)
    print(f"İSTATİSTİK RAPORU")
    print(f"Tarih/Saat (UTC): {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}")
    if analysis_date:
        print(f"Analiz Tarihi: {analysis_date}")
    print("="*50)

    for category, data in statistics.items():
        total_var = data['total']['israf-var']
        total_yok = data['total']['israf-yok']
        total = total_var + total_yok

        if total > 0:
            print(f"\n{category.upper()} ÖZET:")
            print(f"Toplam: {total} örnek")
            print(f"İsraf Var: {total_var} ({(total_var/total*100):.1f}%)")
            print(f"İsraf Yok: {total_yok} ({(total_yok/total*100):.1f}%)")

            print("\nTür bazında dağılım:")
            for type_name, type_data in data['types'].items():
                type_total = type_data['israf-var'] + type_data['israf-yok']
                if type_total > 0:
                    print(f"\n{type_name}:")
                    print(f"  Toplam: {type_total} örnek")
                    print(f"  İsraf Var: {type_data['israf-var']} "
                          f"({(type_data['israf-var']/type_total*100):.1f}%)")
                    print(f"  İsraf Yok: {type_data['israf-yok']} "
                          f"({(type_data['israf-yok']/type_total*100):.1f}%)")

    print("\n" + "="*50)