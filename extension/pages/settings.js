/*
Functionality for settings.html: customizes study and break time durations, hard coded limit on break time
*/


/*
GET SAVE VALUES FROM POPUP.HTML ---------------------------------------------------------------------------------------------------
*/

document.addEventListener('DOMContentLoaded', () => {
  const studyInput = document.getElementById('studyTime');
  const breakInput = document.getElementById('breakTime');
  const form = document.getElementById('settings-form');
  const msg = document.getElementById('msg');
  const saveBtn = document.getElementById('saveSettings');
  const resetBtn = document.getElementById('resetSettings');

// LOAD SAVED VALUES --------------------------------------------------------------------------------------------------------------

  chrome.storage.local.get(['studyMinutes', 'breakMinutes'], (data) => {
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
    if (!validateValues()) return;

    const study = Number(studyInput.value);
    const brk = Number(breakInput.value);
    chrome.storage.local.set({ studyMinutes: study, breakMinutes: brk }, () => {
      showMessage('Settings saved.');
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
});
