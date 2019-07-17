const functions = require("firebase-functions");
const tfjs = require("@tensorflow/tfjs-node");
const canvas = require("canvas");
const { Canvas, Image, ImageData } = canvas;
const os = require("os");
const fs = require("fs");
const path = require("path");
const faceapi = require("face-api.js");
const admin = require("firebase-admin");
const firebase = require("firebase");
const spawn = require("child-process-promise").spawn;
const fetch = require("node-fetch");

const serviceAccount = require("./serviceAccount.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "find-my-face.appspot.com",
  databaseURL: "https://find-my-face.firebaseio.com"
});

var firebaseConfig = {
  apiKey: "AIzaSyCMhyzLJpAt6KmCeEgnT9FV4niLUqaP7fw",
  authDomain: "find-my-face.firebaseapp.com",
  databaseURL: "https://find-my-face.firebaseio.com",
  projectId: "find-my-face",
  storageBucket: "find-my-face.appspot.com",
  messagingSenderId: "342095524666",
  appId: "1:342095524666:web:3de5759e04626187"
};

firebase.initializeApp(firebaseConfig);

faceapi.env.monkeyPatch({ fetch: fetch });
const MODELS_URL = path.join(__dirname, "./models");

exports.testRecognition = functions.storage
  .object()
  .onFinalize(async (object, context) => {
    const fileBucket = object.bucket;
    const bucket = admin.storage().bucket(fileBucket);
    const contentType = object.contentType;
    const filePath = object.name;

    if (object.resourceState === "not_exists") {
      console.log("We deleted a file, exit...");
      return;
    }

    if (path.basename(filePath).startsWith("resized-")) {
      console.log("We already renamed that file!");
      return;
    }

    if (!filePath.startsWith("Users")) {
      return console.log("Not an upload from a user!");
    }

    Promise.all([
      await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_URL),
      await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_URL),
      await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_URL)
    ]).then(start);

    function loadLabeledImage() {
      const faceLabel = [path.basename(filePath)];
      return Promise.all(
        faceLabel.map(async label => {
          const descriptions = [];
          const img = await faceapi.fetchImage(object.mediaLink);
          const detections = await faceapi
            .detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();
          descriptions.push(detections.descriptor);

          return new faceapi.LabeledFaceDescriptors(label, descriptions);
        })
      );
    }

    async function start() {
      const labeledFaceDescriptor = await loadLabeledImage();
      const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptor, 0.6);
      img = await faceapi.fetchImage(object.mediaLink);
      canvas = faceapi.createCanvasFromMedia(img);
      const detections = await faceapi
        .detectAllFaces(img)
        .withFaceLandmarks()
        .withFaceDescriptor();
      const results = detections.map(d => {
        faceMatcher.findBestMatch(d.descriptor);
        console.log(results);
      });
    }

    const destBucket = bucket;
    const tmpFilePath = path.join(os.tmpdir(), path.basename(filePath));
    const metadata = { contentType: contentType };
    return destBucket
      .file(filePath)
      .download({
        destination: tmpFilePath
      })
      .then(() => {
        return spawn("convert", [
          tmpFilePath,
          "-resize",
          "500x500",
          tmpFilePath
        ]);
      })
      .then(() => {
        return destBucket.upload(tmpFilePath, {
          destination: "resized-" + path.basename(filePath),
          metadata: metadata
        });
      })
      .then(() => {
        fs.unlinkSync(tempLocalThumbFile);
      });
  });
