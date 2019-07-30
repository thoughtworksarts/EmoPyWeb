var s3;
$.ajax({
    type: "GET",
    url: "/aws-config",
}).done(function(res) {
    conf = JSON.parse(res);
    AWS.config.region = conf.region;
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: conf.identityPoolId
    });
    s3 = new AWS.S3({
    apiVersion: '2006-03-01',
    params: {Bucket: conf.bucketName}
    });
})

const monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
function displayDate() {
  n =  new Date();
  document.getElementById('date').innerHTML = monthNames[n.getMonth()] + ' ' + n.getDate() + ', ' + n.getFullYear();
}
displayDate();


function hasGetUserMedia() {
  return !!(navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia);
}

if (hasGetUserMedia()) {
} else {
  alert('getUserMedia() is not supported by your browser');
}

var constraints = {
  video: true
};

var video = document.querySelector('video');

function handleSuccess(stream) {
  window.stream = stream; // only to make stream available to console
  video.srcObject = stream;
  predict();
}

function handleError(error) {
  console.error(error);
}

navigator.mediaDevices.getUserMedia(constraints).
  then(handleSuccess).catch(handleError);

const canvas = document.getElementById('canvas');
const emotionOverlay = document.getElementById('emotionOverlay');
emotionCtx = emotionOverlay.getContext('2d');

let isEmotion = true;
function startPhotoCountdown() {
  prepareNewPhoto();
  trigger.html('<span style="font-size:100px;">'+timeto+'</span>');
  takePhoto().prop('disabled', true);
  photoCountdown = window.setInterval(function() {
    console.log('photoCountdown ', timeto)
    timeto--;
    trigger.html('<span style="font-size:100px;">'+timeto+'</span>');
    if (timeto == 0) {
      isEmotion = false;
      window.clearInterval(photoCountdown);
      timeto = 3;
    };
  }, 1000);
}

let photoCountdown = null;
let qrCountdown = null;

function prepareNewPhoto() {
  window.clearInterval(qrCountdown);
  console.log('qrCountdown is ', qrCountdown);

  trigger.html('Start making happy, sad, fearful, angry, calm, surprised or disgusted faces. <br/>All photos will be deleted 24 hours after being taken.');
  isEmotion = true;
  
  video.play();
  predict();
  
  qrContainer.hide();
  qrContainer.src = '#';
  qrDescription().show();
}

function predict() {
  if(!isEmotion) return actuallyTakePhoto();
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);

  // Other browsers will fall back to image/png
  dataURL = canvas.toDataURL();
  $.ajax({
    type: "POST",
    url: "/predict",
    data:{
      image: dataURL
    }
  }).done(function(res) {
    displayEmotion(res);
  }).always(predict);
};

function actuallyTakePhoto() {
  trigger.hide();
  video.pause();
  isEmotion = false;
  var polaroidCanvas = document.createElement('canvas');
  var polaroidCtx = polaroidCanvas.getContext('2d');
  var polaroidDiv = document.getElementById('polaroid');
  var polaroidFooterDiv = document.getElementById('polaroid-footer');
  var emotionDiv = document.getElementById('emotion');
  var dateDiv = document.getElementById('date');
  const polaroidPadding = 30; // space between edge of polaroid and start of webcam
  polaroidCanvas.width = polaroidDiv.offsetWidth;
  polaroidCanvas.height = polaroidDiv.offsetHeight;
  var polaroidFooterDivOffset = polaroidDiv.offsetHeight - polaroidFooterDiv.offsetHeight;
  polaroidCtx.fillStyle = window.getComputedStyle(polaroidDiv).getPropertyValue('background-color');
  polaroidCtx.fillRect(0, 0, polaroidCanvas.width, polaroidCanvas.height);
  polaroidCtx.font = window.getComputedStyle(emotionDiv).getPropertyValue('font');
  polaroidCtx.fillStyle = window.getComputedStyle(emotionDiv).getPropertyValue('color');
  var emotionText = emotionDiv.textContent;
  var emotionTextWidth = polaroidCtx.measureText(emotionText).width;
  polaroidCtx.fillText(emotionText, (polaroidCanvas.width/2) - (emotionTextWidth/2), polaroidFooterDivOffset + 20);
  polaroidCtx.font = window.getComputedStyle(dateDiv).getPropertyValue('font');
  polaroidCtx.fillStyle = window.getComputedStyle(dateDiv).getPropertyValue('color');
  var dateText = dateDiv.textContent;
  var dateTextWidth = polaroidCtx.measureText(dateText).width;
  polaroidCtx.fillText(dateText, (polaroidCanvas.width/2) - (dateTextWidth/2), polaroidFooterDivOffset + 55);
  var locationTextWidth = polaroidCtx.measureText(document.getElementById('location').textContent).width;
  polaroidCtx.fillText(document.getElementById('location').textContent, (polaroidCanvas.width/2) - (locationTextWidth/2), polaroidFooterDivOffset + 75);
  var logo = new Image();
  logo.src = './static/twa-logo.png'
  logo.onload = function() {
    polaroidCtx.drawImage(logo, (polaroidCanvas.width/2) - ((this.width/3)/2), polaroidFooterDivOffset + 75, this.width/3, this.height/3);
    polaroidCtx.drawImage(canvas, polaroidPadding, polaroidPadding);
    polaroidCtx.drawImage(emotionOverlay, polaroidPadding, polaroidPadding);
    let imagePng = polaroidCanvas.toDataURL('image/png');
    let imageKey = uuidv4() + '.png';
    s3.upload({
      Key: imageKey,
      Body: dataURItoBlob(imagePng),
      ContentType: 'image/png'
    }, function(err, data) {
      if (err) return alert('There was an error uploading your photo: ', err, data);
      s3.getSignedUrl('getObject', {
        Key: imageKey,
        Expires: 86400
      }, function(err, url) {
        if (err) return err;
        $.ajax({
          type: "POST",
          url: "/shorten-url",
          data:{
              longUrl: url
          }
        }).done(function(res) {
          console.log(res);
          qrcode.makeCode(res);
          $('#bitly').html(res.substring(7));
          qrContainer.show();
          takePhoto().prop('disabled', false);
          var clearQrButton = $('#qr-disappear');
          let qrtimeto = 20;
          clearQrButton.html("QR code will disappear in " + qrtimeto + " seconds");
          console.log('qrCountdown is ', qrCountdown);
          if(qrCountdown) {
            window.clearInterval(qrCountdown);
          }
          qrCountdown = window.setInterval(function() {
            console.log('qrCountdown', qrtimeto);
            qrtimeto--;
            clearQrButton.html("QR code will disappear in " + qrtimeto + " seconds");
            if (qrtimeto <= 0) {
              prepareNewPhoto();
            }
          }, 1000);
        });
      });
    });
    if('{{twitter}}' == 'True') 
        shareImage(imagePng, document.getElementById('twitterUsername').value);
  }
}

  function displayEmotion(emotionPrediction){
    if(isEmotion){
      emotionCtx.clearRect(0, 0, emotionOverlay.width, emotionOverlay.height); // clears out previous rectangle(s)
      emotionCtx.beginPath();
      var emotion = emotionPrediction['emotion'];
      var faces = JSON.parse(emotionPrediction['faces']);
      if (faces.length > 0) {
        faces.forEach(function(face) {
          var img = new Image();
          var emojiSize = 50;
          img.onload = function() {
            emotionCtx.drawImage(img, face[0] - emojiSize, face[1], emojiSize, emojiSize);
            emotionCtx.drawImage(img, face[0] + face[2], face[1], emojiSize, emojiSize);
            emotionCtx.drawImage(img, face[0] + face[2]/2 - emojiSize/2, face[1] - emojiSize, emojiSize, emojiSize);
            emotionCtx.drawImage(img, face[0] + face[2] - emojiSize, face[1] - emojiSize / 1.5, emojiSize, emojiSize);
            emotionCtx.drawImage(img, face[0] - face[2]/4 + emojiSize, face[1] - emojiSize / 1.5, emojiSize, emojiSize);
          }
          img.src = './static/' + emotion + '.png'
          });
      }
      $('#emotion').text(emotion);
    }
  }

  function dataURItoBlob(dataURI) {
    var binary = atob(dataURI.split(',')[1]);
    var array = [];
    for(var i = 0; i < binary.length; i++) {
        array.push(binary.charCodeAt(i));
    }
    return new Blob([new Uint8Array(array)], {type: 'image/png'});
  }

  function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    )
  }

var qrcode = new QRCode(document.getElementById("qr-img"), {
    text: '',
    width: 500,
    height: 500,
    colorDark : "#000000",
    colorLight : "#ffffff",
    correctLevel : QRCode.CorrectLevel.H
});
qrcode.clear();
var qrContainer = $('#qr-container');
var timeto = 3; // time in seconds to capture
var trigger = $("#qr-description");

function qrDescription() {
  return $("#qr-description");
}

function takePhoto() {
  return $('#take-photo');
}
  
  function shareImage(imageURL, twitterUsername) {
    $.ajax({
      type: "POST",
      url: "/share",
      data:{
        image: imageURL,
        username: twitterUsername
      }
    });
  }