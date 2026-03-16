import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_DOCS_DIR = path.join(__dirname, '../../source_docs');
const SOURCE_IMAGES_DIR = path.join(__dirname, '../../source_images');

/**
 * Find all PDF files in source_docs directory
 */
function findPdfFiles(dir: string): string[] {
  const results: string[] = [];
  
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    if (item.isFile() && item.name.toLowerCase().endsWith('.pdf')) {
      results.push(path.join(dir, item.name));
    }
  }
  
  return results;
}

/**
 * Convert a PDF to images using pdftoppm
 */
function convertPdfToImages(pdfPath: string): void {
  const pdfName = path.basename(pdfPath, '.pdf');
  const outputDir = path.join(SOURCE_IMAGES_DIR, pdfName);
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created directory: ${outputDir}`);
  } else {
    console.log(`Directory already exists: ${outputDir}`);
    console.log('Skipping (delete folder to regenerate)');
    return;
  }
  
  // Use pdftoppm to convert PDF pages to images
  // -jpeg: output as JPEG
  // -r 300: resolution 300 DPI
  // Output pattern: <pdfName>-<pagenum>.jpg
  const outputPattern = path.join(outputDir, pdfName);
  
  try {
    console.log(`Converting: ${pdfName}`);
    
    const command = `pdftoppm -jpeg -r 300 "${pdfPath}" "${outputPattern}"`;
    execSync(command, { stdio: 'inherit' });
    
    console.log(`✓ Successfully converted: ${pdfName}\n`);
  } catch (error) {
    console.error(`✗ Failed to convert ${pdfName}:`, error);
    // Clean up the directory if conversion failed
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true });
    }
  }
}

/**
 * Main function
 */
async function main() {
  console.log('PDF to Images Converter');
  console.log('='.repeat(50));
  console.log(`Source PDFs: ${SOURCE_DOCS_DIR}`);
  console.log(`Output directory: ${SOURCE_IMAGES_DIR}\n`);
  
  // Check if pdftoppm is available
  try {
    execSync('which pdftoppm', { stdio: 'ignore' });
  } catch (error) {
    console.error('Error: pdftoppm is not installed or not in PATH');
    console.error('Install it with: sudo apt-get install poppler-utils');
    process.exit(1);
  }
  
  // Find all PDF files
  const pdfFiles = findPdfFiles(SOURCE_DOCS_DIR);
  console.log(`Found ${pdfFiles.length} PDF file(s)\n`);
  
  if (pdfFiles.length === 0) {
    console.log('No PDFs found. Exiting.');
    return;
  }
  
  // Convert each PDF
  let successCount = 0;
  let skippedCount = 0;
  let failCount = 0;
  let processedCount = 0;
  
  for (const pdfPath of pdfFiles) {
    processedCount++;
    const pdfName = path.basename(pdfPath, '.pdf');
    const outputDir = path.join(SOURCE_IMAGES_DIR, pdfName);
    
    console.log(`[${processedCount}/${pdfFiles.length}] ${pdfName}`);
    
    if (fs.existsSync(outputDir)) {
      console.log('Skipping (already exists)\n');
      skippedCount++;
      continue;
    }
    
    try {
      convertPdfToImages(pdfPath);
      successCount++;
    } catch (error) {
      failCount++;
    }
  }
  
  // Summary
  console.log('='.repeat(50));
  console.log('Conversion complete!');
  console.log(`Successfully converted: ${successCount}`);
  console.log(`Skipped (already exist): ${skippedCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total: ${pdfFiles.length}`);
}

// Run the script
main().catch(console.error);
