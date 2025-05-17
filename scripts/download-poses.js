import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read yoga_train.txt and parse pose information
const YOGA_POSES = {
  1: 'Standing Forward Bend',
  2: 'Lotus Pose',
  3: 'Tree Pose',
  4: 'Headstand',
  5: 'Corpse Pose'
};

const downloadFile = (url, filepath) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);

    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlink(filepath, () => {
          downloadFile(response.headers.location, filepath)
            .then(resolve)
            .catch(reject);
        });
        return;
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(filepath, () => {
          reject(new Error(`Failed to download file: HTTP ${response.statusCode}`));
        });
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(`Successfully downloaded to ${filepath}`);
        resolve();
      });

      file.on('error', (err) => {
        fs.unlink(filepath, () => {
          reject(err);
        });
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {
        reject(err);
      });
    });
  });
};

async function processYogaPoses() {
  try {
    const posesDir = path.join(__dirname, '../public/poses');
    const trainFile = path.join(__dirname, '../public/datasets/lsp/yoga_train.txt');
    
    // Create poses directory if it doesn't exist
    if (!fs.existsSync(posesDir)) {
      fs.mkdirSync(posesDir, { recursive: true });
    }

    // Read and parse yoga_train.txt
    const trainData = fs.readFileSync(trainFile, 'utf-8')
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [imagePath, classId] = line.trim().split(',');
        return {
          pose: YOGA_POSES[parseInt(classId)],
          imagePath,
          classId: parseInt(classId)
        };
      });

    // Create metadata file
    const metadata = {
      poses: Object.entries(YOGA_POSES).map(([id, name]) => ({
        id: parseInt(id),
        name,
        keypoints: [
          'nose',
          'left_eye', 'right_eye',
          'left_ear', 'right_ear',
          'left_shoulder', 'right_shoulder',
          'left_elbow', 'right_elbow',
          'left_wrist', 'right_wrist',
          'left_hip', 'right_hip',
          'left_knee', 'right_knee',
          'left_ankle', 'right_ankle'
        ]
      })),
      totalImages: trainData.length,
      imageFormat: 'jpg'
    };

    // Write metadata
    fs.writeFileSync(
      path.join(posesDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    console.log('Yoga pose metadata created successfully!');
    console.log(`Total poses: ${Object.keys(YOGA_POSES).length}`);
    console.log(`Total images: ${trainData.length}`);

  } catch (error) {
    console.error('Error processing yoga poses:', error);
    process.exit(1);
  }
}

processYogaPoses(); 