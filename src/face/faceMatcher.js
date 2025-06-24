
// src/face/faceMatcher.js
const fs = require('fs');
const path = require('path');
const faceapi = require('@vladmandic/face-api');
const canvas = require('canvas');
const { Canvas, Image, ImageData } = canvas;

// monkey-patch
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// 경로 고정
const faceDataPath = path.resolve(__dirname, '../../memory/faceData.json');
let labeledDescriptors = [];

// 얼굴 데이터 로드
function loadFaceData() {
  if (!fs.existsSync(faceDataPath)) return [];
  try {
    const raw = fs.readFileSync(faceDataPath);
    const json = JSON.parse(raw);
    return json.map(entry => new faceapi.LabeledFaceDescriptors(
      entry.label,
      entry.descriptors.map(d => new Float32Array(d))
    ));
  } catch (e) {
    console.error('얼굴 데이터 로드 실패:', e.message);
    return [];
  }
}

async function initModels() {
  const modelPath = path.resolve(__dirname, '../../models');
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);

  labeledDescriptors = loadFaceData();
}

// base64 -> buffer -> canvas image
function imageFromBase64(base64) {
  const buffer = Buffer.from(base64, 'base64');
  return canvas.loadImage(buffer);
}

async function detectFaceMatch(base64) {
  try {
    const img = await imageFromBase64(base64);
    const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
    if (!detections) return 'unknown';

    const matcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
    const bestMatch = matcher.findBestMatch(detections.descriptor);
    return bestMatch.label || 'unknown';
  } catch (err) {
    console.error('얼굴 매칭 실패:', err.message);
    return 'unknown';
  }
}

module.exports = { initModels, detectFaceMatch };
