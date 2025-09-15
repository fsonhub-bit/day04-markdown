const EDIT_KEY = 'day04_md_text';

const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const newBtn  = document.getElementById('newBtn');
const copyBtn = document.getElementById('copyBtn');
const saveBtn = document.getElementById('saveBtn');
const fileIn  = document.getElementById('fileIn');
const dropzone = document.getElementById('dropzone');

// ---- Markdown 超軽量レンダラ（必要最小限） ----
// 1) HTMLエスケープ → 2) インライン → 3) ブロック
function escapeHtml(s){
  return s.replace(/[&<>"']/g, (c)=>({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
function inlineMD(s){
  // code: `...`
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  // bold: **...**
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // italic: _..._
  s = s.replace(/_([^_]+)_/g, '<em>$1</em>');
  // link: [text](url)
  s = s.replace(/$begin:math:display$([^$end:math:display$]+)\]$begin:math:text$(https?:\\/\\/[^\\s)]+)$end:math:text$/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return s;
}
function blockMD(text){
  const lines = text.split(/\r?\n/);
  const out = [];
  let inCode = false, codeBuf = [];
  for (let i=0;i<lines.length;i++){
    const raw = lines[i];
    if (/^```/.test(raw)){ // code fence toggle
      if (inCode){
        out.push(`<pre><code>${codeBuf.join('\n')}</code></pre>`);
        codeBuf = []; inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }
    if (inCode){ codeBuf.push(escapeHtml(raw)); continue; }

    if (/^#{1,6}\s+/.test(raw)){ // headings
      const m = raw.match(/^(#{1,6})\s+(.*)$/);
      const level = m[1].length;
      out.push(`<h${level}>${inlineMD(escapeHtml(m[2]))}</h${level}>`);
      continue;
    }
    if (/^\s*[-*]\s+/.test(raw)){ // unordered list (single line)
      const item = raw.replace(/^\s*[-*]\s+/, '');
      out.push(`<ul><li>${inlineMD(escapeHtml(item))}</li></ul>`);
      continue;
    }
    if (raw.trim()===''){ out.push(''); continue; }
    // paragraph
    out.push(`<p>${inlineMD(escapeHtml(raw))}</p>`);
  }
  // マージ：連続 <ul> をひとつに
  return out.join('\n')
    .replace(/<\/ul>\s*<ul>/g, '');
}
function render(src){
  preview.innerHTML = blockMD(src);
}

// ---- 自動保存・読込 ----
function saveLocal(){
  localStorage.setItem(EDIT_KEY, editor.value);
}
function loadLocal(){
  const v = localStorage.getItem(EDIT_KEY);
  if (v!==null) editor.value = v;
}

// ---- イベント ----
editor.addEventListener('input', () => {
  render(editor.value);
  saveLocal();
});

newBtn.addEventListener('click', () => {
  if (editor.value && !confirm('内容をクリアしますか？（保存は自動で行われています）')) return;
  editor.value = '';
  render('');
  saveLocal();
});

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(editor.value);
    copyBtn.textContent = 'Copied!';
    setTimeout(()=>copyBtn.textContent='Copy', 1200);
  } catch {
    alert('コピーに失敗しました');
  }
});

saveBtn.addEventListener('click', () => {
  const blob = new Blob([editor.value], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'document.md';
  a.click();
  URL.revokeObjectURL(a.href);
});

fileIn.addEventListener('change', async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  const text = await f.text();
  editor.value = text;
  render(text);
  saveLocal();
});

// DnD import
const pane = document.getElementById('editor').parentElement;
['dragenter','dragover'].forEach(ev=>{
  pane.addEventListener(ev, (e)=>{ e.preventDefault(); dropzone.hidden=false; });
});
['dragleave','drop'].forEach(ev=>{
  pane.addEventListener(ev, (e)=>{ e.preventDefault(); dropzone.hidden=true; });
});
pane.addEventListener('drop', async (e)=>{
  const f = e.dataTransfer?.files?.[0];
  if (!f) return;
  const text = await f.text();
  editor.value = text;
  render(text);
  saveLocal();
});

// 初期化
loadLocal();
render(editor.value || '');