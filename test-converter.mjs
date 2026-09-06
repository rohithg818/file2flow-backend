import { convertFile } from './src/services/converter.ts';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const outputDir = './test-output';
if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

const testFiles = [
  { path: './test-files/Invoice_Sample.txt', name: 'Invoice_Sample.txt', format: 'txt', size: 735 },
  { path: './test-files/Financial_Report.txt', name: 'Financial_Report.txt', format: 'txt', size: 927 },
  { path: './test-files/Resume_Sample.txt', name: 'Resume_Sample.txt', format: 'txt', size: 1389 },
  { path: './test-files/Company_Data.json', name: 'Company_Data.json', format: 'json', size: 681 },
  { path: './test-files/Product_Strategy.md', name: 'Product_Strategy.md', format: 'markdown', size: 1168 },
];

const outputFormats = ['pdf', 'html', 'md', 'txt'];

for (const tf of testFiles) {
  const fileBuffer = readFileSync(tf.path);
  const file = new File([fileBuffer], tf.name, { type: 'text/plain' });
  
  for (const outFmt of outputFormats) {
    const fileItem = {
      id: `test-${tf.name}-${outFmt}`,
      file,
      name: tf.name,
      size: tf.size,
      type: file.type,
      format: tf.format,
      outputFormat: outFmt,
      progress: 0,
      status: 'idle',
      createdAt: Date.now(),
    };
    
    const settings = {
      outputFormat: outFmt,
      pageSize: 'a4',
      orientation: 'portrait',
      margin: 'normal',
      quality: 'high',
      addPageNumbers: true,
      watermarkText: '',
      jsonMode: 'report',
      imageFit: 'contain',
    };
    
    try {
      const result = await convertFile(fileItem, settings);
      const ext = outFmt === 'md' ? 'md' : outFmt;
      const outPath = join(outputDir, `${tf.name.replace(/\.[^.]+$/, '')}_to_${ext}.${ext === 'md' ? 'md' : ext}`);
      
      if (outFmt === 'pdf') {
        writeFileSync(outPath, Buffer.from(await result.blob.arrayBuffer()));
      } else {
        writeFileSync(outPath, typeof result.blob === 'string' ? result.blob : await result.blob.text());
      }
      
      console.log(`✅ ${tf.name} → ${outFmt.toUpperCase()} | Size: ${(result.size / 1024).toFixed(1)}KB | Pages: ${result.pageCount} | Time: ${result.conversionTimeMs}ms`);
    } catch (err) {
      console.log(`❌ ${tf.name} → ${outFmt.toUpperCase()} | Error: ${err.message}`);
    }
  }
}
