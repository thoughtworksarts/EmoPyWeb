import os

from EmoPy import FERModel
from flask import Flask, render_template, request, json, jsonify
from face_detector import FaceDetector
from PIL import Image
import tensorflow as tf
import keras

import base64
import cv2
import numpy as np
import twitter
import configparser
import requests
import aiohttp
import asyncio
import datetime
import time

# Can choose other target emotions from the emotion subset defined in fermodel.py in src directory. The function
# defined as `def _check_emotion_set_is_supported(self):`
target_emotions = ['calm', 'anger', 'happiness', 'surprise', 'disgust', 'fear', 'sadness']

graph = tf.get_default_graph()
model = FERModel(target_emotions, verbose=False)

loop = asyncio.get_event_loop()
app = Flask(__name__)
face_detector = FaceDetector('haarcascade_frontalface_default.xml')
config = configparser.ConfigParser()
if not os.path.isfile('keys_and_tokens'):
    raise ValueError('No config file available')
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
    api = twitter.Api(consumer_key=config.get('twitter-keys-and-tokens', 'api_key'),
        consumer_secret=config.get('twitter-keys-and-tokens', 'api_secret_key'),
        access_token_key=config.get('twitter-keys-and-tokens', 'access_token'),
        access_token_secret=config.get('twitter-keys-and-tokens', 'access_token_secret'))
    with open("imageToSave.png", "w+b") as fh:
        fh.write(base64.b64decode(request.values['image'].split(',')[1]))
        api.PostUpdate('@' + request.values['username'] if request.values['username'] else '', media = fh)
    return 'OK'
       


@app.route('/predict', methods=['POST'])
def predict():
    image_np = data_uri_to_cv2_img(request.values['image'])
    # Passing the frame to the predictor
    with graph.as_default():
        faces = face_detector.detect_faces(image_np)
        if len(faces) > 0:
            arr_crop = image_np[faces[0][1]:faces[0][1]+faces[0][3], faces[0][0]:faces[0][0]+faces[0][2]] #refactor
            emotion = model.predict_from_ndarray(arr_crop)
            debug_frame(image_np, emotion)
            return jsonify({'emotion': emotion, 'faces': json.dumps(faces)})
        else:
            return jsonify({'emotion': '', 'faces': json.dumps(faces)})

@app.route('/shorten-url', methods=['POST'])
def shorten_url():
    return json.loads(loop.run_until_complete(post_shorten(request.values['longUrl'])))['link']

async def post_shorten(long_url):
    async with aiohttp.ClientSession(connector=aiohttp.TCPConnector(verify_ssl=False)) as session:
        async with session.post('https://api-ssl.bitly.com/v4/shorten', 
            json = {
                'long_url': long_url
            }, headers = {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + config['bitly']['access_token']
            }) as response:
            return await response.text()


def data_uri_to_cv2_img(uri):
    encoded_data = uri.split(',')[1]
    nparr = np.fromstring(base64.b64decode(encoded_data), np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img

# saves frames and their detected emotion to debug folder
def debug_frame(image, emotion):
    ts = time.time()
    st = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S')
    img = Image.fromarray(image, 'RGB')
    img.save('./debug/' + emotion + '-' + st + '.png')

if __name__ == '__main__':
    app.run()
