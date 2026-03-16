import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY!;
const OLLAMA_API = 'https://api.rcpch.ac.uk/ollama/api/generate';
const MODEL_NAME = 'glm-ocr';
const SOURCE_IMAGES_DIR = path.join(__dirname, '../../source_images');
const SOURCE_MARKDOWN_DIR = path.join(__dirname, '../../source_markdown');

// Supported image extensions
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

/**
 * Recursively find all image files in a directory
 */
function findImageFiles(dir: string): string[] {
  const results: string[] = [];
  
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      results.push(...findImageFiles(fullPath));
    } else if (item.isFile()) {
      const ext = path.extname(item.name).toLowerCase();
      if (IMAGE_EXTENSIONS.includes(ext)) {
        results.push(fullPath);
      }
    }
  }
  
  return results;
}

/**
 * Convert image to base64
 */
function imageToBase64(imagePath: string): string {
  const imageBuffer = fs.readFileSync(imagePath);
  return imageBuffer.toString('base64');
}

/**
 * Call Ollama API to OCR an image
 */
async function ocrImage(imagePath: string): Promise<string> {
  const base64Image = imageToBase64(imagePath);
  
  const requestBody = {
    model: MODEL_NAME,
    prompt: 'Extract all text from this image. Provide the text in markdown format, preserving any structure, headings, lists, or formatting present in the image.',
    images: [base64Image],
    stream: false
  };
  
  console.log(`Processing: ${imagePath}`);
  
  try {
    const response = await fetch(OLLAMA_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': OLLAMA_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json() as OllamaResponse;
    return data.response;
  } catch (error) {
    console.error(`Error processing ${imagePath}:`, error);
    throw error;
  }
}

/**
 * Save OCR result as markdown file
 */
function saveMarkdown(imagePath: string, content: string): void {
  // Get relative path from source_images directory
  const relativePath = path.relative(SOURCE_IMAGES_DIR, imagePath);
  
  // Change extension to .md
  const markdownPath = path.join(
    SOURCE_MARKDOWN_DIR,
    relativePath.replace(/\.[^.]+$/, '.md')
  );
  
  // Ensure directory exists
  const markdownDir = path.dirname(markdownPath);
  fs.mkdirSync(markdownDir, { recursive: true });
  
  // Write the markdown file
  fs.writeFileSync(markdownPath, content, 'utf-8');
  console.log(`Saved: ${markdownPath}`);
}

/**
 * Main function to process all images
 */
async function main() {
  console.log(`Scanning for images in: ${SOURCE_IMAGES_DIR}`);
  
  // Find all image files
  const imageFiles = findImageFiles(SOURCE_IMAGES_DIR);
  console.log(`Found ${imageFiles.length} image(s) to process\n`);
  
  if (imageFiles.length === 0) {
    console.log('No images found. Exiting.');
    return;
  }
  
  // Process each image
  let successCount = 0;
  let failCount = 0;
  let processedCount = 0;
  
  for (const imagePath of imageFiles) {
    processedCount++;
    console.log(`[${processedCount}/${imageFiles.length}] Processing: ${path.relative(SOURCE_IMAGES_DIR, imagePath)}`);
    
    try {
      const ocrResult = await ocrImage(imagePath);
      saveMarkdown(imagePath, ocrResult);
      successCount++;
    } catch (error) {
      console.error(`Failed to process ${imagePath}:`, error);
      failCount++;
    }
    
    console.log('');
  }
  
  // Summary
  console.log('='.repeat(50));
  console.log(`Processing complete!`);
  console.log(`Successfully processed: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total: ${imageFiles.length}`);
}

// Run the script
main().catch(console.error);
