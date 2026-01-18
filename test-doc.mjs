import { readFileSync } from 'fs';
import JSZip from 'jszip';
import { parseStringPromise } from 'xml2js';

const buffer = readFileSync('/home/ubuntu/upload/StatutoryOffencesForMedicalManslaughter.docx');

console.log('Loading DOCX as ZIP...');
const zip = await JSZip.loadAsync(buffer);

const fileList = Object.keys(zip.files);
console.log('Files with "footnote":', fileList.filter(f => f.includes('footnote')));

const footnotesXml = zip.file('word/footnotes.xml');

if (!footnotesXml) {
  console.log('NO footnotes.xml found!');
  console.log('Available word/ files:', fileList.filter(f => f.startsWith('word/')));
  process.exit(1);
}

console.log('\nFound footnotes.xml, parsing...');
const xmlContent = await footnotesXml.async('text');
console.log('XML length:', xmlContent.length);

const parsed = await parseStringPromise(xmlContent);
console.log('Parsed XML keys:', Object.keys(parsed));

const footnotes = parsed['w:footnotes']?.['w:footnote'] || [];
console.log('\nTotal footnote elements:', footnotes.length);

let realFootnotes = 0;
for (const footnote of footnotes) {
  const id = footnote.$?.['w:id'];
  const type = footnote.$?.['w:type'];
  console.log(`  Footnote ${id}: type=${type || 'normal'}`);
  
  if (type !== 'separator' && type !== 'continuationSeparator') {
    realFootnotes++;
  }
}

console.log('\n=== RESULT ===');
console.log('Real footnotes (excluding separators):', realFootnotes);
