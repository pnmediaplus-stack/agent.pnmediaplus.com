const fs = require('fs');
let code = fs.readFileSync('src/components/chat/ChatComposer.tsx', 'utf8');

code = code.replace(
  `let appendedMarkdown = "";
      let remainingFiles: File[] = [];
      let errors: string[] = [];`,
  `let appendedMarkdown = "";
      let visual_assets: string[] = [];
      let remainingFiles: File[] = [];
      let errors: string[] = [];`
);

code = code.replace(
  `const isImage = file.type.startsWith("image/");
          appendedMarkdown += isImage ? \`\\n\\n![$\{file.name\}]($\{presignData.publicUrl\})\` : \`\\n\\n[📎 $\{file.name\}]($\{presignData.publicUrl\})\`;`,
  `const isImage = file.type.startsWith("image/");
          if (isImage) {
            visual_assets.push(presignData.publicUrl);
            appendedMarkdown += \`\\n\\n![$\{file.name\}]($\{presignData.publicUrl\})\`;
          } else {
            appendedMarkdown += \`\\n\\n[📎 $\{file.name\}]($\{presignData.publicUrl\})\`;
          }`
);

code = code.replace(
  `setTimeout(() => {
          onSubmit(finalValue);
        }, 100);`,
  `setTimeout(() => {
          onSubmit(finalValue, visual_assets);
        }, 100);`
);

fs.writeFileSync('src/components/chat/ChatComposer.tsx', code);
console.log('PATCH_COMPOSER_SUCCESS');
