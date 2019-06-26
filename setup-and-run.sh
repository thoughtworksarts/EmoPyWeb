#!/usr/bin/env python

if brew ls --versions pyenv > /dev/null; then
  echo "pyenv is installed!"
else
  brew install pyenv
fi

pyenv local 3.6.6
pyenv exec python3.6 -m venv venv
source venv/bin/activate
curl -o venv/lib/python3.6/site-packages/EmoPy/models/conv_model_0123456.h5 https://tw-arts-emopyweb.s3.amazonaws.com/model/conv_model_0123456.h5
pip install -r requirements.txt
python app.py