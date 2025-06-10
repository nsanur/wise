import os
import shutil
import tempfile
from pathlib import Path
from datetime import datetime

from .config import FOOD_TYPES  # Aynı dizindeki config'i import et
from .models import FoodAnalysis  # FoodAnalysis modelini import et
from .utils_image import preprocess_image

def process_detection(image_path, models, output_base_dir, analysis_date=None, user=None):
    import cv2
    import torch

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    img = cv2.imread(image_path)
    if img is None:
        print(f"Image could not be read: {image_path}")
        return

    plate_detection = models['wisePlate'](img)
    boxes = plate_detection.xywh[0].cpu().numpy()

    base_filename = os.path.splitext(os.path.basename(image_path))[0]
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")

    category_limits = {'corba': 1, 'ana-yemek': 1, 'yan-yemek': 1, 'ek-yemek': 1}
    detected_counts = {'corba': 0, 'ana-yemek': 0, 'yan-yemek': 0, 'ek-yemek': 0}
    processed_food_count = 0
    max_food_per_plate = 4

    for i, box in enumerate(boxes):
        if processed_food_count >= max_food_per_plate:
            print(f"Processing stopped: Max 4 foods per plate reached for {image_path}")
            break

        try:
            x_min = max(0, int(box[0] - box[2] / 2))
            y_min = max(0, int(box[1] - box[3] / 2))
            x_max = min(img.shape[1], int(box[0] + box[2] / 2))
            y_max = min(img.shape[0], int(box[1] + box[3] / 2))

            if (x_max - x_min) < 10 or (y_max - y_min) < 10:
                continue

            cropped_img = img[y_min:y_max, x_min:x_max]
            if cropped_img.size == 0:
                continue

            food_category = plate_detection.names[int(box[5])]
            detection_confidence = float(box[4])
            print(f"Detected category: {food_category}, Confidence: {detection_confidence}")

            if detected_counts[food_category] >= category_limits[food_category]:
                print(f"Skipping {food_category}: Max limit reached for this category.")
                continue

            detected_counts[food_category] += 1
            processed_food_count += 1

            with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as temp_file:
                temp_path = temp_file.name
                cv2.imwrite(temp_path, cropped_img)
                print(f"Temporary file created at: {temp_path}")

            waste_model_mapping = {
                'corba': 'wiseSoup',
                'ana-yemek': 'wiseMainCls',
                'yan-yemek': 'wiseSideCls',
                'ek-yemek': 'wiseExtraCls'
            }

            waste_status = "bilgi-yok"
            waste_confidence = torch.tensor(0.0)
            img_tensor = None
            if food_category in waste_model_mapping:
                waste_model_name = waste_model_mapping[food_category]
                if waste_model_name in models:
                    img_tensor = preprocess_image(temp_path)
                    img_tensor = img_tensor.to(device)

                    with torch.no_grad():
                        waste_prediction = models[waste_model_name](img_tensor)

                    waste_probs = torch.nn.functional.softmax(waste_prediction[0], dim=0)
                    waste_confidence, waste_class = torch.max(waste_probs, 0)
                    waste_status = "israf-yok" if waste_class.item() == 1 else "israf-var"

            # Yemek türünü belirle
            type_model_mapping = {
                'corba': 'wiseTypeSoup',
                'ana-yemek': 'wiseMainTypeCls',
                'yan-yemek': 'wiseSideTypeCls',
                'ek-yemek': 'wiseExtraTypeCls'
            }

            type_name = "bilgi-yok"
            if food_category in type_model_mapping:
                type_model_name = type_model_mapping[food_category]
                if type_model_name in models:
                    if img_tensor is None:
                        img_tensor = preprocess_image(temp_path)
                        img_tensor = img_tensor.to(device)
                    with torch.no_grad():
                        type_prediction = models[type_model_name](img_tensor)

                    type_probs = torch.nn.functional.softmax(type_prediction[0], dim=0)
                    type_confidence, food_type_index = torch.max(type_probs, 0)

                    if food_category in FOOD_TYPES and food_type_index.item() in FOOD_TYPES[food_category]:
                        type_name = FOOD_TYPES[food_category][food_type_index.item()]

            try:
                FoodAnalysis.objects.create(
                    user=user,
                    category=food_category,
                    food_type=type_name,
                    waste_count=1 if waste_status == 'israf-var' else 0,
                    no_waste_count=1 if waste_status == 'israf-yok' else 0,
                    waste_ratio=waste_confidence.item() if waste_status != 'bilgi-yok' else 0.0,
                    analysis_date=analysis_date
                )
                print(f"Analysis record created for {food_category} - {type_name} - {waste_status}")
            except Exception as e:
                print(f"Error creating FoodAnalysis record: {e}")

            final_dir = os.path.join(output_base_dir, food_category, type_name, waste_status)
            Path(final_dir).mkdir(parents=True, exist_ok=True)

            final_filename = (
                f"{base_filename}_"
                f"{food_category}_"
                f"{type_name}_"
                f"{detection_confidence:.2f}_"
                f"{waste_status}.jpg"
            )
            final_path = os.path.join(final_dir, final_filename)
            shutil.copy2(temp_path, final_path)
            print(f"File saved to: {final_path}")

            if os.path.exists(temp_path):
                os.remove(temp_path)

        except Exception as e:
            print(f"Error processing detection {i}: {str(e)}")
            continue


def process_directory(input_directory, models, output_base_dir, analysis_date=None, user=None):
    import os
    import shutil
    # Yukarıdaki modüller tekrar import edilse de sorun olmaz, RAM açısından avantaj sağlar

    if os.path.exists(output_base_dir):
        shutil.rmtree(output_base_dir)
    os.makedirs(output_base_dir, exist_ok=True)

    image_paths = [
        os.path.join(input_directory, f)
        for f in os.listdir(input_directory)
        if f.lower().endswith(('.png', '.jpg', '.jpeg'))
    ]

    for image_path in image_paths:
        try:
            print(f"\nProcessing image: {image_path}")
            process_detection(image_path, models, output_base_dir, analysis_date=analysis_date, user=user)
        except Exception as e:
            print(f"Error processing {image_path}: {str(e)}")
