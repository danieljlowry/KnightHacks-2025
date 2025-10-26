/*
DDOS Extension - Background Script
Runs in the background to manage timer, monitor websites, and communicate with Arduino
*/

/*
HARDWARE COMMUNICATION --------------------------------------------------------------------------------
*/

function sendToArduino(state) {
  fetch(`http://localhost:5000/status?state=${state}`)
    .catch(err => console.error("ERROR: Arduino unreachable:", err));
}

// Example: after checking the tab
if (true) sendToArduino("on_task");
else sendToArduino("off_task");

// Other communication to hardware is sent within the handlePeriodEnd and checkUnauthorizedState functions below


/* 
TIMER STATE MANAGEMENT --------------------------------------------------------------------------------------
*/

class TimerManager {
    constructor() {
        this.state = {
            isBreak: false,
            timeLeft: 0,
            endTime: null,
            isInitialized: false,
            notificationsEnabled: true
        };
        
        this.alarmNames = {
            tick: 'ddos_timer_tick',
            end: 'ddos_timer_end'
        };
        
        this.updateInterval = null;
        this.init();
    }
    
    // Initialize timer on startup
    async init() {
        console.log('DDOS: Initializing timer manager');
        
        try {
            const data = await this.getStorageData(['studyMinutes', 'breakMinutes', 'timerEndTime', 'isBreak']);
            const studyMin = data.studyMinutes || 25;
            const breakMin = data.breakMinutes || 5;
            const endTime = data.timerEndTime;
            const isBreak = data.isBreak || false;
            
            console.log('DDOS: Loaded settings', { studyMin, breakMin, endTime, isBreak });
            
            if (endTime && endTime > Date.now()) {
                // Resume existing timer
                this.state.endTime = endTime;
                this.state.isBreak = isBreak;
                this.state.isInitialized = true;
                this.startTimerUpdates();
                this.updateDisplay();
                console.log('DDOS: Resumed existing timer');
            } else {
                // Start new timer
                this.state.isInitialized = true;
                this.startStudyPeriod(studyMin, breakMin);
                console.log('DDOS: Started new timer');
            }
        } catch (error) {
            console.error('DDOS: Initialization error', error);
            this.state.isInitialized = true;
            this.startStudyPeriod(25, 5); // Fallback
        }
    }
    
    // Start STUDY period
    startStudyPeriod(studyMin, breakMin) {
        console.log('DDOS: Starting study period', { studyMin, breakMin });
        
        this.clearAllTimers();
        
        this.state.isBreak = false;
        this.state.notificationsEnabled = true;
        this.state.endTime = Date.now() + (studyMin * 60 * 1000);
        
        this.saveState();
        this.startTimerUpdates();
        this.updateDisplay();
        
        console.log('DDOS: Study period started, ends at', new Date(this.state.endTime));
    }
    
    // Start BREAK period
    startBreakPeriod(breakMin, studyMin) {
        console.log('DDOS: Starting break period', { breakMin, studyMin });
        
        this.clearAllTimers();
        
        this.state.isBreak = true;
        this.state.notificationsEnabled = false;
        this.state.endTime = Date.now() + (breakMin * 60 * 1000);
        
        this.saveState();
        this.startTimerUpdates();
        this.updateDisplay();
        
        console.log('DDOS: Break period started, ends at', new Date(this.state.endTime));
    }
    
    // Start timer update mechanisms
    startTimerUpdates() {
        this.clearAllTimers();
        
        // Create Chrome alarms for reliability
        try {
            chrome.alarms.create(this.alarmNames.tick, { periodInMinutes: 1 });
            chrome.alarms.create(this.alarmNames.end, { when: this.state.endTime });
            console.log('DDOS: Chrome alarms created');
        } catch (error) {
            console.error('DDOS: Error creating alarms', error);
        }
        
        // Start frequent updates for responsiveness
        this.updateInterval = setInterval(() => {
            this.tick();
        }, 2000); // Update every 2 seconds
        
        console.log('DDOS: Timer updates started');
    }
    
    // Clear all timers and alarms
    clearAllTimers() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        try {
            chrome.alarms.clear(this.alarmNames.tick);
            chrome.alarms.clear(this.alarmNames.end);
        } catch (error) {
            console.warn('DDOS: Error clearing alarms', error);
        }
    }
    
    // Main timer tick function
    tick() {
        if (!this.state.endTime) {
            this.state.timeLeft = 0;
            this.updateDisplay();
            return;
        }
        
        const now = Date.now();
        const msLeft = this.state.endTime - now;
        this.state.timeLeft = Math.max(0, Math.ceil(msLeft / (60 * 1000)));
        
        console.log('DDOS: Timer tick', {
            timeLeft: this.state.timeLeft,
            isBreak: this.state.isBreak,
            msLeft: msLeft
        });
        
        this.updateDisplay();
        
        // Check if timer expired
        if (msLeft <= 0) {
            console.log('DDOS: Timer expired, transitioning');
            this.handlePeriodEnd();
        }
    }
    
    // Handle period end transition, send signals to Arduino for both transitions
    async handlePeriodEnd() {
        console.log('DDOS: Handling period end');
        
        try {
            const data = await this.getStorageData(['studyMinutes', 'breakMinutes']);
            const studyMin = data.studyMinutes || 25;
            const breakMin = data.breakMinutes || 5;
            
            if (this.state.isBreak) {
                this.startStudyPeriod(studyMin, breakMin);
                this.showNotification("Break's over! Back to studying.");
                sendToArduino("off_task"); // HARDWARE: Sends off_task signal to Arduino
            } else {
                this.startBreakPeriod(breakMin, studyMin);
                this.showNotification("Time for a break!");
                sendToArduino("break_time"); // HARDWARE: Sends break_time signal to Arduino
            }
        } catch (error) {
            console.error('DDOS: Error handling period end', error);
            this.startStudyPeriod(25, 5); // Fallback
        }
    }
    
    // Update display (badge)
    updateDisplay() {
        try {
            const text = this.state.timeLeft.toString();
            const color = this.state.isBreak ? '#1976d2' : '#c0392b';
            
            chrome.action.setBadgeText({ text });
            chrome.action.setBadgeBackgroundColor({ color });
            
            console.log('DDOS: Badge updated', { text, color });
        } catch (error) {
            console.error('DDOS: Error updating badge', error);
        }
    }
    
    // Save timer state to storage
    saveState() {
        try {
            chrome.storage.local.set({
                timerEndTime: this.state.endTime,
                isBreak: this.state.isBreak
            });
        } catch (error) {
            console.error('DDOS: Error saving state', error);
        }
    }
    
    // Get data from storage
    getStorageData(keys) {
        return new Promise((resolve) => {
            chrome.storage.local.get(keys, (data) => {
                resolve(data);
            });
        });
    }
    
    // Show notification
    showNotification(message) {
        try {
            console.log('DDOS: Showing notification:', message);
            
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'images/study_icon48.png',
                title: 'DDOS Timer',
                message: message
            }, (notificationId) => {
                if (chrome.runtime.lastError) {
                    console.error('DDOS: Notification error:', chrome.runtime.lastError);
                } else {
                    console.log('DDOS: Notification created:', notificationId);
                }
            });
        } catch (error) {
            console.error('DDOS: Error creating notification', error);
        }
    }
    
    // Reset timer
    async reset() {
        console.log('DDOS: Resetting timer');
        this.clearAllTimers();
        this.state.isInitialized = false;
        await this.init();
    }
    
    // Update settings and restart timer
    async updateSettings() {
        console.log('DDOS: Updating settings');
        const data = await this.getStorageData(['studyMinutes', 'breakMinutes']);
        const studyMin = data.studyMinutes || 25;
        const breakMin = data.breakMinutes || 5;
        
        this.clearAllTimers();
        this.state.isInitialized = false;
        this.startStudyPeriod(studyMin, breakMin);
    }
    
    // Get current status
    getStatus() {
        return {
            isInitialized: this.state.isInitialized,
            isBreak: this.state.isBreak,
            timeLeft: this.state.timeLeft,
            endTime: this.state.endTime,
            notificationsEnabled: this.state.notificationsEnabled
        };
    }
}

/*
WEBSITE MONITORING --------------------------------------------------------------------------------------
*/

class WebsiteMonitor {
    constructor(timerManager) {
        this.timerManager = timerManager;
        this.lastNotified = new Map();
        this.notifyInterval = 10000; // 10 seconds
        this.unauthorizedAccess = false;
        
        // Start periodic check for unauthorized access
        setInterval(() => this.checkUnauthorizedState(), 1000); // Check every second
    }
    
    // Check if URL is allowed
    async isUrlAllowed(url) {
        try {
            const data = await this.timerManager.getStorageData(['allowedWebsites']);
            const allowedWebsites = data.allowedWebsites || [];
            
            return allowedWebsites.some(allowedUrl => {
                try {
                    const allowedDomain = new URL(allowedUrl).hostname;
                    const currentDomain = new URL(url).hostname;
                    return currentDomain.includes(allowedDomain);
                } catch (e) {
                    return false;
                }
            });
        } catch (error) {
            console.error('DDOS: Error checking URL', error);
            return false;
        }
    }
    
    // Check if should notify (rate limiting)
    shouldNotify(tabId) {
        const last = this.lastNotified.get(tabId) || 0;
        const now = Date.now();
        
        if (now - last > this.notifyInterval) {
            this.lastNotified.set(tabId, now);
            return true;
        }
        return false;
    }
    
    // Check URL and notify if unauthorized
    async checkUrlAndNotify(tab) {
        try {
            // Skip checks during break time
            if (!this.timerManager.state.notificationsEnabled) {
                this.unauthorizedAccess = false;
                return;
            }
            
            if (!tab || !tab.url) return;
            if (!(tab.url.startsWith('http://') || tab.url.startsWith('https://'))) return;
            
            const allowed = await this.isUrlAllowed(tab.url);
            
            if (!allowed) {
                this.unauthorizedAccess = true;
                
                if (this.shouldNotify(tab.id)) {
                    console.log('DDOS: Unauthorized website accessed:', tab.url);
                    
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: 'images/warning_icon.png',
                        title: 'WARNING: Unauthorized Website Accessed!',
                        message: 'HEY! This website is NOT on your allowed list. Stay focused!'
                    }, (notificationId) => {
                        if (chrome.runtime.lastError) {
                            console.error('DDOS: Warning notification error:', chrome.runtime.lastError);
                        } else {
                            console.log('DDOS: Warning notification created:', notificationId);
                        }
                    });
                }
            } else {
                this.unauthorizedAccess = false;
            }
        } catch (error) {
            console.error('DDOS: Error checking URL', error);
        }
    }
    
    // Check for unauthorized state and send to Arduino (through bridge.py file)
    checkUnauthorizedState() {
        // Send the current state to Arduino using on_task/off_task
        sendToArduino(this.unauthorizedAccess ? "off_task" : "on_task");
    }
}

/*
// INITIALIZATION ----------------------------------------------------------------------------------------------------------
*/

// Create global instances
const timerManager = new TimerManager();
const websiteMonitor = new WebsiteMonitor(timerManager);

/*
EVENT LISTENERS -----------------------------------------------------------------------------------------------------------
*/  

// Chrome alarms listener
chrome.alarms.onAlarm.addListener((alarm) => {
    console.log('DDOS: Alarm fired:', alarm.name, new Date());
    
    if (alarm.name === timerManager.alarmNames.tick) {
        timerManager.tick();
    } else if (alarm.name === timerManager.alarmNames.end) {
        timerManager.handlePeriodEnd();
    }
});

// Storage change listener
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && (changes.studyMinutes || changes.breakMinutes)) {
        console.log('DDOS: Settings changed, updating timer');
        timerManager.updateSettings();
    }
});

// Tab monitoring listeners
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if ((changeInfo.url || changeInfo.status === 'complete') && tab && tab.url) {
        websiteMonitor.checkUrlAndNotify(tab);
    }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        websiteMonitor.checkUrlAndNotify(tab);
    });
});

chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) return;
    chrome.tabs.query({ active: true, windowId: windowId }, (tabs) => {
        if (tabs && tabs[0]) {
            websiteMonitor.checkUrlAndNotify(tabs[0]);
        }
    });
});

// History state updates for single-page apps
if (chrome.webNavigation && chrome.webNavigation.onHistoryStateUpdated) {
    chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
        chrome.tabs.get(details.tabId, (tab) => {
            if (tab) websiteMonitor.checkUrlAndNotify(tab);
        });
    });
}

/* 
MESSAGE HANDLING -----------------------------------------------------------------------------------------------------------
*/ 

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('DDOS: Message received:', request.action);
    
    switch (request.action) {
        case 'startTimer':
            timerManager.reset();
            sendResponse({ success: true });
            break;
            
        case 'resetTimer':
            timerManager.reset();
            sendResponse({ success: true });
            break;
            
        case 'updateSettings':
            timerManager.updateSettings();
            sendResponse({ success: true });
            break;
            
        case 'testNotification':
            timerManager.showNotification('Test notification - timer is working!');
            sendResponse({ success: true });
            break;
            
        case 'getTimerStatus':
            sendResponse({ success: true, status: timerManager.getStatus() });
            break;
            
        default:
            sendResponse({ success: false, error: 'Unknown action' });
    }
});

/* 
STARTUP EVENTS -----------------------------------------------------------------------------------------------------------
*/

chrome.runtime.onStartup.addListener(() => {
    console.log('DDOS: Extension startup');
    timerManager.init();
});

chrome.runtime.onInstalled.addListener(() => {
    console.log('DDOS: Extension installed');
    timerManager.init();
});

console.log('DDOS: Background script loaded');