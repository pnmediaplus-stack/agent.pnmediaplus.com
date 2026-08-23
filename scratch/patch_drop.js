const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/src/components/chat/ChatComposer.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const handleDrop = \(e: React\.DragEvent\) => \{\s*e\.preventDefault\(\);\s*setIsDragging\(false\);\s*const isDragHasFiles = Array\.from\(e\.dataTransfer\.items\)\.some\(item => item\.kind === 'file'\);\s*if \(\!isDragHasFiles\) return;\s*const file = e\.dataTransfer\.files\?\.\[0\];\s*if \(file\) \{\s*setSelectedFile\(file\);\s*\}\s*\};/,
  `const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };`
);

fs.writeFileSync(file, content);
console.log('PATCH_DROP_SUCCESS');
