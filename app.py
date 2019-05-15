import os

from EmoPy import FERModel
from flask import Flask, render_template, request, json, jsonify
from face_detector import FaceDetector
import tensorflow as tf
import keras

import base64
import cv2
import numpy as np
import twitter
import configparser

# Can choose other target emotions from the emotion subset defined in fermodel.py in src directory. The function
# defined as `def _check_emotion_set_is_supported(self):`
target_emotions = ['calm', 'anger', 'happiness']

graph = tf.get_default_graph()
model = FERModel(target_emotions, verbose=False)

# Initialize application
app = Flask(__name__)
face_detector = FaceDetector('haarcascade_frontalface_default.xml')
config = configparser.ConfigParser()
config.read('keys_and_tokens')

@app.route('/')
def index():
    return render_template('index.html', twitter=bool(config['features']['twitter']))


@app.route('/aws-config', methods=['GET'])
def aws_config():
    return json.dumps({
        'region': config['aws']['region'],
        'bucketName': config['aws']['bucket_name'],
        'identityPoolId': config['aws']['identity_pool_id']
    })

@app.route('/share', methods=['POST'])
def share():
    if not os.path.isfile('keys_and_tokens'):
        return 'No config file available'
    config = configparser.ConfigParser()
    api = twitter.Api(consumer_key=config.get('twitter-keys-and-tokens', 'api_key'),
        consumer_secret=config.get('twitter-keys-and-tokens', 'api_secret_key'),
        access_token_key=config.get('twitter-keys-and-tokens', 'access_token'),
        access_token_secret=config.get('twitter-keys-and-tokens', 'access_token_secret'))
    with open("imageToSave.png", "w+b") as fh:
        fh.write(base64.b64decode(request.values['image'].split(',')[1]))
        api.PostUpdate('@' + request.values['username'] if request.values['username'] else '', media = fh)
       


@app.route('/predict', methods=['POST'])
def predict():
    image_np = data_uri_to_cv2_img(request.values['image'])
    # Passing the frame to the predictor
    with graph.as_default():
        faces = face_detector.detect_faces(image_np)
        emotion = model.predict_from_ndarray(image_np)
        result = {'emotion': emotion, 'faces': json.dumps(faces)}
    return jsonify(result)


def data_uri_to_cv2_img(uri):
    encoded_data = uri.split(',')[1]
    nparr = np.fromstring(base64.b64decode(encoded_data), np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img


if __name__ == '__main__':
    app.run()
