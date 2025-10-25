

// Checks if a URL is in the allowed list
async function isUrlAllowed(url) {
    const data = await chrome.storage.local.get(['allowedWebsites']);
    const allowedWebsites = data.allowedWebsites || [];
    
    return allowedWebsites.some(allowedUrl => {
        try {
            const allowedDomain = new URL(allowedUrl).hostname;
            const currentDomain = new URL(url).hostname;
            return currentDomain.includes(allowedDomain);
        } catch {
            return false;
        }
    });
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        if (tab.url.startsWith('http') || tab.url.startsWith('https')) {
            const allowed = await isUrlAllowed(tab.url);
            if (!allowed) {
                // Show warning notification
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'images/warning_icon.png',
                    title: 'Study Focus Warning',
                    message: 'HEY! This website is NOT in your allowed list. Stay focused on the task at hand!'
                });
            }
        }
    }
});