document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('form');
    const inputIds = ['URL1', 'URL2', 'URL3'];
    const inputs = inputIds.map(id => document.getElementById(id));
    const status = document.getElementById('status');
    let saveTimeout = null;

    // READ INPUTS ----------------------------------------------------------------------------------------------

    // Reads current input values into array 
    // Trimmed, keep empties

    function readInputs() {

        return inputs.map(i => (i && i.value.trim()) || '');

    }   // end readInputs


    // FUNCTION SAVE ALLOWED ------------------------------------------------------------------------------------

    // Save current inputs to storage 
    // Filters out empty strings for allowed list
    function saveAllowed() {
        const values = readInputs();
        const filtered = values.filter(v => v !== '');
        chrome.storage.local.set({ allowedWebsites: filtered }, function() {

            // Indiciate to user that websites have been saved, in extension UI
            status.textContent = 'Saved!';
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => { status.textContent = ''; }, 1100);

        });
    } // end saveAllowed


    // FUNCTION SCHEDULE SAVE (DEBOUNCE TIMER) -----------------------------------------------------------------------------------

    // Debounced timer to avoid writing on each keystroke immediately
    function scheduleSave() {

        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveAllowed, 350);

    } // end scheduleSave


    // GET SAVED WEBSITES ------------------------------------------------------------------------------------

    // Load saved websites when popup opens and populate inputs
    chrome.storage.local.get(['allowedWebsites'], function(result) {

        const urls = result.allowedWebsites || [];
        if (inputs[0]) inputs[0].value = urls[0] || '';
        if (inputs[1]) inputs[1].value = urls[1] || '';
        if (inputs[2]) inputs[2].value = urls[2] || '';

    }); // end load saved websites


    // WEBSITE INPUT AUTOSAVE ---------------------------------------------------------------------------------

    // Attachs input listeners to autosave when user types/pastes into text fields
    inputs.forEach(inp => {
        if (!inp) return;
        inp.addEventListener('input', scheduleSave);
        inp.addEventListener('paste', () => { setTimeout(scheduleSave, 50); });
    });


    // FORM SUBMIT HANDLER -----------------------------------------------------------------------------------

    // Keep a standard submit handler that forces an immediate save and shows status
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        saveAllowed();
    });


    // CLEAR STORED WEBSITES (single-click behaviour) -------------------------------------------------------
    const clearBtn = document.getElementById('clearSavedBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            chrome.storage.local.remove(['allowedWebsites'], function() {
                inputs.forEach(i => { if (i) i.value = ''; });
                status.textContent = 'Saved websites cleared.';
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => { status.textContent = ''; }, 1600);
            });
        });
    }
});