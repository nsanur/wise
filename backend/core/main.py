import os
import shutil

def main(image_paths, analysis_date, user):
    # importları fonksiyon içine aldık
    from .model_loader import load_models  # Aynı dizindeki model_loader'ı import et
    from .processor import process_directory
    from .stats_utils import collect_and_print_statistics

    output_base_dir = 'outputs'
    image_directory = 'images'

    if os.path.exists(output_base_dir):
        shutil.rmtree(output_base_dir)
    os.makedirs(output_base_dir, exist_ok=True)

    print("Loading models...")
    models = load_models()
    if not models:
        print("No models were loaded successfully. Exiting...")
        return

    if not os.path.exists(image_directory):
        print(f"Image directory not found: {image_directory}")
        return

    print("Starting image processing...")
    process_directory(image_directory, models, output_base_dir, analysis_date=analysis_date, user=user)

    collect_and_print_statistics(output_base_dir, analysis_date=analysis_date)

    if os.path.exists(image_directory):
        shutil.rmtree(image_directory)
        print(f"Image directory '{image_directory}' removed.")

    print("Tüm işlemler tamamlandı.")

if __name__ == "__main__":
    main([], None, None)
