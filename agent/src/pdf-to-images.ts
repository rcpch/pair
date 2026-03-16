import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

interface ConversionResult {
  success: boolean;
  skipped: boolean;
  pdfName: string;
}

/**
 * Convert a PDF to images using pdftoppm
 */
async function convertPdfToImages(pdfPath: string): Promise<ConversionResult> {
  const pdfName = path.basename(pdfPath, '.pdf');
  const outputDir = path.join(SOURCE_IMAGES_DIR, pdfName);
  
  // Create output directory if it doesn't exist
  if (fs.existsSync(outputDir)) {
    return { success: true, skipped: true, pdfName };
  }
  
  fs.mkdirSync(outputDir, { recursive: true });
  
  // Use pdftoppm to convert PDF pages to images
  // -jpeg: output as JPEG
  // -r 300: resolution 300 DPI
  // Output pattern: <pdfName>-<pagenum>.jpg
  const outputPattern = path.join(outputDir, pdfName);
  
  try {
    const command = `pdftoppm -jpeg -r 300 "${pdfPath}" "${outputPattern}"`;
    await execAsync(command);
    
    return { success: true, skipped: false, pdfName };
  } catch (error) {
    console.error(`✗ Failed to convert ${pdfName}:`, error);
    // Clean up the directory if conversion failed
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true });
    }
    return { success: false, skipped: false, pdfName };
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
    await execAsync('which pdftoppm');
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
  
  // Convert PDFs with continuous parallel processing (4 at a time)
  const PARALLEL_LIMIT = 12;
  let successCount = 0;
  let skippedCount = 0;
  let failCount = 0;
  let processedCount = 0;
  let startedCount = 0;
  
  console.log(`Processing up to ${PARALLEL_LIMIT} PDFs concurrently...\n`);
  
  // Process PDFs with a worker pool
  const processPdf = async (pdfPath: string, index: number): Promise<ConversionResult> => {
    const pdfName = path.basename(pdfPath, '.pdf');
    console.log(`[${index + 1}/${pdfFiles.length}] Starting: ${pdfName}`);
    
    const result = await convertPdfToImages(pdfPath);
    
    if (result.skipped) {
      console.log(`[${index + 1}/${pdfFiles.length}] ⊘ Skipped: ${result.pdfName} (already exists)`);
    } else if (result.success) {
      console.log(`[${index + 1}/${pdfFiles.length}] ✓ Completed: ${result.pdfName}`);
    } else {
      console.log(`[${index + 1}/${pdfFiles.length}] ✗ Failed: ${result.pdfName}`);
    }
    
    return result;
  };
  
  // Worker pool: maintain PARALLEL_LIMIT concurrent operations
  const activePromises = new Set<Promise<void>>();
  
  for (let i = 0; i < pdfFiles.length; i++) {
    // Create a promise for this PDF
    const promise = processPdf(pdfFiles[i]!, i).then((result) => {
      processedCount++;
      if (result.skipped) {
        skippedCount++;
      } else if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
      // Remove from active set when done
      activePromises.delete(promise);
    });
    
    activePromises.add(promise);
    startedCount++;
    
    // If we've reached the limit, wait for one to finish before starting another
    if (activePromises.size >= PARALLEL_LIMIT) {
      await Promise.race(activePromises);
    }
  }
  
  // Wait for all remaining operations to complete
  await Promise.all(activePromises);
  
  console.log('');
  
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
