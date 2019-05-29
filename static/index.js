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

  function predict() {
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

  function displayEmotion(emotionPrediction){
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


var timer = null;

var qrcode = new QRCode(document.getElementById("qrcode-img"), {
    text: 'res',
    width: 500,
    height: 500,
    colorDark : "#000000",
    colorLight : "#ffffff",
    correctLevel : QRCode.CorrectLevel.H
});

  function createAndSavePolaroid() {
    var timeto = 3; // time in seconds to capture
    var countdown = $("#timer").html(timeto);
    if (timer !== null) {
        // some logic here if autoshoot in progress and user click button again
    } else {
        $("#autoshootmsg").show();
        timer = window.setInterval(function() {
            timeto--;
            countdown.html(timeto);
            if (timeto == 0) {
                window.clearInterval(timer);
                timer = null;
                $("#autoshootmsg").hide();
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
                polaroidCtx.fillText(dateText, (polaroidCanvas.width/2) - (dateTextWidth/2), polaroidFooterDivOffset + 60);
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
                }, function(err, data) {
                    if (err) {
                    return alert('There was an error uploading your photo: ', err, data);
                    }
                    
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
                            qrcode.makeCode(res);
                        });
                    });
                });
                if('{{twitter}}' == 'True') 
                    shareImage(imagePng, document.getElementById('twitterUsername').value);
                }
            };
        }, 1000);
    };
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