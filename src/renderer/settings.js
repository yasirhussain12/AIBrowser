// Add this to BOTH indexedDB.js and settings.js
if (!window.dbReady) {
  window.dbReady = new Promise(resolve => {
    window.addEventListener('dbReady', resolve);
  });
}

/* settings.js
 * Handles the UI logic and interactions for the bookmark manager.
 * Relies on IndexedDB persistence functions defined in indexedDB.js.
 * Make sure indexedDB.js is loaded before this file.
 */

// GLOBAL VARIABLES
let selectedBookmark = null;
let selectedFile = null;

// DOM ELEMENTS
const bookmarkListEl = document.getElementById('bookmarkList');
const bookmarkItemsEl = document.getElementById('bookmark-items');
const fileListEl = document.getElementById('fileList');
const filesContainer = document.getElementById('filesContainer');
const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');
const editorSection = document.getElementById('editorSection');
const editorFilename = document.getElementById('editorFilename');
const codeEditor = document.getElementById('codeEditor');
const saveButton = document.getElementById('saveButton');
const addBookmarkBtn = document.getElementById('add-bookmark-btn');
const bookmarkPopup = document.getElementById('bookmark-popup');
const bookmarkNameInput = document.getElementById('bookmark-name');
const bookmarkUrlInput = document.getElementById('bookmark-url');
const bookmarkDefaultCheckbox = document.getElementById('bookmark-default');
const editingIndexInput = document.getElementById('editing-index');
const urlErrorEl = document.getElementById('url-error');

// NEW DOM ELEMENTS for file creation popup (make sure these exist in your HTML)
const createFileBtn = document.getElementById('create-file-btn');
const filePopup = document.getElementById('file-popup');
const fileNameInput = document.getElementById('file-name');
const fileTypeSelect = document.getElementById('file-type');

const dragbar1 = document.getElementById('dragbar1');
const dragbar2 = document.getElementById('dragbar2');

// Initialize the UI once the DOM and DB are ready
document.addEventListener("DOMContentLoaded", async () => {
  await window.dbReady; // Wait for DB from any window
  displayBookmarks();
  renderFiles();
});

// ----------------------
// File Creation Popup Handlers
// ----------------------
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
  
  if (!selectedBookmark) {
    alert('Please select a bookmark first');
    return;
  }
  
  // Get the selected file type extension (.js or .css)
  const fileExtension = fileTypeSelect.value;
  const fileName = nameInputVal.endsWith(fileExtension) ? nameInputVal : nameInputVal + fileExtension;
  
  const allFiles = await getBookmarkFiles();
  const key = selectedBookmark.url;
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

// ----------------------
// Helper function: GET FAVICON URL BASED ON BOOKMARK URL
// ----------------------
function getFaviconUrl(url) {
  try {
    if (url.indexOf('http') !== 0) {
      url = 'https://' + url;
    }
    const domain = (new URL(url)).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch (e) {
    return 'https://www.google.com/s2/favicons?domain=default&sz=32';
  }
}

// ----------------------
// DISPLAY BOOKMARKS (Left Section)
// ----------------------
async function displayBookmarks() {
  const bookmarks = await getBookmarks();
  bookmarkItemsEl.innerHTML = '';
  bookmarks.forEach((bookmark, index) => {
    const div = document.createElement('div');
    div.className = 'bookmark-item';
    // Highlight if active
    if (selectedBookmark && selectedBookmark.url === bookmark.url) {
      div.classList.add('active');
    }
    div.innerHTML = `
      <img src="${getFaviconUrl(bookmark.url)}" class="bookmark-icon" alt="${bookmark.name}">
      <span class="bookmark-name">${bookmark.name}</span>
      <div class="bookmark-actions">
        <button class="action-button edit-button" onclick="event.stopPropagation(); editBookmark(${index})">Edit</button>
        <button class="action-button delete-button" onclick="event.stopPropagation(); deleteBookmark(${index})">Delete</button>
      </div>
    `;
    div.addEventListener('click', async () => {
      selectedBookmark = bookmark;
      await displayBookmarks(); // refresh active state
      await renderFiles();
      // Clear file editor when switching bookmarks
      selectedFile = null;
      editorFilename.textContent = "File Editor";
      codeEditor.value = "";
    });
    bookmarkItemsEl.appendChild(div);
  });
}

// ----------------------
// RENDER FILES FOR THE SELECTED BOOKMARK (Middle Section)
// ----------------------
async function renderFiles() {
  filesContainer.innerHTML = '';
  if (!selectedBookmark) {
    filesContainer.innerHTML = '<p>Select a bookmark to view its files.</p>';
    return;
  }
  const allFiles = await getBookmarkFiles();
  const key = selectedBookmark.url;
  const files = allFiles[key] || [];
  if (files.length === 0) {
    filesContainer.innerHTML = '<p>No files added for this bookmark. Use the drop area above.</p>';
  } else {
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
          <button class="icon-btn edit-name" onclick="event.stopPropagation(); editFileName(${index})">
            <i class="fas fa-edit"></i>
          </button>
          <button class="icon-btn delete-file" onclick="event.stopPropagation(); deleteFile(${index})">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;
      // Add drag and drop event listeners for reordering
      div.addEventListener('dragstart', handleDragStart);
      div.addEventListener('dragover', handleDragOver);
      div.addEventListener('drop', handleDrop);
      div.addEventListener('dragend', handleDragEnd);
      
      div.addEventListener('click', () => {
        selectedFile = { index, filename: file.filename, content: file.content };
        openFileInEditor();
        // Highlight selected file
        document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
        div.classList.add('active');
      });
      
      filesContainer.appendChild(div);
    });
  }
}

// ----------------------
// Drag and Drop for File Reordering
// ----------------------
let draggedItem = null;
function handleDragStart(e) {
  draggedItem = this;
  this.classList.add('dragging');
}
function handleDragOver(e) {
  e.preventDefault();
}
function handleDrop(e) {
  e.preventDefault();
  if (this === draggedItem) return;
  const items = [...filesContainer.querySelectorAll('.file-item')];
  const draggedIdx = items.indexOf(draggedItem);
  const droppedIdx = items.indexOf(this);
  reorderFiles(draggedIdx, droppedIdx);
}
function handleDragEnd() {
  this.classList.remove('dragging');
}
async function reorderFiles(fromIndex, toIndex) {
  const allFiles = await getBookmarkFiles();
  const key = selectedBookmark.url;
  let files = allFiles[key] || [];
  const [movedItem] = files.splice(fromIndex, 1);
  files.splice(toIndex, 0, movedItem);
  allFiles[key] = files;
  await saveBookmarkFiles(allFiles);
  await renderFiles();
}

// ----------------------
// File Name Editing and Deletion functions
// ----------------------
async function editFileName(index) {
  const allFiles = await getBookmarkFiles();
  const key = selectedBookmark.url;
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

async function deleteFile(index) {
  if (confirm('Are you sure you want to delete this file?')) {
    const allFiles = await getBookmarkFiles();
    const key = selectedBookmark.url;
    let files = allFiles[key] || [];
    files.splice(index, 1);
    allFiles[key] = files;
    await saveBookmarkFiles(allFiles);
    // If the deleted file was open in the editor, clear it
    if (selectedFile && selectedFile.index === index) {
      selectedFile = null;
      editorFilename.textContent = "File Editor";
      codeEditor.value = "";
    }
    await renderFiles();
  }
}

// ----------------------
// OPEN THE SELECTED FILE IN THE CODE EDITOR (Right Section)
// ----------------------
function openFileInEditor() {
  if (selectedFile) {
    editorFilename.textContent = selectedFile.filename;
    codeEditor.value = selectedFile.content;
  }
}

// ----------------------
// SAVE EDITED CONTENT TO INDEXEDDB
// ----------------------
saveButton.addEventListener('click', async () => {
  if (selectedBookmark && selectedFile) {
    const allFiles = await getBookmarkFiles();
    const key = selectedBookmark.url;
    let files = allFiles[key] || [];
    files[selectedFile.index].content = codeEditor.value;
    allFiles[key] = files;
    await saveBookmarkFiles(allFiles);
    alert('File saved successfully!');
    selectedFile.content = codeEditor.value;
  }
});

// ----------------------
// FILE DROP / SELECT HANDLING
// ----------------------
dropArea.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', async (event) => {
  await handleFiles(event.target.files);
  fileInput.value = '';
});

async function handleFiles(files) {
  if (!selectedBookmark) {
    alert('Please select a bookmark first.');
    return;
  }
  const allFiles = await getBookmarkFiles();
  const key = selectedBookmark.url;
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

// ----------------------
// DRAGGABLE RESIZERS FOR THE THREE SECTIONS
// ----------------------
// Dragbar1 – between bookmarkList (left) and fileList (middle)
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
document.addEventListener('mouseup', () => {
  isDragging1 = false;
});

// Dragbar2 – between fileList (middle) and editorSection (right)
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
  isDragging2 = false;
});

// ----------------------
// BOOKMARK POPUP FUNCTIONS
// ----------------------
addBookmarkBtn.addEventListener('click', () => {
  bookmarkPopup.style.display = 'block';
});
document.getElementById('cancel-bookmark').addEventListener('click', () => {
  bookmarkPopup.style.display = 'none';
  clearBookmarkPopup();
});

function clearBookmarkPopup() {
  bookmarkNameInput.value = '';
  bookmarkUrlInput.value = '';
  bookmarkDefaultCheckbox.checked = false;
  editingIndexInput.value = '';
  clearError();
}

function validateUrl(url) {
  url = url.replace(/^(https?:\/\/)/, '');
  const urlPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+/;
  return urlPattern.test(url);
}

function showError(message) {
  urlErrorEl.textContent = message;
  urlErrorEl.style.display = 'block';
  bookmarkUrlInput.classList.add('error');
}

function clearError() {
  urlErrorEl.style.display = 'none';
  bookmarkUrlInput.classList.remove('error');
}

bookmarkUrlInput.addEventListener('input', clearError);

document.getElementById('save-bookmark').addEventListener('click', async () => {
  const name = bookmarkNameInput.value.trim();
  let url = bookmarkUrlInput.value.trim();
  const isDefault = bookmarkDefaultCheckbox.checked;
  const editingIndex = editingIndexInput.value;
  
  if (!name) {
    showError('Please enter a bookmark name');
    return;
  }
  if (!url) {
    showError('Please enter a URL');
    return;
  }
  const urlToValidate = url.replace(/^(https?:\/\/)/, '');
  if (!validateUrl(urlToValidate)) {
    showError('Please enter a valid URL');
    return;
  }
  let bookmarks = await getBookmarks();
  if (editingIndex !== '') {
    bookmarks[parseInt(editingIndex, 10)] = { name, url: urlToValidate, isDefault };
  } else {
    bookmarks.push({ name, url: urlToValidate, isDefault });
  }
  await saveBookmarks(bookmarks);
  await displayBookmarks();
  bookmarkPopup.style.display = 'none';
  clearBookmarkPopup();
});

async function editBookmark(index) {
  let bookmarks = await getBookmarks();
  const bookmark = bookmarks[index];
  bookmarkNameInput.value = bookmark.name;
  bookmarkUrlInput.value = bookmark.url;
  bookmarkDefaultCheckbox.checked = bookmark.isDefault;
  editingIndexInput.value = index;
  bookmarkPopup.style.display = 'block';
}

async function deleteBookmark(index) {
  if (confirm('Are you sure you want to delete this bookmark?')) {
    let bookmarks = await getBookmarks();
    // If deleting the currently selected bookmark, clear the selection.
    if (selectedBookmark && selectedBookmark.url === bookmarks[index].url) {
      selectedBookmark = null;
      filesContainer.innerHTML = '';
      editorFilename.textContent = "File Editor";
      codeEditor.value = "";
    }
    bookmarks.splice(index, 1);
    await saveBookmarks(bookmarks);
    await displayBookmarks();
  }
}

// Expose functions to the global scope (for inline onclick handlers)
window.editBookmark = editBookmark;
window.deleteBookmark = deleteBookmark;
window.editFileName = editFileName;
window.deleteFile = deleteFile;