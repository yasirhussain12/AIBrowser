// newtab.js
// Add this to BOTH indexedDB.js and settings.js
// if (!window.dbReady) {
//   window.dbReady = new Promise(resolve => {
//     window.addEventListener('dbReady', resolve);
//   });
// }


// Search functionality
document.getElementById('search-input').addEventListener('keypress', function (e) {
  if (e.key === 'Enter') {
    const query = this.value;
    if (query.includes('.') && !query.includes(' ')) {
      window.location.href = query.startsWith('http') ? query : `https://${query}`;
    } else {
      window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    }
  }
});

// Bookmark management
document.getElementById('add-bookmark').addEventListener('click', function () {
  document.getElementById('bookmark-popup').style.display = 'block';
});

// Validation functions remain the same
function validateUrl(url) {
  url = url.replace(/^(https?:\/\/)/, '');
  const urlPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+/;
  return urlPattern.test(url);
}

function showError(message) {
  const errorDiv = document.getElementById('url-error');
  const urlInput = document.getElementById('bookmark-url');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  urlInput.classList.add('error');
}

function clearError() {
  const errorDiv = document.getElementById('url-error');
  const urlInput = document.getElementById('bookmark-url');
  errorDiv.style.display = 'none';
  urlInput.classList.remove('error');
}

// Save bookmark using IndexedDB
document.getElementById('save-bookmark').addEventListener('click', async function() {
  const name = document.getElementById('bookmark-name').value.trim();
  let url = document.getElementById('bookmark-url').value.trim();
  const isDefault = document.getElementById('bookmark-default').checked;
  const editingIndex = document.getElementById('editing-index').value;

  if (!name || !url) {
    showError('Please enter both name and URL');
    return;
  }

  const urlToValidate = url.replace(/^(https?:\/\/)/, '');
  if (!validateUrl(urlToValidate)) {
    showError('Please enter a valid URL');
    return;
  }

  const bookmarks = await getBookmarks();
  
  if (editingIndex !== '') {
    bookmarks[parseInt(editingIndex)] = { name, url: urlToValidate, isDefault };
  } else {
    bookmarks.push({ name, url: urlToValidate, isDefault });
  }

  await saveBookmarks(bookmarks);
  await displayBookmarks();
  
  document.getElementById('bookmark-popup').style.display = 'none';
  clearBookmarkForm();
});

// Helper functions
function clearBookmarkForm() {
  document.getElementById('bookmark-name').value = '';
  document.getElementById('bookmark-url').value = '';
  document.getElementById('bookmark-default').checked = false;
  document.getElementById('editing-index').value = '';
  clearError();
}

function getFaviconUrl(url) {
  try {
    const domain = new URL('https://' + url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return 'https://www.google.com/s2/favicons?domain=default&sz=32';
  }
}

// Edit and delete functions
async function editBookmark(index) {
  const bookmarks = await getBookmarks();
  const bookmark = bookmarks[index];
  
  document.getElementById('bookmark-name').value = bookmark.name;
  document.getElementById('bookmark-url').value = bookmark.url;
  document.getElementById('bookmark-default').checked = bookmark.isDefault;
  document.getElementById('editing-index').value = index;
  document.getElementById('bookmark-popup').style.display = 'block';
}

async function deleteBookmark(index) {
  if (confirm('Are you sure you want to delete this bookmark?')) {
    const bookmarks = await getBookmarks();
    bookmarks.splice(index, 1);
    await saveBookmarks(bookmarks);
    await displayBookmarks();
  }
}

// Display bookmarks
async function displayBookmarks() {
  const bookmarkList = document.getElementById('bookmark-list');
  bookmarkList.innerHTML = '';
  const bookmarks = await getBookmarks();

  bookmarks.forEach((bookmark, index) => {
    const bookmarkDiv = document.createElement('div');
    bookmarkDiv.className = 'bookmark-item';
    bookmarkDiv.innerHTML = `
      <div class="bookmark-actions">
        <button class="action-button" onclick="event.stopPropagation(); editBookmark(${index})">✏️</button>
        <button class="action-button" onclick="event.stopPropagation(); deleteBookmark(${index})">🗑️</button>
      </div>
      <img src="${getFaviconUrl(bookmark.url)}" class="bookmark-icon" alt="${bookmark.name}">
      <span class="bookmark-name">${bookmark.name}</span>
    `;
    bookmarkDiv.addEventListener('click', () => {
      openBookmark(bookmark.url, bookmarkDiv);
    });
    bookmarkList.appendChild(bookmarkDiv);
  });
}

// Initialize
window.addEventListener('dbReady', function() {
  displayBookmarks();
});

// Make functions available globally
window.editBookmark = editBookmark;
window.deleteBookmark = deleteBookmark;