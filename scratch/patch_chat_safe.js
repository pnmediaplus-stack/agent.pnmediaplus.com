const fs = require('fs');
const file = 'd:/Projects/agent.pnmediaplus.com/src/components/chat/ChatComposer.tsx';
let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

// 1. Replace State
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const [selectedFile, setSelectedFile] = useState<File | null>(null);')) {
    lines[i] = '  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);';
  }
  if (lines[i].includes('const [previewUrl, setPreviewUrl] = useState<string | null>(null);')) {
    lines[i] = '  const [previewUrls, setPreviewUrls] = useState<string[]>([]);';
  }
}

// 2. Replace useEffect
const ueStart = lines.findIndex((l, i) => l.includes('useEffect(() => {') && lines[i+1] && lines[i+1].includes('if (!selectedFile) {'));
if (ueStart !== -1) {
  lines.splice(ueStart, 14, 
    '  useEffect(() => {',
    '    const urls = selectedFiles.map(file => {',
    '      if (file.type.startsWith("image/")) {',
    '        return URL.createObjectURL(file);',
    '      }',
    '      return null;',
    '    });',
    '    setPreviewUrls(urls as string[]);',
    '    return () => urls.forEach(url => { if(url) URL.revokeObjectURL(url) });',
    '  }, [selectedFiles]);'
  );
}

// 3. Replace handleFileChange
const hcStart = lines.findIndex(l => l.includes('const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {'));
if (hcStart !== -1) {
  lines.splice(hcStart, 6,
    '  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {',
    '    const files = Array.from(e.target.files || []);',
    '    if (files.length > 0) {',
    '      setSelectedFiles(prev => [...prev, ...files]);',
    '    }',
    '  };'
  );
}

// 4. Replace handleDrop
const hdStart = lines.findIndex(l => l.includes('const handleDrop = (e: React.DragEvent) => {'));
if (hdStart !== -1) {
  lines.splice(hdStart, 9,
    '  const handleDrop = (e: React.DragEvent) => {',
    '    e.preventDefault();',
    '    setIsDragging(false);',
    '    const files = Array.from(e.dataTransfer.files || []);',
    '    if (files.length > 0) {',
    '      setSelectedFiles(prev => [...prev, ...files]);',
    '    }',
    '  };'
  );
}

// 5. Replace handlePaste
const hpStart = lines.findIndex(l => l.includes('const handlePaste = (e: React.ClipboardEvent) => {'));
if (hpStart !== -1) {
  lines.splice(hpStart, 15,
    '  const handlePaste = (e: React.ClipboardEvent) => {',
    '    const items = e.clipboardData?.items;',
    '    if (items) {',
    '      const files: File[] = [];',
    '      for (let i = 0; i < items.length; i++) {',
    '        if (items[i].type.indexOf("image") !== -1) {',
    '          const file = items[i].getAsFile();',
    '          if (file) files.push(file);',
    '        }',
    '      }',
    '      if (files.length > 0) {',
    '        setSelectedFiles(prev => [...prev, ...files]);',
    '        e.preventDefault();',
    '      }',
    '    }',
    '  };'
  );
}

// 6. Replace handleSend
const hsStart = lines.findIndex(l => l.includes('const handleSend = async () => {'));
if (hsStart !== -1) {
  let hsEnd = hsStart;
  let braces = 0;
  for (let i = hsStart; i < lines.length; i++) {
    if (lines[i].includes('{')) braces += (lines[i].match(/\{/g) || []).length;
    if (lines[i].includes('}')) braces -= (lines[i].match(/\}/g) || []).length;
    if (braces === 0) {
      hsEnd = i;
      break;
    }
  }
  lines.splice(hsStart, hsEnd - hsStart + 1,
    '  const handleSend = async () => {',
    '    if (!value.trim() && selectedFiles.length === 0) return;',
    '',
    '    if (selectedFiles.length > 0) {',
    '      setIsUploading(true);',
    '      setUploadError(null);',
    '',
    '      try {',
    '        let appendedMarkdown = "";',
    '        for (const file of selectedFiles) {',
    '          const presignRes = await fetch("/api/chat-attachments/presign", {',
    '            method: "POST",',
    '            headers: { "Content-Type": "application/json" },',
    '            body: JSON.stringify({ name: file.name, type: file.type, size: file.size })',
    '          });',
    '          if (!presignRes.ok) throw new Error("Không thể lấy quyền Upload");',
    '          const presignData = await presignRes.json();',
    '          if (!presignData.success) throw new Error(presignData.message);',
    '          const uploadRes = await fetch(presignData.presignedUrl, {',
    '            method: "PUT",',
    '            headers: { "Content-Type": file.type },',
    '            body: file',
    '          });',
    '          if (!uploadRes.ok) throw new Error("Lỗi tải lên file: " + file.name);',
    '          const isImage = file.type.startsWith("image/");',
    '          appendedMarkdown += isImage ? `\\n\\n![${file.name}](${presignData.publicUrl})` : `\\n\\n[📎 ${file.name}](${presignData.publicUrl})`;',
    '        }',
    '',
    '        const finalValue = value + appendedMarkdown;',
    '        setValue("");',
    '        setSelectedFiles([]);',
    '        setTimeout(() => {',
    '          onSubmit(finalValue);',
    '          setIsUploading(false);',
    '        }, 100);',
    '      } catch (err: any) {',
    '        setUploadError(err.message);',
    '        setIsUploading(false);',
    '      }',
    '    } else {',
    '      onSubmit(value);',
    '      setValue("");',
    '    }',
    '  };'
  );
}

// 7. Replace UI Selected File
const uiStart = lines.findIndex(l => l.includes('{selectedFile && ('));
if (uiStart !== -1) {
  let uiEnd = uiStart;
  let braces = 0;
  for (let i = uiStart; i < lines.length; i++) {
    if (lines[i].includes('(')) braces += (lines[i].match(/\(/g) || []).length;
    if (lines[i].includes(')')) braces -= (lines[i].match(/\)/g) || []).length;
    if (braces === 0) {
      uiEnd = i;
      break;
    }
  }
  lines.splice(uiStart, uiEnd - uiStart + 1,
    '      {selectedFiles.length > 0 && (',
    '        <div className="mb-3 flex flex-wrap gap-3">',
    '          {selectedFiles.map((file, idx) => (',
    '            <div key={idx} className="relative rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-2 w-max max-w-full">',
    '              <button',
    '                type="button"',
    '                onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}',
    '                className="absolute -right-2 -top-2 rounded-full border border-cyan-800 bg-slate-900 p-1 text-slate-400 hover:bg-slate-800 hover:text-white z-10 shadow-lg"',
    '                disabled={isUploading}',
    '              >',
    '                <X className="h-3.5 w-3.5" />',
    '              </button>',
    '              {previewUrls[idx] ? (',
    '                <div className="flex flex-col gap-2">',
    '                  <img src={previewUrls[idx]} alt="Preview" className="max-h-32 rounded-md object-contain border border-cyan-900/50 bg-black/20" />',
    '                  <div className="flex items-center gap-1.5 text-xs text-cyan-300/80 px-1">',
    '                    <Paperclip className="h-3 w-3" />',
    '                    <span className="truncate max-w-[150px]">{file.name}</span>',
    '                  </div>',
    '                </div>',
    '              ) : (',
    '                <div className="flex items-center gap-2 px-2 py-1 text-sm text-cyan-200 min-w-[150px]">',
    '                  <Paperclip className="h-4 w-4 text-cyan-400" />',
    '                  <span className="flex-1 truncate">{file.name}</span>',
    '                </div>',
    '              )}',
    '              {isUploading && (',
    '                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-slate-900/70 backdrop-blur-sm">',
    '                  <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />',
    '                </div>',
    '              )}',
    '            </div>',
    '          ))}',
    '        </div>',
    '      )}'
  );
}

// 8. Bottom disabled condition
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('disabled={isUploading || (!value.trim() && !selectedFile)}')) {
    lines[i] = lines[i].replace('!selectedFile', 'selectedFiles.length === 0');
  }
  if (lines[i].includes('accept="image/png, image/jpeg, application/pdf, .docx, text/plain"')) {
    lines[i] = lines[i].replace('accept="image/png, image/jpeg, application/pdf, .docx, text/plain"', 'accept="image/png, image/jpeg, application/pdf, .docx, text/plain" multiple');
  }
}

fs.writeFileSync(file, lines.join('\n'));
console.log('REFACTOR_SUCCESS');
