import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';
env.useBrowserCache = true;
env.allowLocalModels = false;

const VERSION = 'v19';
console.log('Voice Notes AI ' + VERSION);

const $ = id => document.getElementById(id);
const KEY = 'voiceNotes';
let notes = JSON.parse(localStorage.getItem(KEY) || '[]');
let finalTranscript = '';
let embedder = null;
let lastAnswered = [];

const esc = s => String(s).replace(/</g,'&lt;').replace(/>/g,'&gt;');

function notesToMarkdown(data){
  let md = `# Voice Notes\nExported: ${new Date().toLocaleString()}\nTotal Notes: ${data.length}\n\n---\n\n`;
  data.forEach(n => { md += `## ${n.date}\n\n${n.text}\n\n`; });
  return md;
}
function saveNotes(){
  localStorage.setItem(KEY, JSON.stringify(notes));
  localStorage.setItem('voiceNotes_md', notesToMarkdown(notes));
}

// "olive oil comma cycle period" -> "olive oil, cycle."
function normalizeDictation(text){
  let t = ' ' + String(text) + ' ';
  t = t.replace(/\s+comma\s+/gi, ', ')
       .replace(/\s+period\s+/gi, '. ')
       .replace(/\s+full\s+stop\s+/gi, '. ')
       .replace(/\s+question\s+mark\s+/gi, '? ')
       .replace(/\s+exclamation\s+(mark|point)\s+/gi, '! ')
       .replace(/\s+new\s+line\s+/gi, '. ')
       .replace(/\s+newline\s+/gi, '. ');
  return t.replace(/\s+([,.!?])/g, '$1').replace(/([,.!?])(\S)/g, '$1 $2').replace(/\s+/g, ' ').trim();
}

function cleanChunk(c){
  return String(c)
    .replace(/^(i\s+want\s+to\s+buy|i\s+need\s+to\s+buy|i\s+want\s+to|i\s+need|please\s+buy|buy)\s+/i,'')
    .replace(/^and\s+/i,'')
    .trim();
}

function splitItems(itemsText){
  const hasComma = itemsText.includes(',');
  let parts;
  if(hasComma){
    parts = itemsText.split(/\s*,\s*|\s+and\s+/i);
  } else {
    parts = itemsText.split(/\s+and\s+/i);
    if(parts.length === 2 && parts[0].trim().split(/\s+/).length >= 2){
      parts = [...parts[0].trim().split(/\s+/), parts[1]];
    }
  }
  return parts.map(x=>x.trim()).filter(Boolean);
}

function parseStoreSegment(segment){
  const m = segment.match(/^(.*?)\s+from\s+(five\s+below|[a-z]+)\s*$/i);
  if(!m) {
    const c = cleanChunk(segment);
    return c.length > 2 ? [c] : [];
  }
  const store = m[2].trim();
  const itemsText = cleanChunk(m[1].trim());
  if(/^(mac|salt|bread|fish)\s/i.test(itemsText) && !itemsText.includes(',')) {
    return [`${itemsText} from ${store}`];
  }
  return splitItems(itemsText).map(item => `${item} from ${store}`);
}

function getChunks(text){
  const normalized = normalizeDictation(text);
  const sentences = (normalized.match(/[^.!?]+[.!?]*\s*/g) || [normalized]).map(s=>s.trim()).filter(Boolean);
  let result = [];
  sentences.forEach(sentence => {
    const cleanSentence = sentence.replace(/[.!?]+$/,'').trim();
    const matches = [...cleanSentence.matchAll(/\bfrom\s+(?:five\s+below|[a-z]+)/gi)];
    if(!matches.length){
      const c = cleanChunk(cleanSentence);
      if(c.length > 2) result.push(c);
      return;
    }
    let start = 0;
    matches.forEach(m => {
      const end = m.index + m[0].length;
      result.push(...parseStoreSegment(cleanSentence.slice(start, end).trim()));
      start = end;
    });
    const tail = cleanSentence.slice(start).trim();
    if(tail.length > 2) result.push(...parseStoreSegment(tail));
  });
  return result;
}

function shortItem(sentence, store){
  if(!store) return sentence;
  return sentence.replace(new RegExp('\\s+from\\s+' + store.replace(/\s+/g,'\\s+') + '\\s*$','i'),'').trim();
}

// ---------- Render ----------
function render(){
  const q = $('search').value.toLowerCase();
  const f = notes.filter(n => n.text.toLowerCase().includes(q));
  $('notesList').innerHTML = f.length ? f.map(n => {
    const chunks = getChunks(n.text);
    return `
    <div class="note">
      <small>${esc(n.date)}</small>
      <p id="text-${n.id}">${esc(n.text)}</p>
      <textarea id="edit-${n.id}" class="edit-area" rows="4" style="display:none">${esc(n.text)}</textarea>
      <p class="help" id="help-${n.id}" style="display:none">Tip: Add ". bread from Walmart" then Save.</p>
      <div class="controls">
        <button onclick="editNote(${n.id})" id="editBtn-${n.id}">✏️ Edit</button>
        <button onclick="saveEditNote(${n.id})" id="saveBtn-${n.id}" style="display:none">💾 Save Edit</button>
        <button onclick="cancelEditNote()" id="cancelBtn-${n.id}" style="display:none">Cancel</button>
        <button onclick="copyNote(${n.id})">Copy</button>
        <button onclick="deleteNote(${n.id})">Delete Note</button>
      </div>
      <div class="add-item">
        <input type="text" id="add-${n.id}" placeholder="Add new item, e.g. bread from Walmart" onkeypress="if(event.key==='Enter') addItem(${n.id})">
        <button onclick="addItem(${n.id})">+ Add Item</button>
      </div>
      <div class="chunks">
        <strong>Items in this note (${chunks.length}):</strong>
        ${chunks.map((c,i)=>`<div class="chunk"><span>${esc(c)}</span><button onclick="deleteChunk(${n.id},${i})">✓ Done / Remove</button></div>`).join('')}
      </div>
    </div>`;
  }).join('') : '<p>No notes yet.</p>';
}

window.deleteNote = id => { if(confirm('Delete whole note?')){ notes=notes.filter(n=>n.id!==id); saveNotes(); render(); } };
window.copyNote = id => { const n=notes.find(x=>x.id===id); if(n) navigator.clipboard.writeText(n.text); };
window.editNote = id => {
  $('text-'+id).style.display='none'; $('edit-'+id).style.display='block'; $('help-'+id).style.display='block';
  $('editBtn-'+id).style.display='none'; $('saveBtn-'+id).style.display='inline-block'; $('cancelBtn-'+id).style.display='inline-block';
  $('edit-'+id).focus();
};
window.cancelEditNote = () => render();
window.saveEditNote = id => {
  const newText = normalizeDictation($('edit-'+id).value.trim());
  if(!newText) return alert('Note cannot be empty.');
  const note = notes.find(n=>n.id===id); if(!note) return;
  note.text = newText; note.date = new Date().toLocaleString()+' (edited)';
  saveNotes(); render();
};
window.addItem = id => {
  const newItem = $('add-'+id).value.trim();
  if(!newItem) return alert('Type a new item first');
  const note = notes.find(n=>n.id===id); if(!note) return;
  note.text = note.text.trim().replace(/\.?\s*$/,'') + '. ' + newItem + '.';
  note.date = new Date().toLocaleString()+' (edited)';
  saveNotes(); render();
};
window.deleteChunk = (noteId, chunkIndex) => {
  const note = notes.find(n=>n.id===noteId); if(!note) return;
  const chunks = getChunks(note.text);
  if(!confirm(`Remove this item?\n\n"${chunks[chunkIndex]}"`)) return;
  chunks.splice(chunkIndex,1);
  if(chunks.length===0) notes = notes.filter(n=>n.id!==noteId);
  else { note.text = chunks.join('. ')+'.'; note.date = new Date().toLocaleString()+' (edited)'; }
  saveNotes(); render();
};
window.removeAnsweredItems = () => {
  if(!lastAnswered.length) return;
  if(!confirm(`Remove ${lastAnswered.length} answered item(s)?\n\n${lastAnswered.map(c=>c.sentence).join('\n')}`)) return;
  lastAnswered.forEach(item => {
    const note = notes.find(n=>n.id===item.noteId); if(!note) return;
    const chunks = getChunks(note.text);
    const idx = chunks.findIndex(c=>c.toLowerCase()===item.sentence.toLowerCase());
    if(idx!==-1){ chunks.splice(idx,1); note.text = chunks.length ? chunks.join('. ')+'.' : ''; note.date=new Date().toLocaleString()+' (edited)'; }
  });
  notes = notes.filter(n=>n.text.trim().length>0);
  saveNotes(); render(); lastAnswered=[];
  showAnswer("✅ Item(s) removed from your notes.");
};

// ---------- NEW v19: Delete helpers ----------
function removeChunksMatching(predicate, description){
  let removed = [];
  notes.forEach(note => {
    const chunks = getChunks(note.text);
    const keep = [];
    chunks.forEach(c => { if(predicate(c)) removed.push(c); else keep.push(c); });
    note.text = keep.length ? keep.join('. ')+'.' : '';
    if(keep.length !== chunks.length) note.date = new Date().toLocaleString()+' (edited)';
  });
  if(!removed.length){ showAnswer(`I don't have any items matching: ${description}`); return false; }
  if(!confirm(`Delete ${removed.length} item(s)?\n\n${removed.join('\n')}`)) { showAnswer('Cancelled. Nothing was deleted.'); return true; }
  notes = notes.filter(n=>n.text.trim().length>0);
  // Re-apply removal after confirm (notes were mutated above, so rebuild from removed list is not needed; we already filtered text)
  // NOTE: text was already updated in the loop above; just persist if confirmed.
  // To keep confirm honest, we re-check: if user cancelled we must reload.
  saveNotes(); render();
  showAnswer(`✅ Deleted ${removed.length} item(s):\n${removed.join('\n')}`);
  return true;
}

// Safer version: collect first, confirm, THEN mutate
function deleteChunksWhere(predicate, description){
  notes = JSON.parse(localStorage.getItem(KEY) || '[]');
  let removed = [];
  notes.forEach(note => getChunks(note.text).forEach(c => { if(predicate(c)) removed.push(c); }));
  if(!removed.length){ showAnswer(`I don't have any items matching: ${description}`); return true; }
  if(!confirm(`Delete ${removed.length} item(s)?\n\n${removed.join('\n')}`)){ showAnswer('Cancelled. Nothing was deleted.'); return true; }
  notes.forEach(note => {
    const keep = getChunks(note.text).filter(c => !predicate(c));
    note.text = keep.length ? keep.join('. ')+'.' : '';
  });
  notes = notes.filter(n=>n.text.trim().length>0);
  saveNotes(); render();
  showAnswer(`✅ Deleted ${removed.length} item(s):\n${removed.join('\n')}`);
  return true;
}

function handleDeleteCommand(q){
  const text = q.toLowerCase().trim();
  if(!/^(remove|delete|clear|erase)\b/.test(text)) return false;

  notes = JSON.parse(localStorage.getItem(KEY) || '[]');
  if(!notes.length){ showAnswer("You have no saved notes to delete."); return true; }

  // 1) delete all notes
  if(/\b(all notes|everything)\b/.test(text)){
    if(!confirm(`Delete ALL ${notes.length} note(s)? This cannot be undone.`)) { showAnswer('Cancelled. Nothing was deleted.'); return true; }
    notes = []; saveNotes(); render();
    showAnswer('✅ All notes deleted.');
    return true;
  }

  // 2) delete previous / last / latest note  (notes[0] is newest)
  if(/\b(previous|last|latest|recent)\b.*\bnote\b/.test(text) || /\bnote\b.*\b(previous|last|latest|recent)\b/.test(text)){
    const target = notes[0];
    if(!confirm(`Delete your previous (most recent) note?\n\n"${target.text}"\nSaved: ${target.date}`)) { showAnswer('Cancelled. Nothing was deleted.'); return true; }
    notes = notes.filter(n=>n.id !== target.id);
    saveNotes(); render();
    showAnswer(`✅ Deleted previous note:\n"${target.text}"`);
    return true;
  }

  // 3) remove all items from <store>
  let storeMatch = text.match(/\b(?:from|at|in)\s+([a-z]+(?:\s+below)?)\b/);
  if(storeMatch){
    const store = storeMatch[1].trim();
    return deleteChunksWhere(c => c.toLowerCase().includes(store), `items from ${store}`);
  }
  // "remove target items"
  storeMatch = text.match(/^(?:remove|delete|clear|erase)\s+(?:all\s+)?(?:items?\s+)?(?:from\s+)?([a-z]+(?:\s+below)?)\s+items?\b/);
  if(storeMatch){
    const store = storeMatch[1].trim();
    return deleteChunksWhere(c => c.toLowerCase().includes(store), `items from ${store}`);
  }

  // 4) remove <item>  e.g. "remove toothpaste", "delete toothpaste from target" (store handled above)
  const itemMatch = text.match(/^(?:remove|delete|clear|erase)\s+(?:all\s+)?(?:items?\s+)?(.+?)(?:\s+from\s+[a-z]+(?:\s+below)?)?[.!?]*$/);
  if(itemMatch){
    const keyword = itemMatch[1].replace(/\b(my|the|item|items|note|notes)\b/g,'').trim();
    if(keyword && keyword.length > 1){
      return deleteChunksWhere(c => c.toLowerCase().includes(keyword), `"${keyword}"`);
    }
  }

  showAnswer('Delete command not understood. Try: "remove all items from Target" or "delete my previous note".');
  return true;
}

// ---------- Main buttons ----------
$('clearBtn').onclick = () => { $('transcript').value=''; finalTranscript=''; };
$('saveBtn').onclick = () => {
  const t = normalizeDictation($('transcript').value.trim());
  if(!t) return alert('Nothing to save');
  $('transcript').value = t;
  notes.unshift({id:Date.now(), text:t, date:new Date().toLocaleString()});
  saveNotes(); $('transcript').value=''; finalTranscript=''; render();
};
$('search').oninput = render;
$('clearAllBtn').onclick = () => { if(confirm('Delete all notes?')){ notes=[]; saveNotes(); render(); } };
$('exportBtn').onclick = () => {
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([notesToMarkdown(notes)],{type:'text/markdown'}));
  a.download='voice-notes.md'; a.click();
};

// ---------- Speech ----------
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition, qRecognition;
if(!SR){
  $('browserWarning').textContent='⚠️ Use Chrome or Edge.';
  $('startBtn').disabled=true; $('askVoiceBtn').disabled=true; $('deleteVoiceBtn').disabled=true;
} else {
  recognition = new SR();
  recognition.lang='en-US'; recognition.continuous=true; recognition.interimResults=true;
  recognition.onresult = e => {
    let interim='';
    for(let x=e.resultIndex;x<e.results.length;x++){
      if(e.results[x].isFinal) finalTranscript += e.results[x][0].transcript+' ';
      else interim += e.results[x][0].transcript;
    }
    $('transcript').value = finalTranscript + interim;
  };
  recognition.onstart=()=>{$('status').textContent='Listening...'; $('startBtn').disabled=true; $('stopBtn').disabled=false;};
  recognition.onend=()=>{$('status').textContent='Stopped.'; $('startBtn').disabled=false; $('stopBtn').disabled=true;};
  recognition.onerror=e=>{$('status').textContent='Error: '+e.error;};

  qRecognition = new SR();
  qRecognition.lang='en-US'; qRecognition.continuous=false; qRecognition.interimResults=false;
  qRecognition.onresult = e => { $('questionInput').value=e.results[0][0].transcript; askSmartQuestion(); };
  qRecognition.onstart = () => { $('answerBox').textContent='Listening... speak your question or delete command.'; };
  qRecognition.onerror = e => { $('answerBox').textContent='Voice error: '+e.error; };
}
$('startBtn').onclick = () => { finalTranscript=$('transcript').value?$('transcript').value+' ':''; try{recognition.start()}catch(e){} };
$('stopBtn').onclick = () => { try{recognition.stop()}catch(e){} };

// ---------- Offline AI ----------
async function loadModel(){
  if(embedder) return embedder;
  $('modelStatus').textContent='Loading AI Model... (first time only, ~23MB) - v19';
  $('modelProgress').style.display='block';
  embedder = await pipeline('feature-extraction','Xenova/all-MiniLM-L6-v2',{
    quantized:true,
    progress_callback:p=>{ if(p.progress) $('modelProgress').value=p.progress; }
  });
  $('modelStatus').textContent='✅ AI Model Loaded & Ready Offline - v19';
  $('modelProgress').style.display='none';
  return embedder;
}
async function embed(texts){
  const o = await embedder(texts,{pooling:'mean',normalize:true});
  const [n,d]=o.dims; let r=[];
  for(let i=0;i<n;i++) r.push(Array.from(o.data.slice(i*d,(i+1)*d)));
  return r;
}
const cosine=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);

function showResults(relevant, candidates, noteCount, store){
  lastAnswered = relevant;
  const displayItems = relevant.map(s => shortItem(s.sentence, store));
  const sources = [...new Set(relevant.map(s=>s.date))];
  const header = `${relevant.length} answer(s) found across ${sources.length} note(s):`;
  showAnswer(
    `<strong>${esc(header)}</strong><ul>` +
    relevant.map((s,i)=>`<li>${esc(displayItems[i])}<small>${esc(s.date)} - full item: ${esc(s.sentence)}</small></li>`).join('') +
    `</ul><small>Searched ${candidates.length} item(s) from ${noteCount} note(s) - v19</small><button class="done-btn" onclick="removeAnsweredItems()">✓ Mark as Done / Remove All ${relevant.length} Above</button>`,
    displayItems.join(', '), true
  );
}

async function askSmartQuestion(){
  const q = $('questionInput').value.trim();
  if(!q) return alert('Ask a question or give a delete command');

  // DELETE COMMANDS FIRST - typed or spoken, no AI needed
  if(handleDeleteCommand(q)) return;

  notes = JSON.parse(localStorage.getItem(KEY) || '[]');
  render();
  if(!notes.length) return showAnswer("I don't have that information in your saved notes.");

  let candidates = [];
  notes.forEach(note => {
    getChunks(note.text).forEach(sentence => {
      candidates.push({ noteId: note.id, sentence, date: note.date });
    });
  });
  if(!candidates.length) return showAnswer("I don't have that information in your saved notes.");
  $('answerBox').textContent = `Searching ${candidates.length} item(s) from ${notes.length} note(s)...`;

  const qLower = q.toLowerCase();

  const storeMatch = qLower.match(/\b(?:from|at|in)\s+([a-z]+(?:\s+below)?)\b/);
  const store = storeMatch ? storeMatch[1].trim() : null;
  if(store){
    const relevant = candidates.filter(c => c.sentence.toLowerCase().includes(store));
    if(!relevant.length) return showAnswer("I don't have that information in your saved notes.");
    return showResults(relevant, candidates, notes.length, store);
  }

  if(/\b(buy|buying|need|needs|shopping|list|get|bring|purchase|items?|groceries)\b/.test(qLower)){
    return showResults([...candidates], candidates, notes.length, null);
  }

  try{ await loadModel(); }catch(e){ return showAnswer('Failed to load AI model. Check internet for first load.'); }
  const vectors = await embed([q, ...candidates.map(c=>c.sentence)]);
  candidates.forEach((c,i)=>{ c.score = cosine(vectors[0], vectors[i+1]); });
  const relevant = candidates.filter(c => c.score >= 0.20).sort((a,b)=>b.score-a.score);
  if(!relevant.length) return showAnswer("I don't have that information in your saved notes.");
  return showResults(relevant, candidates, notes.length, null);
}

function showAnswer(html, speakText=null, isHTML=false){
  $('answerBox').innerHTML = isHTML ? html : esc(html);
  const toSpeak = speakText || $('answerBox').textContent;
  if($('speakAnswer') && $('speakAnswer').checked && 'speechSynthesis' in window){
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(toSpeak); u.lang='en-US'; speechSynthesis.speak(u);
  }
}

$('askBtn').onclick = askSmartQuestion;
$('askVoiceBtn').onclick = () => { try{qRecognition.start()}catch(e){} };
$('deleteVoiceBtn').onclick = () => {
  $('answerBox').textContent = 'Listening for delete command... Say: "remove all items from Target" or "delete my previous note"';
  try{qRecognition.start()}catch(e){}
};
$('questionInput').addEventListener('keypress', e=>{ if(e.key==='Enter'){ e.preventDefault(); askSmartQuestion(); }});

if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));
let deferredPrompt;
window.addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); deferredPrompt=e; $('installBtn').style.display='inline-block'; });
$('installBtn').onclick = async () => { if(deferredPrompt){ deferredPrompt.prompt(); deferredPrompt=null; $('installBtn').style.display='none'; } };

saveNotes();
render();