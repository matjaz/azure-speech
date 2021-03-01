'use strict';

const {exec} = require("child_process");
const sdk = require("microsoft-cognitiveservices-speech-sdk");
const recorder = require('node-record-lpcm16');

var subscriptionKey = process.env.AZURE_SUB_KEY;
var serviceRegion = "westeurope";

function fromMic(
  encoding = 'LINEAR16',
  sampleRateHertz = 16000,
  languageCode = 'sl-SI'
) {
  
  const pushStream = sdk.AudioInputStream.createPushStream();

  // Start recording and send the microphone input to the Speech API
  recorder
    .record({
      sampleRateHertz: sampleRateHertz,
      threshold: 0, //silence threshold
      recordProgram: 'rec', // Try also "arecord" or "sox"
      silence: '5.0', //seconds of silence before ending
    })
    .stream()
    .on('error', console.error)
    .on('data', function(arrayBuffer) {
        pushStream.write(arrayBuffer.slice());
    }).on('end', function() {
        pushStream.close();
    });

 
  let speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);
  speechConfig.speechRecognitionLanguage = languageCode;

  let audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
  let recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
  recognizer.recognizeOnceAsync(result => {
      console.log(`RECOGNIZED: Text=${result.text}`);
      recognizer.close();
      recognizer = undefined
      processSpeechResult(result)
  });

  console.log('Listening, press Ctrl+C to stop.');
}


function say(text) {
  var filename = 'tmp123.wav'
  var audioConfig = sdk.AudioConfig.fromAudioFileOutput(filename);
  var speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);

  // setting the synthesis language, voice name, and output audio format.
  // see https://aka.ms/speech/tts-languages for available languages and voices
  speechConfig.speechSynthesisLanguage = 'sl-SI';
  // speechConfig.speechSynthesisVoiceName = "sl-SI-RokNeural";
  // speechConfig.speechSynthesisVoiceName = "sl-SI-PetraNeural";
  speechConfig.speechSynthesisVoiceName = "sl-SI-Lado";

  speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

  var synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
  synthesizer.speakTextAsync(text,
    function (result) {
      synthesizer.close();
      synthesizer = undefined;
      exec(`afplay ${filename} && rm ${filename}`)
    },
    function (err) {
      console.trace("err - " + err);
      synthesizer.close();
      synthesizer = undefined;
      exec(`rm ${filename}`)
    }
  )
}


function processSpeechResult(result) {
    const lower = result.text.toLowerCase()
    if (lower.includes('koliko') && lower.includes('ura')) {
        say(getTimeText())
    }
}


function getTimeText(date = new Date()) {
  return `Ura je ${date.getHours()} ${date.getMinutes()}`
}


process.on('unhandledRejection', err => {
  console.error(err.message);
  process.exitCode = 1;
});

fromMic();

// processSpeechResult({
//     text: 'Koliko je ura?',
// })

// say('Lahko noč')
