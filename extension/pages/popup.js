/*
Functionality for popup.html: saves allowed websites, clear saved websites, autosaves text fields
*/


document.addEventListener('DOMContentLoaded', function() {
    console.log('DDOS Popup: DOM loaded');
    
    const form = document.querySelector('form');
    const inputIds = ['URL1', 'URL2', 'URL3'];
    const inputs = inputIds.map(id => document.getElementById(id));
    const status = document.getElementById('status');
    const timerDisplay = document.getElementById('timer-display');
    const timerPeriod = document.getElementById('timer-period');
    const resetTimerBtn = document.getElementById('reset-timer');
    let saveTimeout = null;
    let timerUpdateInterval = null;
    
    console.log('DDOS Popup: Elements found', {
        timerDisplay: !!timerDisplay,
        timerPeriod: !!timerPeriod,
        resetTimerBtn: !!resetTimerBtn
    });
    
    // Fallback: if timer elements not found, create them
    if (!timerDisplay || !timerPeriod) {
        
        console.log('DDOS Popup: Creating timer elements fallback');
        const timerStatus = document.getElementById('timer-status');
        if (timerStatus) {
            if (!timerDisplay) {
                const display = document.createElement('div');
                display.id = 'timer-display';
                display.textContent = 'Loading timer...';
                timerStatus.insertBefore(display, timerStatus.firstChild);
            }
            if (!timerPeriod) {
                const period = document.createElement('div');
                period.id = 'timer-period';
                period.textContent = 'Study Period';
                timerStatus.appendChild(period);
            }
        }

    } // end if fallback

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
                status.textContent = 'Cleared!';
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => { status.textContent = ''; }, 1600);
            });
        });
    } // end clearBtn

    // TIMER FUNCTIONALITY ------------------------------------------------------------------------------------
    
    function updateTimerDisplay() {
        console.log('DDOS Popup: Updating timer display');
        
        if (!timerDisplay || !timerPeriod) {
            console.error('DDOS Popup: Timer elements not found!');
            return;
        }
        
        chrome.storage.local.get(['timerEndTime', 'isBreak'], function(data) {
            console.log('DDOS Popup: Timer data from storage', data);
            
            const endTime = data.timerEndTime;
            const isBreak = data.isBreak;
            
            if (!endTime) {
                timerDisplay.textContent = 'No Timer';
                timerPeriod.textContent = 'Timer Not Started';
                console.log('DDOS Popup: No timer found in storage');
                return;
            }
            
            const now = Date.now();
            const timeLeft = Math.max(0, Math.ceil((endTime - now) / (60 * 1000)));
            
            console.log('DDOS Popup: Timer calculation', { endTime, now, timeLeft, isBreak });
            
            if (timeLeft <= 0) {
                timerDisplay.textContent = 'Time Up!';
                timerPeriod.textContent = isBreak ? 'Break Period' : 'Study Period';
            } else {
                const hours = Math.floor(timeLeft / 60);
                const minutes = timeLeft % 60;
                timerDisplay.textContent = hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}` : `${minutes}m`;
                timerPeriod.textContent = isBreak ? 'Break Period' : 'Study Period';
            }
        });
    } // end updateTimerDisplay
    
    function startTimerUpdates() {

        updateTimerDisplay();
        timerUpdateInterval = setInterval(updateTimerDisplay, 1000); // Update every second

    } // end startTimerUpdates
    
    function stopTimerUpdates() {

        if (timerUpdateInterval) {
            clearInterval(timerUpdateInterval);
            timerUpdateInterval = null;

        }

    } // end stopTimerUpdates
    
    // RESET timer functionality
    if (resetTimerBtn) {
        resetTimerBtn.addEventListener('click', function() {
            chrome.storage.local.remove(['timerEndTime', 'isBreak'], function() {
                // Send message to background script to restart timer
                chrome.runtime.sendMessage({ action: 'resetTimer' }, function(response) {
                    if (response && response.success) {
                        status.textContent = 'Timer reset!';
                        clearTimeout(saveTimeout);
                        saveTimeout = setTimeout(() => { status.textContent = ''; }, 1600);
                        updateTimerDisplay();
                    }
                });
            });
        });
    } // end reset timer functionality
    
    // Start timer updates when popup opens
    startTimerUpdates();
    
    // Also try to start timer if it's not running
    chrome.storage.local.get(['timerEndTime'], function(data) {
        if (!data.timerEndTime) {
            console.log('DDOS Popup: No timer found, requesting timer start');
            chrome.runtime.sendMessage({ action: 'startTimer' }, function(response) {
                if (response && response.success) {
                    console.log('DDOS Popup: Timer started successfully');
                    updateTimerDisplay();
                } else {
                    console.log('DDOS Popup: Failed to start timer');
                }
            });
        }
    });
    
    // Clean up when popup closes
    window.addEventListener('beforeunload', stopTimerUpdates);
});