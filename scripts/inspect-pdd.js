const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const PDD_PATH = process.argv[2] ||
  'C:\\Users\\nitin.varshneya\\Downloads\\Approved_PDD_Graphic_Autonumber_v2.0.docx';

(async () => {
  if (!fs.existsSync(PDD_PATH)) {
    console.error('PDD not found:', PDD_PATH);
    process.exit(1);
  }
  console.log('Inspecting:', PDD_PATH);

  // 1) Plain text extraction
  const textResult = await mammoth.extractRawText({ path: PDD_PATH });
  console.log('\n=== TEXT (first 2000 chars) ===');
  console.log(textResult.value.substring(0, 2000));
  console.log('\n--- text length:', textResult.value.length);

  // 2) HTML with images
  let imageIndex = 0;
  const outDir = path.join(__dirname, '..', 'tmp-pdd-analysis', 'images');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const imageManifest = [];
  const htmlResult = await mammoth.convertToHtml(
    { path: PDD_PATH },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const buffer = await image.read();
        imageIndex += 1;
        const extFromCT = (image.contentType || 'image/png').split('/')[1] || 'png';
        const filename = `image-${String(imageIndex).padStart(3, '0')}.${extFromCT}`;
        const filePath = path.join(outDir, filename);
        fs.writeFileSync(filePath, buffer);
        imageManifest.push({
          index: imageIndex,
          filename,
          contentType: image.contentType,
          bytes: buffer.length,
          altText: image.altText || ''
        });
        return { src: filename, alt: image.altText || `Figure ${imageIndex}` };
      })
    }
  );

  fs.writeFileSync(
    path.join(__dirname, '..', 'tmp-pdd-analysis', 'pdd.html'),
    htmlResult.value,
    'utf-8'
  );
  fs.writeFileSync(
    path.join(__dirname, '..', 'tmp-pdd-analysis', 'pdd.txt'),
    textResult.value,
    'utf-8'
  );
  fs.writeFileSync(
    path.join(__dirname, '..', 'tmp-pdd-analysis', 'images-manifest.json'),
    JSON.stringify(imageManifest, null, 2),
    'utf-8'
  );

  console.log('\n=== IMAGES ===');
  console.log('Total images extracted:', imageManifest.length);
  imageManifest.forEach(img => {
    console.log(`  ${img.filename} | ${img.contentType} | ${img.bytes} bytes | alt="${img.altText}"`);
  });

  console.log('\n=== MAMMOTH WARNINGS ===');
  textResult.messages.forEach(m => console.log(`  [${m.type}] ${m.message}`));
})();
