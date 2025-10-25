document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('form');
    
    // Load saved websites when popup opens
    chrome.storage.local.get(['allowedWebsites'], function(result) {
        if (result.allowedWebsites) {
            const urls = result.allowedWebsites;
            document.getElementById('URL1').value = urls[0] || '';
            document.getElementById('URL2').value = urls[1] || '';
            document.getElementById('URL3').value = urls[2] || '';
        }
    });

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const urls = [
            document.getElementById('URL1').value.trim(),
            document.getElementById('URL2').value.trim(),
            document.getElementById('URL3').value.trim()
        ].filter(url => url !== ''); // Remove empty entries

        // Save to Chrome storage
        chrome.storage.local.set({ allowedWebsites: urls }, function() {
            const status = document.getElementById('status');
            status.textContent = 'Websites saved successfully!';
            setTimeout(() => status.textContent = '', 2000);
        });
    });
});