// GLOBAL VARIABLES
let selectedFile = null;
let draggedItem = null;
let placeholder = null;
let isFileBeingDragged = false;
 
// DOM ELEMENTS
const fileListEl = document.getElementById('fileList');
const filesContainer = document.getElementById('filesContainer');
const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');
const editorSection = document.getElementById('editorSection');
const editorFilename = document.getElementById('editorFilename');
const codeEditor = document.getElementById('codeEditor');
const saveButton = document.getElementById('saveButton');
const createFileBtn = document.getElementById('create-file-btn');
const filePopup = document.getElementById('file-popup');
const fileNameInput = document.getElementById('file-name');
const fileTypeSelect = document.getElementById('file-type');
const dragbar1 = document.getElementById('dragbar1');
const dragbar2 = document.getElementById('dragbar2');
// Add at the start of the file with other variables
let dropLine = null;

// Add required styles dynamically
const style = document.createElement('style');
style.textContent = `
  .file-item {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    position: relative;
    z-index: 1;
    background: white;
  }

  .file-item.dragging {
    opacity: 0.9;
    transform: scale(1.02);
    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    z-index: 1000;
  }

  .drag-placeholder {
    height: 40px;
    background: rgba(0,0,0,0.05);
    border: 2px dashed #ccc;
    border-radius: 4px;
    margin: 4px 0;
    transition: all 0.2s ease;
  }

  .file-item.shift-up {
    transform: translateY(-42px);
  }

  .file-item.shift-down {
    transform: translateY(42px);
  }
`;
document.head.appendChild(style);

// Initialize file manager
document.addEventListener("DOMContentLoaded", async () => {
  await window.dbReady;
  renderFiles();
});

// Event Listeners for bookmark changes
window.addEventListener('bookmarkChanged', async () => {
  selectedFile = null;
  editorFilename.textContent = "File Editor";
  codeEditor.value = "";
  await renderFiles();
});

window.addEventListener('bookmarkDeleted', () => {
  filesContainer.innerHTML = '';
  editorFilename.textContent = "File Editor";
  codeEditor.value = "";
});

// File Creation Handlers
createFileBtn.addEventListener('click', () => {
  filePopup.style.display = 'block';
});

document.getElementById('cancel-file').addEventListener('click', () => {
  filePopup.style.display = 'none';
  fileNameInput.value = '';
});

document.getElementById('save-file').addEventListener('click', async () => {
  const nameInputVal = fileNameInput.value.trim();
  if (!nameInputVal) {
    document.getElementById('filename-error').textContent = 'Please enter a filename';
    return;
  }
  
  if (!window.selectedBookmark) {
    alert('Please select a bookmark first');
    return;
  }
  
  const fileExtension = fileTypeSelect.value;
  const fileName = nameInputVal.endsWith(fileExtension) ? nameInputVal : nameInputVal + fileExtension;
  
  const allFiles = await getBookmarkFiles();
  const key = window.selectedBookmark.url;
  let filesArr = allFiles[key] || [];
  
  filesArr.push({
    filename: fileName,
    content: fileExtension === '.js' ? '// Add your JavaScript code here\n' : '/* Add your CSS code here */\n'
  });
  
  allFiles[key] = filesArr;
  await saveBookmarkFiles(allFiles);
  filePopup.style.display = 'none';
  fileNameInput.value = '';
  await renderFiles();
});

// Render Files
async function renderFiles() {
  filesContainer.innerHTML = '';
  if (!window.selectedBookmark) {
    filesContainer.innerHTML = '<p>Select a bookmark to view its files.</p>';
    return;
  }
  
  const allFiles = await getBookmarkFiles();
  const key = window.selectedBookmark.url;
  const files = allFiles[key] || [];
  
  if (files.length === 0) {
    filesContainer.innerHTML = '<p>No files added for this bookmark. Use the drop area above.</p>';
    return;
  }
  
  const fragment = document.createDocumentFragment();
  
  files.forEach((file, index) => {
    const div = document.createElement('div');
    div.className = 'file-item';
    div.draggable = true;
    
    if (selectedFile && selectedFile.filename === file.filename && selectedFile.index === index) {
      div.classList.add('active');
    }
    
    div.innerHTML = `
      <span class="file-name">${file.filename}</span>
      <div class="file-controls">
        <button class="icon-btn edit-name" onclick="editFileName(${index})">
          <i class="fas fa-edit"></i>
        </button>
        <button class="icon-btn delete-file" onclick="deleteFile(${index})">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
    
    div.addEventListener('dragstart', handleDragStart);
    div.addEventListener('dragenter', handleDragEnter);
    div.addEventListener('dragover', handleDragOver);
    div.addEventListener('dragleave', handleDragLeave);
    div.addEventListener('drop', handleDrop);
    div.addEventListener('dragend', handleDragEnd);
    
    div.addEventListener('click', () => {
      selectedFile = { index, filename: file.filename, content: file.content };
      openFileInEditor();
      document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
      div.classList.add('active');
    });
    
    fragment.appendChild(div);
  });
  
  filesContainer.appendChild(fragment);
}

// Enhanced Drag and Drop
// Add this function to create the drop line
function createDropLine() {
    dropLine = document.createElement('div');
    dropLine.className = 'drop-line';
    filesContainer.appendChild(dropLine);
  }
// Modified handleDragStart
function handleDragStart(e) {
    draggedItem = this;
    isFileBeingDragged = true;
    
    // Create ghost image for drag
    const ghost = this.cloneNode(true);
    ghost.style.opacity = '0.5';
    ghost.style.position = 'absolute';
    ghost.style.top = '-1000px';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
    
    this.classList.add('dragging');
    
    // Create drop line if it doesn't exist
    if (!dropLine) {
      createDropLine();
    }
    
    e.dataTransfer.effectAllowed = 'move';
  }


function handleDragEnter(e) {
  e.preventDefault();
  if (!isFileBeingDragged || this === draggedItem || this === placeholder) return;
  
  const rect = this.getBoundingClientRect();
  const middle = rect.top + rect.height / 2;
  
  if (e.clientY < middle) {
    this.parentNode.insertBefore(placeholder, this);
  } else {
    this.parentNode.insertBefore(placeholder, this.nextSibling);
  }
}

function handleDragOver(e) {
    e.preventDefault();
    if (!isFileBeingDragged || this === draggedItem) return;
    
    // Remove drop-target class from all items
    document.querySelectorAll('.file-item').forEach(item => {
        item.classList.remove('drop-target');
    });
    
    // Add drop-target class to current item
    this.classList.add('drop-target');
    
    const rect = this.getBoundingClientRect();
    const middle = rect.top + rect.height / 2;
    const dropPosition = e.clientY < middle ? rect.top : rect.bottom;
    
    // Position the drop line
    dropLine.style.top = `${dropPosition - 1.5}px`; // Adjusted for thicker line
    dropLine.classList.add('show');
}

  function handleDragLeave(e) {
    e.preventDefault();
    // Only hide the line if we're not dragging over another file item
    if (!e.relatedTarget?.closest('.file-item')) {
      dropLine.classList.remove('show');
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    if (!isFileBeingDragged) return;
    
    const rect = this.getBoundingClientRect();
    const middle = rect.top + rect.height / 2;
    const items = [...filesContainer.querySelectorAll('.file-item')];
    const draggedIdx = items.indexOf(draggedItem);
    let dropIdx = items.indexOf(this);
    
    if (e.clientY > middle) {
      dropIdx++;
    }
    
    if (draggedIdx !== dropIdx && dropIdx !== draggedIdx + 1) {
      reorderFiles(draggedIdx, dropIdx > draggedIdx ? dropIdx - 1 : dropIdx);
    }
    
    cleanup();
  }

function handleDragEnd() {
  cleanup();
}

function cleanup() {
    isFileBeingDragged = false;
    if (draggedItem) {
        draggedItem.classList.remove('dragging');
        draggedItem = null;
    }
    if (dropLine) {
        dropLine.classList.remove('show');
    }
    // Remove drop-target class from all items
    document.querySelectorAll('.file-item').forEach(item => {
        item.classList.remove('drop-target');
    });
}

// Reorder files with animation
async function reorderFiles(fromIndex, toIndex) {
  const allFiles = await getBookmarkFiles();
  const key = window.selectedBookmark.url;
  let files = allFiles[key] || [];
  const [movedItem] = files.splice(fromIndex, 1);
  files.splice(toIndex, 0, movedItem);
  allFiles[key] = files;
  await saveBookmarkFiles(allFiles);
  await renderFiles();
}

// File Editor Functions
function openFileInEditor() {
  if (selectedFile) {
    editorFilename.textContent = selectedFile.filename;
    codeEditor.value = selectedFile.content;
  }
}

saveButton.addEventListener('click', async () => {
  if (window.selectedBookmark && selectedFile) {
    const allFiles = await getBookmarkFiles();
    const key = window.selectedBookmark.url;
    let files = allFiles[key] || [];
    files[selectedFile.index].content = codeEditor.value;
    allFiles[key] = files;
    await saveBookmarkFiles(allFiles);
    alert('File saved successfully!');
    selectedFile.content = codeEditor.value;
  }
});

// File Drop Area Handlers
dropArea.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async (event) => {
  await handleFiles(event.target.files);
  fileInput.value = '';
});

async function handleFiles(files) {
  if (!window.selectedBookmark) {
    alert('Please select a bookmark first.');
    return;
  }
  
  const allFiles = await getBookmarkFiles();
  const key = window.selectedBookmark.url;
  let filesArray = allFiles[key] || [];
  
  Array.from(files).forEach(file => {
    const fileName = file.name;
    if (!fileName.endsWith('.css') && !fileName.endsWith('.js')) {
      alert('Only CSS and JS files are allowed: ' + fileName);
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async function(e) {
      filesArray.push({ filename: fileName, content: e.target.result });
      allFiles[key] = filesArray;
      await saveBookmarkFiles(allFiles);
      renderFiles();
    };
    reader.readAsText(file);
  });
}

// File Name Editing and Deletion
window.editFileName = async function(index) {
  const allFiles = await getBookmarkFiles();
  const key = window.selectedBookmark.url;
  const files = allFiles[key];
  const file = files[index];
  const newName = prompt('Enter new filename:', file.filename);
  
  if (newName && newName !== file.filename) {
    const extension = file.filename.substring(file.filename.lastIndexOf('.'));
    files[index].filename = newName.endsWith(extension) ? newName : newName + extension;
    allFiles[key] = files;
    await saveBookmarkFiles(allFiles);
    await renderFiles();
  }
}

window.deleteFile = async function(index) {
  if (confirm('Are you sure you want to delete this file?')) {
    const allFiles = await getBookmarkFiles();
    const key = window.selectedBookmark.url;
    let files = allFiles[key] || [];
    files.splice(index, 1);
    allFiles[key] = files;
    await saveBookmarkFiles(allFiles);
    
    if (selectedFile && selectedFile.index === index) {
      selectedFile = null;
      editorFilename.textContent = "File Editor";
      codeEditor.value = "";
    }
    await renderFiles();
  }
}

// Drag Area Event Listeners
dropArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropArea.style.background = '#eee';
});

dropArea.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dropArea.style.background = '';
});

dropArea.addEventListener('drop', async (e) => {
  e.preventDefault();
  dropArea.style.background = '';
  if (e.dataTransfer && e.dataTransfer.files) {
    await handleFiles(e.dataTransfer.files);
  }
});

// Draggable Resizers
let isDragging1 = false, startX, startLeftWidth, startMiddleWidth;
dragbar1.addEventListener('mousedown', (e) => {
  isDragging1 = true;
  startX = e.clientX;
  startLeftWidth = bookmarkListEl.offsetWidth;
  startMiddleWidth = fileListEl.offsetWidth;
  e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (!isDragging1) return;
  const dx = e.clientX - startX;
  let newLeftWidth = startLeftWidth + dx;
  let newMiddleWidth = startMiddleWidth - dx;
  if (newLeftWidth < 100) { newLeftWidth = 100; newMiddleWidth = startLeftWidth + startMiddleWidth - 100; }
  if (newMiddleWidth < 100) { newMiddleWidth = 100; newLeftWidth = startLeftWidth + startMiddleWidth - 100; }
  bookmarkListEl.style.width = newLeftWidth + 'px';
  fileListEl.style.width = newMiddleWidth + 'px';
});

let isDragging2 = false, startX2, startMiddleWidth2, startEditorWidth2;
dragbar2.addEventListener('mousedown', (e) => {
  isDragging2 = true;
  startX2 = e.clientX;
  startMiddleWidth2 = fileListEl.offsetWidth;
  startEditorWidth2 = editorSection.offsetWidth;
  e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (!isDragging2) return;
  const dx = e.clientX - startX2;
  let newMiddleWidth = startMiddleWidth2 + dx;
  let newEditorWidth = startEditorWidth2 - dx;
  if (newMiddleWidth < 100) { newMiddleWidth = 100; newEditorWidth = startMiddleWidth2 + startEditorWidth2 - 100; }
  if (newEditorWidth < 100) { newEditorWidth = 100; newMiddleWidth = startMiddleWidth2 + startEditorWidth2 - 100; }
  fileListEl.style.width = newMiddleWidth + 'px';
  editorSection.style.width = newEditorWidth + 'px';
});

document.addEventListener('mouseup', () => {
  isDragging1 = false;
  isDragging2 = false;
});