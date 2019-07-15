const functions = require("firebase-functions");
// const gcs = require("@google-cloud/storage")();
const tfjs = require("@tensorflow/tfjs-node");
const canvas = require("canvas");
const { Canvas, Image, ImageData } = canvas;
const os = require("os");
const fs = require("fs");
const path = require("path");
const spawn = require("child-process-promise").spawn;
const faceapi = require("face-api.js");
const admin = require("firebase-admin");
admin.initializeApp();

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//

faceapi.env.monkeyPatch({ Canvas, Image, ImageData });
const MODEL_DIR = (require = "./models");

exports.onFileChange = functions.storage.object().onFinalize(async object => {
  // const object = event.data;
  const fileBucket = object.bucket;
  const bucket = admin.storage().bucket(fileBucket);
  const contentType = object.contentType;
  const filePath = object.name;
  console.log("File change detected, function execution started");
  console.log(object);

  if (object.resourceState === "not_exists") {
    console.log("We deleted a file, exit...");
    return;
  }

  if (path.basename(filePath).startsWith("resized-")) {
    console.log("We already renamed that file!");
    return;
  }

  if (!filePath.startsWith("Users")) {
    return console.log("Not an upload from User");
  }

  const tmpFilePath = path.join(os.tmpdir(), path.basename(filePath));
  const tmpPhotographerFilePath = path.join(
    os.tmpdir(),
    path.basename(`${filePath}/Photographers`)
  );
  const metadata = { contentType: contentType };

  return bucket
    .file(filePath)
    .download({
      destination: tmpFilePath
    })
    .then(() => {
      //set ^^ to a known const
      //set photographerfilepath to const unknown
      return spawn("convert", [tmpFilePath, "-resize", "500x500", tmpFilePath]);
      //do facial recognition stuff
      //get selfie --triggered from new add to users known
      //get the photographers albums unknown
      //compare... map and compare to the known
      //a folder of matched photos?
    })
    .then(() => {
      //return the FOLDER of matches images
      return bucket.upload(tmpFilePath, {
        destination: "resized-" + path.basename(filePath),
        metadata: metadata
      });
    });
});

exports.processSelfie = functions.storage.object().onFinalize(async object => {
  const fileBucket = object.bucket;
  const bucket = admin.storage().bucket(fileBucket);
  const contentType = object.contentType;
  const filePath = object.name;

  await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_DIR);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_DIR);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_DIR);
});
