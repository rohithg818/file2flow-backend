const JSZip = require('jszip');
const fs = require('fs');
const buf = fs.readFileSync('../src/testdocuments/Rohith_Gopi_Resume_1.docx');
JSZip.loadAsync(buf).then(zip => Promise.all([
  zip.file('word/document.xml').async('string'),
  zip.file('word/styles.xml').async('string').catch(() => null),
])).then(([docXml, stylesXml]) => {
  // Find section properties
  const sectPrs = docXml.match(/<w:sectPr[^>]*>[\s\S]*?<\/w:sectPr>/g) || [];
  console.log('Section properties count:', sectPrs.length);
  sectPrs.forEach((sp, i) => {
    console.log(`\n--- sectPr ${i} ---`);
    console.log(sp.substring(0, 500));
  });

  // Count paragraphs with page breaks before
  const pageBreaksBefore = (docXml.match(/w:pageBreakBefore/g) || []);
  console.log('\nPage breaks before:', pageBreaksBefore.length);

  // Find all w:pPr that have page break
  const pPrs = docXml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/g) || [];
  console.log('Total paragraph props:', pPrs.length);
  const breakPprs = pPrs.filter(p => p.includes('pageBreakBefore') || p.includes('w:br'));
  console.log('Paragraph props with breaks:', breakPprs.length);
  breakPprs.forEach((p, i) => {
    console.log(`\nBreak pPr ${i}:`, p.substring(0, 200));
  });

  // Check for tables
  const tables = (docXml.match(/<w:tbl>/g) || []);
  console.log('\nTables in doc:', tables.length);

  // Check for text boxes / drawings
  const drawings = (docXml.match(/<w:drawing/g) || []);
  console.log('Drawings:', drawings.length);

  const alternateContent = (docXml.match(/<mc:AlternateContent/g) || []);
  console.log('AlternateContent:', alternateContent.length);

  // Check body content structure
  const bodyMatch = docXml.match(/<w:body>([\s\S]*?)<\/w:body>/);
  if (bodyMatch) {
    const body = bodyMatch[1];
    const elements = body.match(/<w:p[ >]|<w:tbl[ >]|<w:sdt[ >]/g) || [];
    console.log('\nBody elements:', elements.length, elements);
  }
});
