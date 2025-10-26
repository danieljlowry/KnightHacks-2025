/*
Background script, monitors tab changes, notifies user if accessing unapproved sites
*/

/*
Issue: Timer is broken, doesn't properly update in-real time, requires tab switching or a manually reset to update badge.
Currently unable to transition between study/break periods properly. Gets stuck on 1 minute left on study period (red badge). Requires a
manual reset to transition to break period (blue badge).
*/

// TIMER STATE MANAGEMENT ------------------------------------------------------------------------------------------

let timerState = {
    isBreak: false,           // true during break, false during study
    timeLeft: 0,              // minutes remaining in current period
    endTime: null,
    tickAlarmName: 'ddos_timer_tick',
    endAlarmName: 'ddos_timer_end',
    notificationsEnabled: true
};

// LOAD INPUTTED TIMER SETTINGS ------------------------------------------------------------------------------------------

// Initialize timer every time the worker wakes up
async function initializeTimer() {
    const data = await chrome.storage.local.get([
        'studyMinutes', 'breakMinutes', 'timerEndTime', 'isBreak'
    ]);

    const study = data.studyMinutes || 25;
    const brk = data.breakMinutes || 5;
    const endTime = data.timerEndTime || null;
    const isBreak = !!data.isBreak;
    const now = Date.now();

    if (endTime && endTime > now) {
        timerState.endTime = endTime;
        timerState.isBreak = isBreak;
        computeTimeLeftAndSchedule(study, brk);
    } else {
        // Timer expired or not set → transition or start fresh
        if (endTime && endTime <= now) {
            // period has expired → handle it immediately
            timerState.isBreak = isBreak;
            await handleEndAlarm();
        } else {
            // brand new session
            startStudyPeriod(study, brk);
        }
    }
}

// Always call on startup and worker wakeup
initializeTimer();


// START STUDY PERIOD FUNCTION ------------------------------------------------------------------------------------------

// Use chrome.alarms + endTime to make timers reliable in MV3 service worker
function startStudyPeriod(studyMin, breakMin) {
    clearAlarm();

    timerState.isBreak = false;
    timerState.notificationsEnabled = true;
    timerState.endTime = Date.now() + studyMin * 60 * 1000;
    persistTimerState();

    // Update badge immediately and schedule minute ticks via alarms
    handleTick();
    // periodic tick alarm (minute updates)
    chrome.alarms.create(timerState.tickAlarmName, { periodInMinutes: 1 });
    // exact end alarm to trigger transition promptly
    chrome.alarms.create(timerState.endAlarmName, { when: timerState.endTime });
}

// START BREAK PERIOD FUNCTION ------------------------------------------------------------------------------------------

function startBreakPeriod(breakMin, studyMin) {
    clearAlarm();

    timerState.isBreak = true;
    timerState.notificationsEnabled = false;
    timerState.endTime = Date.now() + breakMin * 60 * 1000;
    persistTimerState();

    handleTick();
    chrome.alarms.create(timerState.tickAlarmName, { periodInMinutes: 1 });
    chrome.alarms.create(timerState.endAlarmName, { when: timerState.endTime });
}

function clearAlarm() {
    try {
        chrome.alarms.clear(timerState.tickAlarmName);
        chrome.alarms.clear(timerState.endAlarmName);
    } catch (e) {
        // ignore
    }
}

function persistTimerState() {
    chrome.storage.local.set({ timerEndTime: timerState.endTime, isBreak: !!timerState.isBreak });
}

function computeTimeLeftAndSchedule(studyMin, breakMin) {
    const now = Date.now();
    if (!timerState.endTime || timerState.endTime <= now) {
        // endTime passed -> immediately transition
        if (timerState.isBreak) {
            startStudyPeriod(studyMin, breakMin);
            notifyPeriodChange("Break's over! Back to studying.");
        } else {
            startBreakPeriod(breakMin, studyMin);
            notifyPeriodChange("Time for a break!");
        }
        return;
    }

    // Otherwise schedule alarm ticks and update badge now
    handleTick();
    chrome.alarms.create(timerState.tickAlarmName, { periodInMinutes: 1 });
    chrome.alarms.create(timerState.endAlarmName, { when: timerState.endTime });
}

function handleTick() {
    if (!timerState.endTime) {
        timerState.timeLeft = 0;
        updateBadge();
        return;
    }

    const msLeft = timerState.endTime - Date.now();
    timerState.timeLeft = Math.max(0, Math.ceil(msLeft / (60 * 1000)));
    updateBadge();

    if (msLeft <= 0) {
        // As a fallback in case the end alarm didn't fire, transition now
        handleEndAlarm();
    }
}

async function handleEndAlarm() {
    persistTimerState();
    const data = await chrome.storage.local.get(['studyMinutes', 'breakMinutes']);
    const studyMin = data.studyMinutes || 25;
    const breakMin = data.breakMinutes || 5;

    if (timerState.isBreak) {
        startStudyPeriod(studyMin, breakMin);
        notifyPeriodChange("Break's over! Back to studying.");
    } else {
        startBreakPeriod(breakMin, studyMin);
        notifyPeriodChange("Time for a break!");
    }
}

function updateBadge() {

    const text = `${timerState.timeLeft}`;
    const color = timerState.isBreak ? '#1976d2' : '#c0392b';
    
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color });

} // end updateBadge

// NOTIFICATION MESSAGE FUNCTION ------------------------------------------------------------------------------------------

function notifyPeriodChange(message) {

    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'images/swap_icon.png',
        title: 'DDOS Timer',
        message: message
    });

} // end notifyPeriodChange

// LISTEN FOR SETTINGS CHANGES ------------------------------------------------------------------------------------------

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && (changes.studyMinutes || changes.breakMinutes)) {
        chrome.storage.local.get(['studyMinutes', 'breakMinutes'], (data) => {
            if (data.studyMinutes && data.breakMinutes) {
                // Restart current period with new times
                if (timerState.isBreak) {
                    startBreakPeriod(data.breakMinutes, data.studyMinutes);
                } else {
                    startStudyPeriod(data.studyMinutes, data.breakMinutes);
                }
            }
        });
    }
}); // end storage change listener

// Alarm listener for periodic ticks (fires even if service worker restarts)
if (chrome.alarms && chrome.alarms.onAlarm) {
    chrome.alarms.onAlarm.addListener((alarm) => {
        try {
            if (!alarm || !alarm.name) return;
            if (alarm.name === timerState.tickAlarmName) {
                handleTick();
            } else if (alarm.name === timerState.endAlarmName) {
                // Ensure immediate transition at period end
                handleEndAlarm();
            }
        } catch (e) {
            console.error('alarm handler error', e);
        }
    });
}

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
        // Skip checks during break time
        if (!timerState.notificationsEnabled) return;
        
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