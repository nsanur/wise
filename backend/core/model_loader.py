#  core/model_loader.py

import torch
import os
import pathlib
from pathlib import Path
pathlib.PosixPath = pathlib.WindowsPath

def load_models():
    model_paths = {
        'wisePlate': 'models/wisePlate.pt',
        'wiseSoup': 'models/wiseSoup.pt',
        'wiseTypeSoup': 'models/wiseTypeSoup.pt',
        'wiseExtraCls': 'models/wiseExtraCls-yolo5.pt',
        'wiseExtraTypeCls': 'models/wiseExtraTypeCls-yolo5.pt',
        'wiseMainCls': 'models/wiseMainCls-yolo5.pt',
        'wiseMainTypeCls': 'models/wiseMainTypeCls-yolo5.pt',
        'wiseSideCls': 'models/wiseSideCls-yolo5.pt',
        'wiseSideTypeCls': 'models/wiseSideTypeCls-yolo5.pt'
    }

    models = {}
    for model_name, model_path in model_paths.items():
        if not os.path.exists(model_path):
            print(f"Model dosyası bulunamadı: {model_path}")
            continue
        print(f"Loading model: {model_name}")
        model = torch.hub.load('ultralytics/yolov5', 'custom', path=model_path)
        model.eval()
        models[model_name] = model

    return models
