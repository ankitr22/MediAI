import os
import numpy as np
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from PIL import Image
import io
import tensorflow as tf
from auth import get_current_user
from models import User

router = APIRouter(prefix="/skin", tags=["skin"])

# HAM10000 dataset classes (7 skin disease categories)
CLASS_NAMES = [
    "Melanocytic nevi",
    "Melanoma",
    "Benign keratosis-like lesions",
    "Basal cell carcinoma",
    "Actinic keratoses",
    "Vascular lesions",
    "Dermatofibroma"
]

CLASS_DESCRIPTIONS = {
    "Melanocytic nevi": "Common moles. Usually benign but monitor for changes in size, shape, or color.",
    "Melanoma": "A serious form of skin cancer. Immediate dermatologist consultation recommended.",
    "Benign keratosis-like lesions": "Non-cancerous skin growths including seborrheic keratoses and solar lentigines.",
    "Basal cell carcinoma": "Most common skin cancer. Rarely spreads but needs medical treatment.",
    "Actinic keratoses": "Rough, scaly patches caused by sun damage. Can progress to cancer if untreated.",
    "Vascular lesions": "Abnormalities of blood vessels in the skin such as hemangiomas.",
    "Dermatofibroma": "Benign fibrous nodules usually found on the legs. Generally harmless."
}

IMG_SIZE = (224, 224)
_model = None

def load_model():
    global _model
    if _model is None:
        base = tf.keras.applications.MobileNetV2(
            input_shape=(224, 224, 3),
            include_top=False,
            weights="imagenet"
        )
        base.trainable = False
        inputs = tf.keras.Input(shape=(224, 224, 3))
        x = tf.keras.applications.mobilenet_v2.preprocess_input(inputs)
        x = base(x, training=False)
        x = tf.keras.layers.GlobalAveragePooling2D()(x)
        x = tf.keras.layers.Dense(128, activation="relu")(x)
        x = tf.keras.layers.Dropout(0.3)(x)
        outputs = tf.keras.layers.Dense(len(CLASS_NAMES), activation="softmax")(x)
        _model = tf.keras.Model(inputs, outputs)

        # Load fine-tuned weights if available, otherwise use ImageNet features
        weights_path = "skin_model_weights.h5"
        if os.path.exists(weights_path):
            _model.load_weights(weights_path)
            print("Loaded fine-tuned skin model weights.")
        else:
            print("WARNING: No fine-tuned weights found. Using base ImageNet features (demo mode).")
    return _model

def preprocess_image(image_bytes: bytes) -> np.ndarray:
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize(IMG_SIZE)
    arr = np.array(img, dtype=np.float32)
    return np.expand_dims(arr, axis=0)

@router.post("/classify")
async def classify_skin(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")
    try:
        image_bytes = await file.read()
        model = load_model()
        img_array = preprocess_image(image_bytes)
        predictions = model.predict(img_array)[0]
        top_idx = int(np.argmax(predictions))
        confidence = float(predictions[top_idx]) * 100

        results = [
            {"class": CLASS_NAMES[i], "confidence": round(float(predictions[i]) * 100, 2)}
            for i in range(len(CLASS_NAMES))
        ]
        results.sort(key=lambda x: x["confidence"], reverse=True)

        return {
            "prediction": CLASS_NAMES[top_idx],
            "confidence": round(confidence, 2),
            "description": CLASS_DESCRIPTIONS[CLASS_NAMES[top_idx]],
            "all_predictions": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
