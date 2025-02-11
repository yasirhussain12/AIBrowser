/* indexedDB.js
 * Handles all persistence using IndexedDB.
 * This file sets up the database and defines helper functions
 * to get/set settings (bookmarks and bookmark files).
 * Once the DB is ready it dispatches a 'dbReady' event so the UI can initialize.
 */

// Add to VERY TOP of localStorage.js
window.dbRegistry = window.dbRegistry || {
    status: 'pending',
    ready: new Promise(resolve => {
      window.addEventListener('dbReady', () => {
        window.dbRegistry.status = 'ready';
        resolve();
      });
    })
  };

let db; // IndexedDB instance

const dbRequest = window.indexedDB.open("SettingsDB", 1);

dbRequest.onerror = function (event) {
  console.error("Database error:", event.target.error);
};

dbRequest.onupgradeneeded = function (event) {
  db = event.target.result;
  // Create the "settings" object store if it doesn't already exist
  if (!db.objectStoreNames.contains("settings")) {
    db.createObjectStore("settings", { keyPath: "key" });
  }
};

// IN localStorage.js (your IndexedDB file)
// Modify the existing dbRequest.onsuccess handler like this:

dbRequest.onsuccess = function(event) {
    db = event.target.result; // Original line
  
    // START NEW CROSS-WINDOW CODE ==================
    // Initialize registry if not exists
    window.dbRegistry = window.dbRegistry || { 
      db: null,
      ready: new Promise(resolve => window.addEventListener('dbReady', resolve))
    };
  
    // First window sets the DB reference
    if (!window.dbRegistry.db) {
      window.dbRegistry.db = db;
    }
    // Secondary windows reuse existing connection
    else if (window.dbRegistry.db !== db) {
      db.close(); // Close new connection
      db = window.dbRegistry.db; // Use shared reference
    }
  
    // Auto-reconnect handler
    db.onclose = function() {
      console.log('DB connection closed, reinitializing...');
      window.dbRegistry.db = null;
      indexedDB.open("SettingsDB", 1); // Reconnect
    };
    // END NEW CROSS-WINDOW CODE ====================
  
    window.dispatchEvent(new Event('dbReady')); // Original line
  };

// Helper function: Read value by key from IndexedDB
function getFromDB(key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("settings", "readonly");
    const store = transaction.objectStore("settings");
    const request = store.get(key);
    request.onsuccess = function () {
      resolve(request.result ? request.result.value : null);
    };
    request.onerror = function (e) {
      reject(e.target.error);
    };
  });
}

// Helper function: Write value by key into IndexedDB
function putToDB(key, value) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("settings", "readwrite");
    const store = transaction.objectStore("settings");
    const request = store.put({ key, value });
    request.onsuccess = function () {
      resolve();
    };
    request.onerror = function (e) {
      reject(e.target.error);
    };
  });
}

// BOOKMARKS HANDLERS USING INDEXEDDB
async function getBookmarks() {
  let bookmarks = await getFromDB('bookmarks');
  return bookmarks || [];
}

async function saveBookmarks(bookmarks) {
  await putToDB('bookmarks', bookmarks);
}

// BOOKMARK FILES HANDLERS USING INDEXEDDB
async function getBookmarkFiles() {
  let files = await getFromDB('bookmarkFiles');
  return files || {};
}

async function saveBookmarkFiles(data) {
  await putToDB('bookmarkFiles', data);
}