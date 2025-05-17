import { poses } from '../data/poses';

// Base URL for the LSP dataset images
const DATASET_BASE_URL = 'https://storage.googleapis.com/lsp-yoga-dataset/images';

interface ImageData {
  imagePath: string;
  url: string;
}

function formatPoseName(name: string): string {
  // Convert to title case and handle special characters
  const formatted = name
    .split(/[\s-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('_')
    .replace(/[^\w\s-]/g, '')
    .replace(/_{2,}/g, '_')
    .trim();
  
  // Generate variations of the name
  const variations = [
    formatted,
    `${formatted}_Pose`,
    `${formatted}_pose`,
    formatted.replace(/_/g, ' '),
    // Add variations with "or" since many files use this format
    `${formatted}_or_`,
    `${formatted}_Pose_or_`,
    `${formatted}_pose_or_`,
    // Add variations without "Pose"
    formatted.replace(/(?:_)?[Pp]ose(?:_)?/g, ''),
    // Add variations with different word orders
    formatted.split('_').reverse().join('_'),
    // Add partial matches
    ...formatted.split('_').filter(word => word.length > 3)
  ];

  // Remove duplicates and empty strings
  return [...new Set(variations)].filter(Boolean).join('|');
}

async function checkImageUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const timeoutDuration = 8000; // 8 seconds timeout
    const img = new Image();
    let isResolved = false;

    const cleanup = () => {
      if (!isResolved) {
        isResolved = true;
        img.src = ''; // Cancel the image loading
      }
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      console.warn(`Image load timeout for URL: ${url}`);
      resolve(false);
    }, timeoutDuration);

    img.onload = () => {
      cleanup();
      clearTimeout(timeoutId);
      // Additional check for image dimensions
      if (img.width > 0 && img.height > 0) {
        resolve(true);
      } else {
        console.warn(`Invalid image dimensions for URL: ${url}`);
        resolve(false);
      }
    };

    img.onerror = () => {
      cleanup();
      clearTimeout(timeoutId);
      console.warn(`Failed to load image from URL: ${url}`);
      resolve(false);
    };

    // Add event listener for abort
    img.onabort = () => {
      cleanup();
      clearTimeout(timeoutId);
      console.warn(`Image load aborted for URL: ${url}`);
      resolve(false);
    };

    // Set crossOrigin to anonymous to handle CORS
    img.crossOrigin = 'anonymous';
    
    // Start loading the image
    try {
      img.src = url;
    } catch (error) {
      cleanup();
      clearTimeout(timeoutId);
      console.error(`Error setting image source for URL: ${url}`, error);
      resolve(false);
    }
  });
}

// Reliable fallback image URLs for each pose category
const fallbackImages = {
  standing: [
    'https://images.pexels.com/photos/8436584/pexels-photo-8436584.jpeg',
    'https://images.pexels.com/photos/6698513/pexels-photo-6698513.jpeg',
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b',
    'https://images.pexels.com/photos/6698886/pexels-photo-6698886.jpeg'
  ],
  balance: [
    'https://images.pexels.com/photos/6698513/pexels-photo-6698513.jpeg',
    'https://images.pexels.com/photos/6698515/pexels-photo-6698515.jpeg',
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773',
    'https://images.pexels.com/photos/6698886/pexels-photo-6698886.jpeg'
  ],
  forward: [
    'https://images.pexels.com/photos/6698886/pexels-photo-6698886.jpeg',
    'https://images.pexels.com/photos/6698637/pexels-photo-6698637.jpeg',
    'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0',
    'https://images.pexels.com/photos/6698513/pexels-photo-6698513.jpeg'
  ],
  twist: [
    'https://images.pexels.com/photos/6698641/pexels-photo-6698641.jpeg',
    'https://images.pexels.com/photos/6698637/pexels-photo-6698637.jpeg',
    'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0',
    'https://images.pexels.com/photos/6698886/pexels-photo-6698886.jpeg'
  ],
  backbend: [
    'https://images.pexels.com/photos/6698637/pexels-photo-6698637.jpeg',
    'https://images.pexels.com/photos/6698641/pexels-photo-6698641.jpeg',
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773',
    'https://images.pexels.com/photos/6698515/pexels-photo-6698515.jpeg'
  ],
  inversion: [
    'https://images.pexels.com/photos/6698515/pexels-photo-6698515.jpeg',
    'https://images.pexels.com/photos/6698513/pexels-photo-6698513.jpeg',
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b',
    'https://images.pexels.com/photos/6698886/pexels-photo-6698886.jpeg'
  ],
  // Add a general category for poses that don't fit other categories
  general: [
    'https://images.pexels.com/photos/6698513/pexels-photo-6698513.jpeg',
    'https://images.pexels.com/photos/6698886/pexels-photo-6698886.jpeg',
    'https://images.pexels.com/photos/6698637/pexels-photo-6698637.jpeg',
    'https://images.pexels.com/photos/6698515/pexels-photo-6698515.jpeg'
  ]
};

interface Pose {
  name: string;
  description: string;
}

function getFallbackImagesForPose(pose: Pose): string[] {
  // Determine pose category based on name or description
  const poseLower = (pose.name + ' ' + pose.description).toLowerCase();
  let categoryImages: string[] = [];
  
  // Check for multiple categories and combine their images
  if (poseLower.includes('warrior') || poseLower.includes('mountain') || poseLower.includes('stand')) {
    categoryImages = [...categoryImages, ...fallbackImages.standing];
  }
  if (poseLower.includes('tree') || poseLower.includes('balance')) {
    categoryImages = [...categoryImages, ...fallbackImages.balance];
  }
  if (poseLower.includes('forward') || poseLower.includes('bend') || poseLower.includes('fold')) {
    categoryImages = [...categoryImages, ...fallbackImages.forward];
  }
  if (poseLower.includes('twist') || poseLower.includes('revolve')) {
    categoryImages = [...categoryImages, ...fallbackImages.twist];
  }
  if (poseLower.includes('back') || poseLower.includes('bow') || poseLower.includes('cobra')) {
    categoryImages = [...categoryImages, ...fallbackImages.backbend];
  }
  if (poseLower.includes('inversion') || poseLower.includes('headstand') || 
      poseLower.includes('shoulder') || poseLower.includes('handstand')) {
    categoryImages = [...categoryImages, ...fallbackImages.inversion];
  }
  
  // If no specific category was found, use general category
  if (categoryImages.length === 0) {
    categoryImages = fallbackImages.general;
  }
  
  // Remove duplicates and return
  return [...new Set(categoryImages)];
}

async function readDatasetLinks(poseName: string): Promise<Map<string, string>> {
  try {
    const searchPattern = formatPoseName(poseName);
    console.log(`Searching for pose: ${poseName} with pattern: ${searchPattern}`);
    
    // Get list of all files in the directory
    const indexResponse = await fetch('/datasets/yoga82/yoga_datasets_links/index.json');
    if (!indexResponse.ok) {
      console.warn('Failed to fetch index.json, falling back to alternative sources');
      return new Map();
    }
    
    const files = await indexResponse.json();
    
    // Try to find a matching file using various patterns
    const possibleMatches = files.filter((filename: string) => {
      const lower = filename.toLowerCase();
      const patterns = searchPattern.toLowerCase().split('|');
      
      // Try exact matches first
      const exactMatch = patterns.some(pattern => lower === pattern.toLowerCase());
      if (exactMatch) {
        console.log(`Found exact match: ${filename}`);
        return true;
      }
      
      // Then try partial matches
      const partialMatch = patterns.some(pattern => {
        const matches = lower.includes(pattern.toLowerCase()) ||
                       lower.includes(pattern.replace(/_/g, ' ').toLowerCase());
        if (matches) {
          console.log(`Found partial match: ${filename} matches pattern: ${pattern}`);
        }
        return matches;
      });
      
      return partialMatch;
    });

    // Try each possible matching file
    for (const filename of possibleMatches) {
      try {
        const response = await fetch(`/datasets/yoga82/yoga_datasets_links/${filename}`);
        if (!response.ok) continue;

        const text = await response.text();
        const links = new Map<string, string>();
        const validationPromises: Promise<void>[] = [];
        
        // Process each line and create validation promises
        text.split('\n').forEach(line => {
          if (!line.trim()) return;
          
          const parts = line.split('\t').map(s => s.trim());
          if (parts.length !== 2) return;

          const [path, url] = parts;
          if (path && url) {
            const cleanUrl = url.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
            if (cleanUrl.startsWith('http')) {
              validationPromises.push(
                checkImageUrl(cleanUrl).then(isValid => {
                  if (isValid) {
                    links.set(path, cleanUrl);
                  }
                })
              );
            }
          }
        });

        // Wait for all URL validations to complete with a timeout
        const timeout = new Promise(resolve => setTimeout(resolve, 30000)); // 30 second total timeout
        await Promise.race([
          Promise.allSettled(validationPromises),
          timeout
        ]);
        
        if (links.size > 0) {
          console.log(`Found ${links.size} valid images for pose: ${poseName} in file: ${filename}`);
          return links;
        }
      } catch (error) {
        console.error(`Failed to process file ${filename} for pose ${poseName}:`, error);
      }
    }
    
    return new Map();
  } catch (error) {
    console.error(`Error reading dataset links for ${poseName}:`, error);
    return new Map();
  }
}

// Function to download dataset images
export const downloadDataset = async () => {
  try {
    console.log('Starting LSP dataset download...');

    // Create a progress indicator in the UI
    const progressDiv = document.createElement('div');
    progressDiv.style.position = 'fixed';
    progressDiv.style.bottom = '20px';
    progressDiv.style.right = '20px';
    progressDiv.style.padding = '10px';
    progressDiv.style.backgroundColor = 'white';
    progressDiv.style.borderRadius = '5px';
    progressDiv.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    progressDiv.style.zIndex = '9999';
    document.body.appendChild(progressDiv);

    const processedImages: { [key: string]: string[] } = {};
    let totalPoses = poses.length;
    let processedPoses = 0;
    let successfulPoses = 0;
    let totalImages = 0;

    // Process each pose
    for (const pose of poses) {
      try {
        console.log(`\nProcessing pose: ${pose.name}`);
        
        // Get images from LSP dataset
        const response = await fetch('/datasets/lsp/yoga_train.txt');
        const data = await response.text();
        const lines = data.split('\n').filter(line => line.trim());
        
        const poseImages = lines
          .filter(line => line.toLowerCase().includes(pose.id.toLowerCase()))
          .map(line => {
            const [path] = line.split(',');
            return `${DATASET_BASE_URL}/${path}`;
          });

        if (poseImages.length > 0) {
          processedImages[pose.id] = poseImages;
          successfulPoses++;
          totalImages += poseImages.length;
        } else {
          // Use default image if no dataset images found
          processedImages[pose.id] = [pose.image];
          successfulPoses++;
          totalImages++;
        }

        processedPoses++;
        const progress = Math.round((processedPoses / totalPoses) * 100);
        const statusText = `Processing dataset: ${progress}% (Found ${successfulPoses} poses, ${totalImages} images)`;
        progressDiv.textContent = statusText;
      } catch (error) {
        console.error(`Error processing pose ${pose.name}:`, error);
      }
    }

    if (Object.keys(processedImages).length === 0) {
      throw new Error('No images were found in the dataset');
    }

    // Store processed images in localStorage
    localStorage.setItem('lsp_images', JSON.stringify(processedImages));
    localStorage.setItem('lsp_dataset_downloaded', 'true');

    // Remove progress indicator
    document.body.removeChild(progressDiv);
    
    console.log('Dataset processing completed!');
    console.log(`Successfully processed ${successfulPoses}/${totalPoses} poses`);
    console.log(`Total images found: ${totalImages}`);

    // Trigger a page reload to refresh the images
    window.location.reload();
  } catch (error) {
    console.error('Error processing dataset:', error);
    throw error;
  }
};

// Function to check if dataset is downloaded
export const isDatasetDownloaded = (): boolean => {
  try {
    const isDownloaded = localStorage.getItem('lsp_dataset_downloaded') === 'true';
    const hasImages = Object.keys(JSON.parse(localStorage.getItem('lsp_images') || '{}')).length > 0;
    return isDownloaded && hasImages;
  } catch (error) {
    return false;
  }
};

// Function to get image URLs for a pose
export const getDatasetImageUrl = (poseId: string): string => {
  try {
    const processedImages = JSON.parse(localStorage.getItem('lsp_images') || '{}');
    const images = processedImages[poseId];
    
    if (images && images.length > 0) {
      return images[0]; // Return the first image URL
    }
    
    // Return the default image if no dataset image is available
    const pose = poses.find(p => p.id === poseId);
    return pose?.image || '';
  } catch (error) {
    console.error('Error getting dataset image URL:', error);
    return '';
  }
};

// Function to download dataset images
export const downloadDatasetImages = async () => {
  try {
    const response = await fetch('/datasets/lsp/yoga_train.txt');
    const data = await response.text();
    const lines = data.split('\n').filter(line => line.trim());

    const images: ImageData[] = lines.map(line => {
      const [path] = line.split(',');
      return {
        imagePath: path,
        url: `${DATASET_BASE_URL}/${path}`
      };
    });

    return images;
  } catch (error) {
    console.error('Error downloading dataset images:', error);
    return [];
  }
}; 