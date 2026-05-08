const fs = require('fs');
const path = require('path');

const targetFile = '/Users/max/Desktop/AI TEST/24hnow/src/lib/guide-data.ts';
const newGuidesFile = '/Users/max/.gemini/antigravity/brain/1402e397-ba3b-4956-829f-fbaaa37be05f/new-guides.txt';

let content = fs.readFileSync(targetFile, 'utf8');
const newGuides = fs.readFileSync(newGuidesFile, 'utf8');

// Find the position before the last ];
const lastIndex = content.lastIndexOf('];');

if (lastIndex !== -1) {
  const updatedContent = content.slice(0, lastIndex) + newGuides + content.slice(lastIndex);
  fs.writeFileSync(targetFile, updatedContent);
  console.log('Successfully updated guide-data.ts with 10 new guides.');
} else {
  console.error('Could not find the end of guidePosts array.');
}
