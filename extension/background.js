/*
Background script, monitors tab changes, notifies user if accessing unapproved sites
*/

function sendToArduino(state) {
  fetch(`http://localhost:5000/status?state=${state}`)
    .catch(err => console.error("Arduino unreachable:", err));
}

// Example: after checking the tab
if (true) sendToArduino("on_task");
else sendToArduino("off_task");

// URL CHECKER FUNCTION ------------------------------------------------------------------------------------------

// Promise-wrapped storage check (callback-safe)
function isUrlAllowed(url) {
    return new Promise(resolve => {
        chrome.storage.local.get(['allowedWebsites'], function(data) {
            const allowedWebsites = data.allowedWebsites || [];
            const allowed = allowedWebsites.some(allowedUrl => {
                try {
                    const allowedDomain = new URL(allowedUrl).hostname;
                    const currentDomain = new URL(url).hostname;
                    return currentDomain.includes(allowedDomain);
                    
                // Catchs invalid URLs (error catcher)
                } catch (e) {
                    return false;
                }
            });
            resolve(allowed);
        });
    });
} // end isUrlAllowed


// NOTIFICATION RATE LIMITER -----------------------------------------------------------------------------------

// Avoids spamming user with notifications for the same tab
const lastNotified = new Map();
const NOTIFY_INTERVAL_MS = 10 * 1000; // 10 seconds

function shouldNotify(tabId) {

    const last = lastNotified.get(tabId) || 0;
    const now = Date.now();
    if (now - last > NOTIFY_INTERVAL_MS) {
        lastNotified.set(tabId, now);
        return true;
    }
    return false;

} // end shouldNotify


// CHECK URL AND NOTIFY FUNCTION ------------------------------------------------------------------------------------------

// Checks if the URL is allowed and shows notification if not
async function checkUrlAndNotify(tab) {

    try {
        if (!tab || !tab.url) return;
        if (!(tab.url.startsWith('http://') || tab.url.startsWith('https://'))) return;

        // Checks if URL is allowed
        const allowed = await isUrlAllowed(tab.url);
        if (!allowed && shouldNotify(tab.id)) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'images/warning_icon.png',
                title: 'WARNING: Unauthorized Website Accessed!',
                message: 'HEY! This website is NOT on your allowed list. Stay focused!'
            });
        }

    // Catchs any errors to avoid breaking the background script
    } catch (e) {
        console.error('checkUrlAndNotify error', e);
    }
    
} // end checkUrlAndNotify


// EVENT LISTENERS FOR TAB AND NAVIGATION CHANGES ------------------------------------------------------------------

// Tab update listener
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if ((changeInfo.url || changeInfo.status === 'complete') && tab && tab.url) {
        checkUrlAndNotify(tab);
    }
});

// User switches tabs
chrome.tabs.onActivated.addListener(activeInfo => {
    chrome.tabs.get(activeInfo.tabId, function(tab) {
        checkUrlAndNotify(tab);
    });
});

// User switches windows
chrome.windows.onFocusChanged.addListener(windowId => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) return;
    chrome.tabs.query({ active: true, windowId: windowId }, function(tabs) {
        if (tabs && tabs[0]) checkUrlAndNotify(tabs[0]);
    });
});

// For single-page apps that change history via pushState, listen for history updates
if (chrome.webNavigation && chrome.webNavigation.onHistoryStateUpdated) {
    chrome.webNavigation.onHistoryStateUpdated.addListener(details => {
        chrome.tabs.get(details.tabId, function(tab) {
            if (tab) checkUrlAndNotify(tab);
        });
    });
}