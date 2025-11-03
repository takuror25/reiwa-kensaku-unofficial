// This file is run by GitHub Actions, not by the browser.
// It automatically builds the search-index.json file.

const fs = require('fs');
const path = require('path');

console.log("Starting index build...");

// 1. data/files.js からファイルリストを読み込む
let files;
try {
  const filesJSPath = path.join(__dirname, 'data/files.js');
  console.log(`Attempting to read: ${filesJSPath}`);

  if (!fs.existsSync(filesJSPath)) {
      throw new Error("data/files.js file not found at path.");
  }

  const filesJSContent = fs.readFileSync(filesJSPath, 'utf8');
  
  // ★★★ これが安全装置です ★★★
  // data/files.js が空、または正しく読み込めなかった場合のエラー処理
  if (!filesJSContent || filesJSContent.trim() === '') {
    throw new Error("data/files.js is empty or could not be read properly.");
  }
  // ★★★ 安全装置ここまで ★★★

  const jsonString = filesJSContent
    .replace('const files = [', '[')
    .replace(/];\s*(\/\/.*)?$/s, ']');
  
  files = new Function(`return ${jsonString}`)();
  
  if (!files || !Array.isArray(files)) {
      throw new Error("Failed to parse files array from data/files.js.");
  }
  
  console.log(`Found ${files.length} files to index in data/files.js`);
} catch (err) {
  console.error("Error reading or parsing data/files.js:", err);
  process.exit(1);
}

const indexData = [];

// 2. 各HTMLファイルを読み込み、情報を抽出する
for (const f of files) {
  try {
    const filePath = path.join(__dirname, f.url);
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found, skipping: ${f.url}`);
      continue;
    }

    const text = fs.readFileSync(filePath, 'utf8');
    const paragraphs = text.split(/(<p>.*?<\/p>)/s).filter(p => p.startsWith('<p>'));

    paragraphs.forEach((pHTML, index) => {
      const plainText = pHTML.replace(/<[^>]*>/g, "");
      const timeMatch = plainText.match(/^\s*(\d{2}:\d{2}:\d{2})/);

      if (timeMatch) {
        indexData.push({
          title: f.title,
          video: f.video,
          pHTML: pHTML,
          timestamp: timeMatch[1],
          plainText: plainText
        });
      }
    });
  } catch (err) {
    console.error(`Error processing file ${f.url}:`, err);
  }
}

// 3. 索引本 (search-index.json) を書き出す
try {
  fs.writeFileSync(path.join(__dirname, 'search-index.json'), JSON.stringify(indexData, null, 2));
  console.log(`Successfully built search-index.json with ${indexData.length} entries.`);
} catch (err) {
  console.error("Error writing search-index.json:", err);
  process.exit(1);
}
