document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = 'https://wondercraft.co.za/ODBM/php_files/aquifer.php?endpoint=';
  const languageSel = document.getElementById('language');
  const bibleSel = document.getElementById('bible');
  const bookSel = document.getElementById('book');
  const chapterInput = document.getElementById('chapter');
  const verseInput = document.getElementById('verse');
  const resourcesDiv = document.getElementById('resources');
  const viewerDiv = document.getElementById('viewer');

  // Load languages
  fetch(`${API_BASE}languages`)
    .then(res => res.json())
    .then(data => {
      console.log("LANGUAGES:", data); // 👈 Add this for debugging
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'None';
      placeholder.disabled = true;
      placeholder.selected = true;
      languageSel.appendChild(placeholder);

      data.forEach(lang => {
        const opt = document.createElement('option');
        opt.value = lang.code;
        opt.textContent = lang.englishDisplay;
        languageSel.appendChild(opt);
      });
    });

  // Load bibles when language is selected
  languageSel.addEventListener('change', () => {
    bibleSel.innerHTML = '<option>Loading...</option>';
    fetch(`${API_BASE}bibles&LanguageCode=${languageSel.value}`)
      .then(res => res.json())
      .then(data => {
        bibleSel.innerHTML = '';
        data.forEach(bible => {
          const opt = document.createElement('option');
          opt.value = bible.abbreviation;
          opt.textContent = bible.name;
          bibleSel.appendChild(opt);
        });
      });
  });

  // Load books when bible is selected
  bibleSel.addEventListener('change', () => {
    bookSel.innerHTML = '<option>Loading...</option>';
    fetch(`${API_BASE}bibles/books`)
      .then(res => res.json())
      .then(data => {
        bookSel.innerHTML = '';
        data.forEach(book => {
          const opt = document.createElement('option');
          opt.value = book.code;
          opt.textContent = book.name;
          bookSel.appendChild(opt);
        });
      });
  });

  // Search resources
  document.getElementById('searchBtn').addEventListener('click', () => {
    const lang = languageSel.value;
    const book = bookSel.value;
    const chapter = chapterInput.value;
    const verse = verseInput.value;

    resourcesDiv.innerHTML = 'Searching...';
    const url = `${API_BASE}resources/search&LanguageCode=${lang}&BookCode=${book}&StartChapter=${chapter}&EndChapter=${chapter}&StartVerse=${verse}&EndVerse=${verse}&Limit=20`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        resourcesDiv.innerHTML = '';
        if (!data.items || data.items.length === 0) {
          resourcesDiv.textContent = 'No resources found.';
          return;
        }
        data.items.forEach(item => {
          const btn = document.createElement('button');
          btn.textContent = `[${item.mediaType}] ${item.name}`;
          btn.onclick = () => loadResource(item.id);
          resourcesDiv.appendChild(btn);
        });
      });
  });

  function loadResource(id) {
    viewerDiv.innerHTML = 'Loading resource...';
  
    fetch(`${API_BASE}resources/${id}`)
      .then(res => res.json())
      .then(data => {
        const type = data.grouping?.mediaType || data.grouping?.type || 'None';
        const content = data.content;
  
        viewerDiv.innerHTML = `<h3>${data.name}</h3>`;
  
        // AUDIO HANDLING (this comes first and separate)
        if (type === 'Audio') {
          const audioSteps = [];
  
          if (Array.isArray(content?.mp3?.steps)) {
            audioSteps.push(...content.mp3.steps);
          } else if (Array.isArray(content?.webm?.steps)) {
            audioSteps.push(...content.webm.steps);
          }
  
          if (audioSteps.length > 0) {
            audioSteps.forEach(step => {
              const stepLabel = document.createElement('div');
              stepLabel.textContent = `Part ${step.stepNumber}`;
              stepLabel.style.fontWeight = 'bold';
              stepLabel.style.marginTop = '1em';
  
              const player = document.createElement('audio');
              player.controls = true;
              player.src = step.url;
  
              viewerDiv.appendChild(stepLabel);
              viewerDiv.appendChild(player);
            });
          } else {
            viewerDiv.innerHTML += `<div style="color:red;">No playable audio found.</div>`;
          }
  
          return; // ✅ stop here if audio is handled
        }
  
        // ARRAY-BASED CONTENT HANDLING (Text, Video, Images, etc.)
        if (Array.isArray(content)) {
          const firstItem = content[0];
  
          if (type === 'Text' && firstItem.tiptap) {
            const html = renderTiptap(firstItem.tiptap);
            viewerDiv.innerHTML += html;
  
          } else if (type === 'Image' && firstItem.url) {
            viewerDiv.innerHTML += `<img src="${firstItem.url}" style="max-width:100%;">`;
  
          } else if (type === 'Video') {
            const videoUrl = firstItem.webm || firstItem.mp4 || firstItem.url;
            if (videoUrl) {
              viewerDiv.innerHTML += `<video controls src="${videoUrl}" style="max-width:100%;"></video>`;
            } else {
              viewerDiv.innerHTML += `<div style="color:red;">No video available.</div>`;
            }
  
          } else if (firstItem.url && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(firstItem.url)) {
            viewerDiv.innerHTML += `<img src="${firstItem.url}" style="max-width:100%;">`;
  
          } else {
            viewerDiv.innerHTML += `<pre>${JSON.stringify(firstItem, null, 2)}</pre>`;
          }
  
        } else {
          // fallback for other content types
          viewerDiv.innerHTML += `<pre>${JSON.stringify(content, null, 2)}</pre>`;
        }
      });
  }

  function renderTiptap(node) {
    if (!node) return '';
    if (node.type === 'doc') {
      return (node.content || []).map(renderTiptap).join('');
    }
    if (node.type === 'paragraph') {
      const inner = (node.content || []).map(renderTiptap).join('');
      return `<p>${inner}</p>`;
    }
    if (node.type === 'text') return node.text;
    if (node.type === 'bold') {
      const inner = (node.content || []).map(renderTiptap).join('');
      return `<strong>${inner}</strong>`;
    }
    if (node.type === 'italic') {
      const inner = (node.content || []).map(renderTiptap).join('');
      return `<em>${inner}</em>`;
    }
    if (node.type === 'heading') {
      const level = node.attrs?.level || 1;
      const inner = (node.content || []).map(renderTiptap).join('');
      return `<h${level}>${inner}</h${level}>`;
    }
    if (node.type === 'bulletList') {
      const inner = (node.content || []).map(renderTiptap).join('');
      return `<ul>${inner}</ul>`;
    }
    if (node.type === 'listItem') {
      const inner = (node.content || []).map(renderTiptap).join('');
      return `<li>${inner}</li>`;
    }
    return '';
  }
});
