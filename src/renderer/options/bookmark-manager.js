// Wait for IndexedDB to be ready
if (!window.dbReady) {
    window.dbReady = new Promise(resolve => {
      window.addEventListener('dbReady', resolve);
    });
  }
  
  // GLOBAL VARIABLES (Shared with file-manager.js)
  window.selectedBookmark = null;
  
  // DOM ELEMENTS - Bookmarks
  const bookmarkListEl = document.getElementById('bookmarkList');
  const bookmarkItemsEl = document.getElementById('bookmark-items');
  const addBookmarkBtn = document.getElementById('add-bookmark-btn');
  const bookmarkPopup = document.getElementById('bookmark-popup');
  const bookmarkNameInput = document.getElementById('bookmark-name');
  const bookmarkUrlInput = document.getElementById('bookmark-url');
  const bookmarkDefaultCheckbox = document.getElementById('bookmark-default');
  const editingIndexInput = document.getElementById('editing-index');
  const urlErrorEl = document.getElementById('url-error');
  
  // Initialize bookmarks once DOM and DB are ready
  document.addEventListener("DOMContentLoaded", async () => {
    await window.dbReady;
    displayBookmarks();
  });
  
  // Helper function: Get favicon URL based on bookmark URL
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
  
  // Display bookmarks in the left section
  async function displayBookmarks() {
    const bookmarks = await getBookmarks();
    bookmarkItemsEl.innerHTML = '';
    
    bookmarks.forEach((bookmark, index) => {
      const div = document.createElement('div');
      div.className = 'bookmark-item';
      
      if (window.selectedBookmark && window.selectedBookmark.url === bookmark.url) {
        div.classList.add('active');
      }
      
      div.innerHTML = `
        <img src="${getFaviconUrl(bookmark.url)}" class="bookmark-icon" alt="${bookmark.name}">
        <span class="bookmark-name">${bookmark.name}</span>
        <div class="bookmark-actions">
          <button class="action-button edit-button" onclick="editBookmark(${index})">Edit</button>
          <button class="action-button delete-button" onclick="deleteBookmark(${index})">Delete</button>
        </div>
      `;
      
      div.addEventListener('click', async () => {
        window.selectedBookmark = bookmark;
        await displayBookmarks();
        // Notify file-manager that bookmark changed
        window.dispatchEvent(new CustomEvent('bookmarkChanged'));
      });
      
      bookmarkItemsEl.appendChild(div);
    });
  }
  
  // Bookmark popup functions
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
  
  // Event Listeners for bookmark operations
  addBookmarkBtn.addEventListener('click', () => {
    bookmarkPopup.style.display = 'block';
  });
  
  document.getElementById('cancel-bookmark').addEventListener('click', () => {
    bookmarkPopup.style.display = 'none';
    clearBookmarkPopup();
  });
  
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
  
  // Edit and Delete bookmark functions (exposed globally for HTML onclick)
  window.editBookmark = async function(index) {
    let bookmarks = await getBookmarks();
    const bookmark = bookmarks[index];
    bookmarkNameInput.value = bookmark.name;
    bookmarkUrlInput.value = bookmark.url;
    bookmarkDefaultCheckbox.checked = bookmark.isDefault;
    editingIndexInput.value = index;
    bookmarkPopup.style.display = 'block';
  }
  
  window.deleteBookmark = async function(index) {
    if (confirm('Are you sure you want to delete this bookmark?')) {
      let bookmarks = await getBookmarks();
      
      if (window.selectedBookmark && window.selectedBookmark.url === bookmarks[index].url) {
        window.selectedBookmark = null;
        window.dispatchEvent(new CustomEvent('bookmarkDeleted'));
      }
      
      bookmarks.splice(index, 1);
      await saveBookmarks(bookmarks);
      await displayBookmarks();
    }
  }