// registerFaceData.js
const fs = require('fs');
const path = require('path');
const faceapi = require('@vladmandic/face-api');
const canvas = require('canvas');
const { Canvas, Image, ImageData } = canvas;

faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const MODEL_PATH = path.resolve(__dirname, './models');
const FACE_BASE = path.resolve(__dirname, 'memory/face');
const OUTPUT_PATH = path.resolve(__dirname, 'memory/faceData.json');

// 이미지 불러오기
async function loadImagesFromDir(labelDir) {
  const label = path.basename(labelDir);
  const files = fs.readdirSync(labelDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
  const descriptors = [];

  for (const file of files) {
    const imgPath = path.join(labelDir, file);
    const img = await canvas.loadImage(imgPath);
    const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

    if (detection) {
      descriptors.push(detection.descriptor);
      console.log(`[✅] ${label} 이미지 처리 성공: ${file}`);
    } else {
      console.warn(`[⚠️] ${label} 이미지에서 얼굴 인식 실패: ${file}`);
    }
  }

  if (descriptors.length === 0) return null;

  return new faceapi.LabeledFaceDescriptors(label, descriptors);
}

// 전체 얼굴 라벨 처리
async function run() {
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_PATH);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH);

  const labels = fs.readdirSync(FACE_BASE).filter(name => fs.statSync(path.join(FACE_BASE, name)).isDirectory());

  const allDescriptors = [];

  for (const label of labels) {
    const fullPath = path.join(FACE_BASE, label);
    const result = await loadImagesFromDir(fullPath);
    if (result) allDescriptors.push(result);
  }

  const serialized = allDescriptors.map(ld => ({
    label: ld.label,
    descriptors: ld.descriptors.map(d => Array.from(d))
  }));

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(serialized, null, 2));
  console.log(`[🎉] 얼굴 데이터 저장 완료: ${OUTPUT_PATH}`);
}

run();
