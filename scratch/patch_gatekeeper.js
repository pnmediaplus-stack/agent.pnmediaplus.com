const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/src/components/chat/ChatComposer.tsx';
let content = fs.readFileSync(file, 'utf8');

const newHandleFileChange = `const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const validTypes = ["image/png", "image/jpeg", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
      const validFiles = files.filter(f => validTypes.includes(f.type));
      if (validFiles.length > 0) {
        setSelectedFiles(prev => [...prev, ...validFiles]);
        setUploadError(null);
        if (validFiles.length < files.length) {
          setUploadError("Some files were not supported and were skipped.");
        }
      } else {
        setUploadError("File types not supported.");
      }
    }
  };`;

content = content.replace(
  `const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };`,
  newHandleFileChange
);

const oldHandleSend = `const handleSend = async () => {
    if (!value.trim() && selectedFiles.length === 0) return;

    if (selectedFiles.length > 0) {
      setIsUploading(true);
      setUploadError(null);

      try {
        let appendedMarkdown = "";
        for (const file of selectedFiles) {
          const presignRes = await fetch("/api/chat-attachments/presign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: file.name, type: file.type, size: file.size })
          });
          if (!presignRes.ok) throw new Error("Không thể lấy quyền Upload");
          const presignData = await presignRes.json();
          if (!presignData.success) throw new Error(presignData.message);
          const uploadRes = await fetch(presignData.presignedUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file
          });
          if (!uploadRes.ok) throw new Error("Lỗi tải lên file: " + file.name);
          const isImage = file.type.startsWith("image/");
          appendedMarkdown += isImage ? \`\\n\\n![\${file.name}](\${presignData.publicUrl})\` : \`\\n\\n[📎 \${file.name}](\${presignData.publicUrl})\`;
        }

        const finalValue = value + appendedMarkdown;
        setValue("");
        setSelectedFiles([]);
        setTimeout(() => {
          onSubmit(finalValue);
          setIsUploading(false);
        }, 100);
      } catch (err: any) {
        setUploadError(err.message);
        setIsUploading(false);
      }
    } else {
      onSubmit(value);
      setValue("");
    }
  };`;

const newHandleSend = `const handleSend = async () => {
    if (!value.trim() && selectedFiles.length === 0) return;

    if (selectedFiles.length > 0) {
      setIsUploading(true);
      setUploadError(null);

      let appendedMarkdown = "";
      let remainingFiles: File[] = [];
      let errors: string[] = [];

      for (const file of selectedFiles) {
        try {
          const presignRes = await fetch("/api/chat-attachments/presign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: file.name, type: file.type, size: file.size })
          });
          if (!presignRes.ok) throw new Error("Không thể lấy quyền Upload");
          const presignData = await presignRes.json();
          if (!presignData.success) throw new Error(presignData.message);
          
          const uploadRes = await fetch(presignData.presignedUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file
          });
          if (!uploadRes.ok) throw new Error("Lỗi tải lên file: " + file.name);
          
          const isImage = file.type.startsWith("image/");
          appendedMarkdown += isImage ? \`\\n\\n![\${file.name}](\${presignData.publicUrl})\` : \`\\n\\n[📎 \${file.name}](\${presignData.publicUrl})\`;
        } catch (err: any) {
          errors.push(\`\${file.name}: \${err.message}\`);
          remainingFiles.push(file);
        }
      }

      if (appendedMarkdown || value.trim()) {
        const finalValue = value + appendedMarkdown;
        setValue("");
        setTimeout(() => {
          onSubmit(finalValue);
        }, 100);
      }

      setSelectedFiles(remainingFiles);
      
      if (errors.length > 0) {
        setUploadError("Upload có lỗi một số file: " + errors.join(", "));
      } else {
        setUploadError(null);
      }
      setIsUploading(false);
    } else {
      onSubmit(value);
      setValue("");
    }
  };`;

content = content.replace(oldHandleSend, newHandleSend);
fs.writeFileSync(file, content);
console.log("PATCH_GATEKEEPER_SUCCESS");
