import os

from EmoPy import FERModel
from flask import Flask, render_template, request, json, jsonify
from face_detector import FaceDetector
import tensorflow as tf
import keras

import base64
import cv2
import numpy as np

# Can choose other target emotions from the emotion subset defined in fermodel.py in src directory. The function
# defined as `def _check_emotion_set_is_supported(self):`
target_emotions = ['calm', 'anger', 'happiness']

graph = tf.get_default_graph()
model = FERModel(target_emotions, verbose=False)

# Initialize application
app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/predict', methods=['POST'])
def predict():
    image_np = data_uri_to_cv2_img(request.values['image'])
    # Passing the frame to the predictor
    with graph.as_default():
        emotion = model.predict_from_ndarray(image_np)
        faceDetector = FaceDetector('./haarcascade_frontalface_default.xml')
        faces = faceDetector.detect_faces(image_np)
        result = {'emotion': emotion, 'faces': json.dumps(faces.tolist())}
    return jsonify(result)


def data_uri_to_cv2_img(uri):
    encoded_data = uri.split(',')[1]
    nparr = np.fromstring(base64.b64decode(encoded_data), np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img


if __name__ == '__main__':
    app.run()
