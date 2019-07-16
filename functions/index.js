const functions = require("firebase-functions");
const tfjs = require("@tensorflow/tfjs-node");
const canvas = require("canvas");
const { Canvas, Image, ImageData } = canvas;
const os = require("os");
const fs = require("fs");
const path = require("path");
const spawn = require("child-process-promise").spawn;
const faceapi = require("face-api.js");
const admin = require("firebase-admin");
const firebase = require("firebase");

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

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//

faceapi.env.monkeyPatch({ Canvas, Image, ImageData });
const MODELS_URL = path.join(__dirname, "./models");

// exports.processSelfie = functions.storage
//   .object()
//   .onFinalize(async (object, context) => {
//     const fileBucket = object.bucket;
//     const bucket = admin.storage().bucket(fileBucket);
//     const contentType = object.contentType;
//     const filePath = object.name;

//     await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_URL);
//     await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_URL);
//     await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_URL);

//     if (!filePath.startsWith("Users")) {
//       return console.log("Not an upload from User");
//     }

//     let labels = [{ [object.name]: object }];

//     console.log("This is -___>", labels);

//     const labeledFaceDescriptors = await Promise.all(
//       labels.map(async label => {
//         // fetch image data from urls and convert blob to HTMLImage element
//         const refImg = await canvas.loadImage(label.mediaLink);
//         const img = await faceapi.createCanvasFromMedia(refImg);
//         // console.log("This is the media link", label.mediaLink);
//         // console.log("Got the image", img);

//         // detect the face with the highest score in the image and compute it's landmarks and face descriptor
//         const fullFaceDescription = await faceapi
//           .detectSingleFace(img)
//           .withFaceLandmarks()
//           .withFaceDescriptor();
//         console.log("Got descriptions", fullFaceDescription);

//         // If we dont detect any face we'll show a error.
//         if (!fullFaceDescription) {
//           throw new Error(`no faces detected for ${label}`);
//         }

//         // Returning for the map function data.
//         return {
//           descriptor: [fullFaceDescription.descriptor],
//           label: label.name
//         };
//       })
//     );
//     // Returning all data maped.
//     console.log("These are the descriptions", labeledFaceDescriptors);

//     // return labeledFaceDescriptors;

//     const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);

//     const tempFilePath = path.join(os.tmpdir(), fileName);
//     await bucket
//       .file(`/Photographers/Photographer1/dougie.jpg`)
//       .download({ destination: tempFilePath })
//       .then(() => {
//         return bucket.upload(tempFilePath, {
//           destination: "something" + path.basename("dougie2.jpg")
//         });
//       });
//   });

exports.