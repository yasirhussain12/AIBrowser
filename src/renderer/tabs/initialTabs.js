//initialTabs.js
const { Menu, MenuItem } = require("electron");

(function () {
  let tabs = [];
  let activeTabId = null;
  const DEFAULT_URL = "newtab.html";

  // Enhanced logging
  const log = {
    info: (msg, ...args) => console.log(`📌 [TabManager] ${msg}`, ...args),
    error: (msg, ...args) => console.error(`❌ [TabManager] ${msg}`, ...args),
    debug: (msg, ...args) => console.log(`🔍 [TabManager] ${msg}`, ...args),
  };

  // URL normalization helper
  const normalizeUrl = (url) => {
    return url
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "")
      .replace(/^www\./, "")
      .split("/")[0];
  };

  function setupTabManagement() {
    window.dbRegistry.ready
      .then(() => {
        const newTabBtn = document.getElementById("newTabBtn");
        if (!newTabBtn) {
          log.error("Tab controls not found");
          return;
        }

        newTabBtn.addEventListener("click", () => {
          createTab();
        });

        checkAndRedirectDefaultBookmark().then((shouldCreateTab) => {
          if (!shouldCreateTab) {
            createTab();
          }
        });
      })
      .catch((err) => log.error("Failed to initialize:", err));
  }



  window.addEventListener('message', function(event) {
    if (event.data.type === 'INJECT_CODE_TO_TAB') {
        log.debug("Message received in initialTabs.js:", event.data);
        const cssCode = event.data.css;
        const jsCode = event.data.js;

        const activeWebviewContainer = document.querySelector('.webview-container.active');
        if (activeWebviewContainer) {
            const activeWebview = activeWebviewContainer.querySelector('webview');
            console.log("Active webview container:", activeWebviewContainer);
            console.log("Active webview:", activeWebview);
            if (activeWebview) {
                setTimeout(() => { // <----- ADD setTimeout HERE
                    if (cssCode) {
                        injectCSS(activeWebview, cssCode);
                    }
                    if (jsCode) {
                        injectJS(activeWebview, jsCode);
                    }
                }, 100); // 100ms delay
            } else {
                log.error("No webview found in active container.");
            }
        } else {
            log.error("No active webview container found.");
        }
    }
}, false);


  async function checkAndRedirectDefaultBookmark() {
    try {
      const bookmarks = await getBookmarks();
      const defaultBookmarks = bookmarks.filter(
        (bookmark) => bookmark.isDefault
      );

      if (
        defaultBookmarks.length > 0 &&
        !window.location.href.includes("?noredirect")
      ) {
        defaultBookmarks.forEach((bookmark) => {
          let url = bookmark.url;
          url = url.startsWith("http") ? url : "https://" + url;
          createTab(url);
        });
        return true;
      }
      return false;
    } catch (err) {
      log.error("Error checking default bookmarks:", err);
      return false;
    }
  }

  async function retrieveBookmarkFiles(url) {
    try {
      const bookmarks = await getBookmarks();
      const normalizedUrl = normalizeUrl(url);

      const matchedBookmark = bookmarks.find(
        (b) => normalizeUrl(b.url) === normalizedUrl
      );

      if (matchedBookmark) {
        const allFiles = await getBookmarkFiles();
        const files = allFiles[matchedBookmark.url] || [];
        return { success: true, files, bookmark: matchedBookmark };
      }

      return { success: false, files: [], bookmark: null };
    } catch (error) {
      log.error("Retrieval error:", error);
      return { success: false, files: [], error: error.message };
    }
  }

  function setupWebviewOptimizations(webview) {
    if (!webview) {
      log.error("Invalid webview object");
      return;
    }

    let isOptimizing = false;
    let isOptimized = false;

    const handleOptimizations = async (webview) => {
      if (isOptimizing || isOptimized) {
        return;
      }

      isOptimizing = true;
      try {
        const currentUrl = webview.getURL();
        const normalizedUrl = normalizeUrl(currentUrl);

        const fileRetrievalResult = await retrieveBookmarkFiles(normalizedUrl);

        if (
          fileRetrievalResult.success &&
          fileRetrievalResult.files.length > 0
        ) {
          const injectionResult = window.injectBookmarkFiles(
            webview,
            fileRetrievalResult.files
          );
          isOptimized = injectionResult;
        }
      } catch (error) {
        log.error("Error in optimization handler:", error);
      } finally {
        isOptimizing = false;
      }
    };

    webview.addEventListener("did-finish-load", () => {
      setTimeout(() => handleOptimizations(webview), 100);
    });

    webview.addEventListener("did-start-loading", () => {});
  }

  function createTab(url = DEFAULT_URL) {
    const tabId = "tab-" + Date.now();

    // Create tab button
    const tabButton = document.createElement("div");
    tabButton.className = "tab";
    tabButton.setAttribute("data-tab-id", tabId);
    tabButton.innerHTML = `
            <span class="tab-title">New Tab</span>
            <span class="tab-close">×</span>
        `;

    // Add to DOM
    const newTabBtn = document.getElementById("newTabBtn");
    if (!newTabBtn) {
      log.error("New tab button not found");
      return;
    }
    newTabBtn.parentNode.insertBefore(tabButton, newTabBtn);

    // Create webview container
    const webviewContainer = document.createElement("div");
    webviewContainer.className = "webview-container";
    webviewContainer.id = tabId;

    // Create webview with DevTools support
    const webview = document.createElement("webview");
    webview.setAttribute("webpreferences", "webSecurity=yes, devTools=true");
    webview.setAttribute("allowpopups", "true");
    webview.src = url.startsWith("http") ? url : `file://${__dirname}/${url}`;
    webviewContainer.appendChild(webview);

    // Add container to DOM
    const tabContent = document.querySelector(".tab-content");
    if (!tabContent) {
      log.error("Tab content container not found");
      return;
    }
    tabContent.appendChild(webviewContainer);

    // Update tabs array
    tabs.push({ id: tabId, url, title: "New Tab" });

    // Event Listeners
    webview.addEventListener("page-title-updated", (e) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (tab) {
        tab.title = e.title;
        tabButton.querySelector(".tab-title").textContent = e.title;
      }
    });

    // In createTab function, after creating webview:
    webview.addEventListener("dom-ready", () => {
      setupWebviewOptimizations(webview);
      window.initElementTracker(webview, tabId);
    });

    // Tab button click handlers
    tabButton.addEventListener("click", (e) => {
      if (!e.target.classList.contains("tab-close")) {
        setActiveTab(tabId);
      }
    });

    tabButton.querySelector(".tab-close").addEventListener("click", () => {
      closeTab(tabId);
    });

    // Set as active tab
    setActiveTab(tabId);

    return { webview, tabId }; // Return for potential use by caller
  }

  function setActiveTab(tabId) {
    document
      .querySelectorAll(".tab")
      .forEach((tab) => tab.classList.remove("active"));
    document
      .querySelectorAll(".webview-container")
      .forEach((container) => container.classList.remove("active"));

    const tabButton = document.querySelector(`[data-tab-id="${tabId}"]`);
    const webviewContainer = document.getElementById(tabId);

    if (tabButton && webviewContainer) {
      tabButton.classList.add("active");
      webviewContainer.classList.add("active");
      activeTabId = tabId;
    }
  }

  function closeTab(tabId) {
    const tabButton = document.querySelector(`[data-tab-id="${tabId}"]`);
    const webviewContainer = document.getElementById(tabId);

    if (tabButton && webviewContainer) {
      tabButton.remove();
      webviewContainer.remove();
      tabs = tabs.filter((t) => t.id !== tabId);

      if (activeTabId === tabId && tabs.length > 0) {
        setActiveTab(tabs[tabs.length - 1].id);
      }
      if (tabs.length === 0) {
        createTab();
      }
    }
  }

  // Expose setupTabManagement globally
  window.setupTabManagement = setupTabManagement;
})();


function injectCSS(webview, css) {
  if (!webview || !css) {
      console.error("Invalid webview or CSS");
      return;
  }

  const script = `
      (() => {
          const style = document.createElement('style');
          style.textContent = \`${css}\`;
          document.head.appendChild(style);
      })();
  `;
  
  webview.executeJavaScript(script)
      .then(() => console.log("CSS Injected successfully"))
      .catch(err => console.error("CSS Injection failed:", err));
}

function injectJS(webview, js) {
  if (!webview || !js) {
      console.error("Invalid webview or JS");
      return;
  }
  
  webview.executeJavaScript(js)
      .then(() => console.log("JS Injected successfully"))
      .catch(err => console.error("JS Injection failed:", err));
}