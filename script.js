document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = 'https://wondercraft.co.za/ODBM/php_files/api.php';

    const languageSel = document.getElementById('language');
    const bibleSel = document.getElementById('bible');
    const bookSel = document.getElementById('book');
    const chapterInput = document.getElementById('chapter');
    const verseInput = document.getElementById('verse');
    const resourcesDiv = document.getElementById('resources');
    const viewerDiv = document.getElementById('viewer');

    // Load languages
    fetch(`${API_BASE}?endpoint=languages`)
        .then(res => res.json())
        .then(data => {
            console.log('languages:', data);

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

    // Load bibles when language selected
    languageSel.addEventListener('change', () => {
        bibleSel.innerHTML = '<option>Loading...</option>';
        fetch(`${API_BASE}?endpoint=bibles&LanguageCode=${languageSel.value}`)
            .then(res => res.json())
            .then(data => {
                console.log('bibles:', data);
                bibleSel.innerHTML = '';
                data.forEach(bible => {
                    const opt = document.createElement('option');
                    opt.value = bible.abbreviation;
                    opt.textContent = bible.name;
                    bibleSel.appendChild(opt);
                });
            });
    });

    // Load books when bible selected
    bibleSel.addEventListener('change', () => {
        bookSel.innerHTML = '<option>Loading...</option>';
        fetch(`${API_BASE}?endpoint=bibles/books`)
            .then(res => res.json())
            .then(data => {
                console.log('books:', data);
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
        const url = `${API_BASE}?endpoint=resources/search&LanguageCode=${lang}&BookCode=${book}&StartChapter=${chapter}&EndChapter=${chapter}&StartVerse=${verse}&EndVerse=${verse}&Limit=20`;

        fetch(url)
            .then(res => res.json())
            .then(data => {
                console.log('resources:', data);
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
        fetch(`${API_BASE}?endpoint=resources/${id}`)
            .then(res => res.json())
            .then(data => {
                console.log('resource:', data);
                const type = data.grouping?.mediaType || data.grouping?.type || 'None';
                const content = data.content;
                console.log('type:', type);
                console.log('content:', content);

                viewerDiv.innerHTML = `<h3>${data.name}</h3>`;

                if (Array.isArray(content)) {
                    const firstItem = content[0];
                    console.log('first content item:', firstItem);

                    if (type === 'Text') {
                        if (firstItem.tiptap) {
                            console.log('tiptap content:', firstItem.tiptap);
                            const html = renderTiptap(firstItem.tiptap);
                            viewerDiv.innerHTML += html;
                        } else {
                            viewerDiv.innerHTML += `<div style="color:red;">No text content available.</div>`;
                        }
                    }
                    else if (type === 'Audio') {
                        const audioSteps = firstItem.mp3?.steps || firstItem.webm?.steps;
                        console.log('audio steps:', audioSteps);

                        if (Array.isArray(audioSteps) && audioSteps.length > 0) {
                            audioSteps.forEach(step => {
                                viewerDiv.innerHTML += `<div>Part ${step.stepNumber}:</div>`;
                                viewerDiv.innerHTML += `<audio controls src="${step.url}"></audio>`;
                            });
                        } else {
                            viewerDiv.innerHTML += `<div style="color:red;">No playable audio steps found.</div>`;
                        }
                    }
                    else if (type === 'Image') {
                        const imageUrl = firstItem.url;
                        if (imageUrl) {
                            viewerDiv.innerHTML += `<img src="${imageUrl}" style="max-width:100%;">`;
                        } else {
                            viewerDiv.innerHTML += `<div style="color:red;">No image available.</div>`;
                        }
                    }
                    else if (type === 'Video') {
                        const videoUrl = firstItem.webm || firstItem.mp4 || firstItem.url;
                        if (videoUrl) {
                            viewerDiv.innerHTML += `<video controls src="${videoUrl}" style="max-width:100%;"></video>`;
                        } else {
                            viewerDiv.innerHTML += `<div style="color:red;">No video available.</div>`;
                        }
                    }
                    else if (firstItem.url && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(firstItem.url)) {
                        viewerDiv.innerHTML += `<img src="${firstItem.url}" style="max-width:100%;">`;
                    }
                    else {
                        viewerDiv.innerHTML += `<pre>${JSON.stringify(firstItem, null, 2)}</pre>`;
                    }
                }
                else {
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
        if (node.type === 'text') {
            return node.text;
        }
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
