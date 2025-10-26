/*
Functionality for settings.html: customizes study and break time durations, hard coded limit on break time
*/


/*
GET SAVE VALUES FROM POPUP.HTML ---------------------------------------------------------------------------------------------------
*/

document.addEventListener('DOMContentLoaded', () => {
  console.log('DDOS Settings: DOM loaded');
  
  const studyInput = document.getElementById('studyTime');
  const breakInput = document.getElementById('breakTime');
  const form = document.getElementById('settings-form');
  const msg = document.getElementById('msg');
  const saveBtn = document.getElementById('saveSettings');
  const resetBtn = document.getElementById('resetSettings');
  
  console.log('DDOS Settings: Elements found', {
    studyInput: !!studyInput,
    breakInput: !!breakInput,
    form: !!form,
    msg: !!msg,
    saveBtn: !!saveBtn,
    resetBtn: !!resetBtn
  });

// LOAD SAVED VALUES --------------------------------------------------------------------------------------------------------------

  chrome.storage.local.get(['studyMinutes', 'breakMinutes'], (data) => {
    console.log('DDOS Settings: Loading saved values', data);
    if (data.studyMinutes != null) studyInput.value = data.studyMinutes;
    if (data.breakMinutes != null) breakInput.value = data.breakMinutes;
  });

// VALIDATION AND SAVE/RESET FUNCTIONALITY ----------------------------------------------------------------------------------------

  function showMessage(text, isError = false) {
    msg.textContent = text;
    msg.style.color = isError ? 'crimson' : 'green';
  }

  function validateValues() {
    const study = Number(studyInput.value);
    const brk = Number(breakInput.value);

    if (!isFinite(study) || study <= 0) {
      showMessage('Error: Study time must be greater than zero.', true);
      return false;
    }
    if (!isFinite(brk) || brk < 0) {
      showMessage('Error: Break time must be zero or greater.', true);
      return false;
    }

    // Hard-coded limit: Break time can NOT exceed 50% of study time
    if (brk > 0.5 * study) {
      showMessage('Error: Break must be less than or equal to 50% of study time.', true);
      return false;
    }

    // valid
    showMessage('');
    return true;
  }

  // FEEDBACK TO USER ABOUT ACTIONS (SAVE/RESET) --------------------------------------------------------------------------------

  studyInput.addEventListener('input', validateValues);
  breakInput.addEventListener('input', validateValues);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    console.log('DDOS Settings: Form submitted');
    
    if (!validateValues()) {
      console.log('DDOS Settings: Validation failed');
      return;
    }

    const study = Number(studyInput.value);
    const brk = Number(breakInput.value);
    
    console.log('DDOS Settings: Saving values', { study, brk });
    
    chrome.storage.local.set({ studyMinutes: study, breakMinutes: brk }, () => {
      console.log('DDOS Settings: Settings saved successfully');
      showMessage('Settings saved.');
      
      // Notify background script to restart timer with new settings
      chrome.runtime.sendMessage({ action: 'updateSettings' }, (response) => {
        if (response && response.success) {
          console.log('DDOS Settings: Timer updated with new settings');
        } else {
          console.log('DDOS Settings: Failed to update timer');
        }
      });
    });
  });

  resetBtn.addEventListener('click', () => {
    // clear storage keys and inputs
    chrome.storage.local.remove(['studyMinutes', 'breakMinutes'], () => {
      studyInput.value = '';
      breakInput.value = '';
      showMessage('Settings reset.');
    });
  });
  
  // PRESET BUTTONS FUNCTIONALITY --------------------------------------------------------------------------------
  
  const presetButtons = document.querySelectorAll('.preset-btn');
  presetButtons.forEach(button => {
    button.addEventListener('click', () => {
      const study = parseInt(button.dataset.study);
      const breakTime = parseInt(button.dataset.break);
      
      console.log('DDOS Settings: Preset selected', { study, breakTime });
      
      studyInput.value = study;
      breakInput.value = breakTime;
      
      // Auto-save preset selection
      if (validateValues()) {
        chrome.storage.local.set({ studyMinutes: study, breakMinutes: breakTime }, () => {
          console.log('DDOS Settings: Preset saved', { study, breakTime });
          showMessage(`Preset applied: ${study}min study, ${breakTime}min break`);
          
          // Notify background script to restart timer with new settings
          chrome.runtime.sendMessage({ action: 'updateSettings' }, (response) => {
            if (response && response.success) {
              console.log('DDOS Settings: Timer updated with preset');
            }
          });
        });
      }
    });
  });
});
