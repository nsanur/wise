#  core/model_loader.py

from pathlib import Path

def load_models():
    import torch

    base_path = Path(__file__).resolve().parent.parent / "models"
    model_paths = {
        'wisePlate': base_path / 'wisePlate.pt',
        'wiseSoup': base_path / 'wiseSoup.pt',
        'wiseTypeSoup': base_path / 'wiseTypeSoup.pt',
        'wiseExtraCls': base_path / 'wiseExtraCls-yolo5.pt',
        'wiseExtraTypeCls': base_path / 'wiseExtraTypeCls-yolo5.pt',
        'wiseMainCls': base_path / 'wiseMainCls-yolo5.pt',
        'wiseMainTypeCls': base_path / 'wiseMainTypeCls-yolo5.pt',
        'wiseSideCls': base_path / 'wiseSideCls-yolo5.pt',
        'wiseSideTypeCls': base_path / 'wiseSideTypeCls-yolo5.pt'
    }

    models = {}

    for model_name, model_path in model_paths.items():
        if not model_path.exists():
            print(f"Model dosyası bulunamadı: {model_path}")
            continue
        print(f"Loading model: {model_name}")

        # Tüm modeller YOLOv5, hepsini torch.hub.load ile yükle
        model = torch.hub.load('ultralytics/yolov5', 'custom', path=str(model_path), force_reload=False)
        model.eval()
        models[model_name] = model

    return models
