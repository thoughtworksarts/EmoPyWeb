import os
from flask import Flask, render_template, request
import tensorflow as tf
import keras
from EmoPy.src.fermodel import FERModel

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
    emotion = ''
    with graph.as_default():
        face = crop_to_first_face(image_np)
        emotion = model.predict_from_ndarray(image_np) if face is not None else 'no face detected'
    return emotion

def data_uri_to_cv2_img(uri):
    encoded_data = uri.split(',')[1]
    nparr = np.fromstring(base64.b64decode(encoded_data), np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img

def crop_to_first_face(image):
    faceCascade = cv2.CascadeClassifier('haarcascade_frontalface_default.xml')
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    faces = faceCascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(30, 30)
    )
    if len(faces) > 0:
        (x, y, w, h) = faces[0]
        return gray[y:y+h, x:x+w]
    return None

if __name__ == '__main__':
    app.run()
