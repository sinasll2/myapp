import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("68334c60000199e18987");

const functions = new Functions(client);
const FUNCTION_ID = "683384ef00117ec193da";

// DOM Elements
const minedEl = document.getElementById('mined');
const balanceEl = document.getElementById('balance');
const usernameEl = document.getElementById('username');
const powerEl = document.getElementById('power');
const mineBtn = document.getElementById('mineButton');
const totalMinersEl = document.getElementById('totalminers');
const countdownEl = document.getElementById('countdown');
const codeInput = document.getElementById('codeInput');
const copyBtn = document.getElementById('copyButton');
const submitBtn = document.getElementById('submitButton');
const dailyCodeEl = document.getElementById('dailyCode');
const subsOfCodeEl = document.getElementById('subsOfCode');
const sendBtn = document.getElementById('sendButton');
const referralCountEl = document.getElementById('referral-count');
const referralEarningsEl = document.getElementById('referral-earnings');
const shareBtn = document.getElementById('shareButton');
const totalOfCodeEl = document.getElementById('totalOfCode');
const usersubsEl = document.getElementById('usersubs');
const referralCodeEl = document.getElementById('referralCode');
const totalReferralsEl = document.getElementById('totalReferrals');
const copyReferralBtn = document.getElementById('copyReferralButton');
const inviteBtn = document.getElementById('inviteButton');
const usedReferralCodeEl = document.getElementById('used-referral-code');
const friendsContainerEl = document.getElementById('friendsContainer');

// Task Elements
const taskItems = document.querySelectorAll('.task-item');

// Wire each "Claim" button to open the <a> in its description:
taskItems.forEach(li => {
  const btn  = li.querySelector('.complete-task');
  const link = li.querySelector('.task-desc a');
  
  if (link) {
    btn.disabled = false;
    btn.addEventListener('click', () => {
      window.open(link.href, '_blank');
    });
  }
});

// State
let userData = {
    isMining: false,
    balance: 0,
    totalMined: 0,
    miningPower: 1.0,
    nextReset: null,
    dailyCode: '',
    submittedCodes: [],
    codeSubmissionsToday: 0,
    referrals: 0,
    referralEarnings: 0,
    totalCodeSubmissions: 0,
    totalCodesSubmitted: 0,
    ownReferralCode: '',
    totalInvites: 0,
    usedReferralCode: '',
    referralLinksClicked: 0,
    tasksCompleted: {}
};

let mineInterval = null;

// toast alert
function showToast(message, type = 'success', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  // Remove any existing toast
  container.innerHTML = '';

  // Create new toast
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  // Auto-dismiss after `duration`
  setTimeout(() => {
    toast.addEventListener('animationend', () => toast.remove());
    toast.classList.add('fade');
  }, duration);
}


// Override default alert:
window.originalAlert = window.alert;
window.alert = msg => showToast(msg, 'error');

// Override your Telegram wrapper (if you use one):
function tgAlert(message) {
  showToast(message, 'error');
}



// Helper function to format numbers
function formatNumber(num, decimals = 3) {
    if (isNaN(num)) return '0' + '0'.repeat(decimals);
    
    const parts = Number(num).toFixed(decimals).split('.');
    const wholePart = parts[0];
    const decimalPart = parts[1] || '';
    
    const formattedWhole = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return formattedWhole + (decimalPart ? '.' + decimalPart : '');
}

function getDefaultResetTime() {
    const now = new Date();
    const resetTime = new Date(now);
    resetTime.setUTCHours(12, 0, 0, 0);
    if (now >= resetTime) resetTime.setUTCDate(resetTime.getUTCDate() + 1);
    return resetTime.toISOString();
}

function isAfterResetTime() {
    if (!userData.nextReset) return false;
    return new Date() >= new Date(userData.nextReset);
}

function saveMiningState() {
  localStorage.setItem('isMining', JSON.stringify(userData.isMining));
  localStorage.setItem('nextReset', userData.nextReset);
  localStorage.setItem('submittedCodes', JSON.stringify(userData.submittedCodes));
  localStorage.setItem('codeSubmissionsToday',   userData.codeSubmissionsToday.toString());
  localStorage.setItem('totalCodeSubmissions',    userData.totalCodeSubmissions.toString());
  // persist tasksCompleted too
  localStorage.setItem('tasksCompleted', JSON.stringify(userData.tasksCompleted));
}

function loadMiningState() {
  const storedReset             = localStorage.getItem('nextReset');
  const storedIsMining          = localStorage.getItem('isMining') === 'true';
  const storedCodes             = JSON.parse(localStorage.getItem('submittedCodes') || '[]');
  const storedSubmissions       = parseInt(localStorage.getItem('codeSubmissionsToday')    || '0');
  const storedTotalSubmissions  = parseInt(localStorage.getItem('totalCodeSubmissions')   || '0');
  const storedTasks             = JSON.parse(localStorage.getItem('tasksCompleted')       || '{}');

  if (storedReset && new Date() < new Date(storedReset)) {
    userData.isMining             = storedIsMining;
    userData.nextReset            = storedReset;
    userData.submittedCodes       = storedCodes;
    userData.codeSubmissionsToday = storedSubmissions;
    userData.totalCodeSubmissions = storedTotalSubmissions;
    userData.tasksCompleted       = storedTasks;
  } else {
    localStorage.removeItem('isMining');
    localStorage.removeItem('nextReset');
    localStorage.removeItem('submittedCodes');
    localStorage.removeItem('codeSubmissionsToday');
    localStorage.removeItem('totalCodeSubmissions');
    localStorage.removeItem('tasksCompleted');
    userData.isMining             = false;
    userData.submittedCodes       = [];
    userData.codeSubmissionsToday = 0;
    userData.totalCodeSubmissions = 0;
    userData.tasksCompleted       = {};
  }
}

function initializeUser() {
    const tg = window.Telegram?.WebApp;
    let referralCode = '';

    if (tg?.initDataUnsafe?.start_param) {
        referralCode = tg.initDataUnsafe.start_param;
    } else {
        const urlParams = new URLSearchParams(window.location.search);
        referralCode = urlParams.get('startapp') || urlParams.get('ref') || '';
    }

    if (tg?.initDataUnsafe?.user) {
        const user = tg.initDataUnsafe.user;
        return {
            username: user.username || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
            telegramId: user.id.toString(),
            referralCode: referralCode
        };
    }

    let username = localStorage.getItem('guestUsername');
    if (!username) {
        username = 'guest_' + Math.random().toString(36).substring(2, 7);
        localStorage.setItem('guestUsername', username);
    }

    return {
        username,
        telegramId: '',
        referralCode: referralCode
    };
}

let dotInterval = null;
let dotCount = 0;

// call this to kick off the dots animation
// Modified animation functions
function startDotAnimation() {
    if (dotInterval) return;
    const dotsContainer = mineBtn.querySelector('.dots-container');
    
    dotInterval = setInterval(() => {
        dotCount = (dotCount % 3) + 1;
        dotsContainer.textContent = '.'.repeat(dotCount);
    }, 500);
    
    mineBtn.querySelector('.mining-text').textContent = 'Mining';
}

function stopDotAnimation() {
    clearInterval(dotInterval);
    dotInterval = null;
    dotCount = 0;
    mineBtn.querySelector('.mining-text').textContent = 'Start Mining';
    mineBtn.querySelector('.dots-container').textContent = '';
}

// Update UI handling
if (userData.isMining) {
    startDotAnimation();
} else {
    stopDotAnimation();
}

function updateUI() {
  try {
    if (balanceEl) balanceEl.textContent = formatNumber(userData.balance);
    if (minedEl)  minedEl.textContent = formatNumber(userData.totalMined);
    if (powerEl)  powerEl.textContent = formatNumber(userData.miningPower, 1);

    if (mineBtn) {
        mineBtn.disabled = userData.isMining || isAfterResetTime();
        // Button text reflects mining state from backend
        if (userData.isMining) {
            startDotAnimation();
        } else {
            stopDotAnimation();
        }
    }

    if (dailyCodeEl)       dailyCodeEl.textContent = userData.dailyCode;
    if (subsOfCodeEl)      subsOfCodeEl.textContent = `${formatNumber(userData.codeSubmissionsToday, 0)}/10`;
    if (totalOfCodeEl)     totalOfCodeEl.textContent = formatNumber(userData.totalCodeSubmissions, 0);
    if (usersubsEl)     usersubsEl.textContent = formatNumber(userData.totalCodesSubmitted, 0);
    if (referralCountEl)   referralCountEl.textContent = formatNumber(userData.referrals, 0);
    if (referralEarningsEl)referralEarningsEl.textContent = formatNumber(userData.referralEarnings);
    if (referralCodeEl)    referralCodeEl.textContent = userData.ownReferralCode;
    if (totalReferralsEl)  totalReferralsEl.textContent = formatNumber(userData.totalInvites, 0);
    if (usedReferralCodeEl)usedReferralCodeEl.textContent = userData.usedReferralCode || 'None';

    refreshTasksState();
  } catch (error) {
    console.error('UI update error:', error);
  }
}

function updateCountdown() {
    if (!userData.nextReset || !countdownEl) return;
    const now = new Date();
    const nextReset = new Date(userData.nextReset);
    const timeUntilReset = nextReset - now;

    if (timeUntilReset <= 0) {
        countdownEl.textContent = 'Reset time!';
        if (userData.isMining) stopMining();
        return;
    }

    const hours = Math.floor(timeUntilReset / (1000 * 60 * 60));
    const minutes = Math.floor((timeUntilReset / (1000 * 60)) % 60);
    const seconds = Math.floor((timeUntilReset / 1000) % 60);

    countdownEl.textContent = `Daily reset in ${formatNumber(hours, 0)}h ${formatNumber(minutes, 0)}m ${formatNumber(seconds, 0)}s`;
}

async function fetchReferredFriends() {
    const payload = {
        ...initializeUser(),
        action: 'get_referred_friends'
    };
    const exec = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    const friends = JSON.parse(exec.responseBody || '[]');
    populateFriends(friends);
}

function populateFriends(friends) {
    totalReferralsEl.textContent = formatNumber(friends.length, 0);
    friendsContainerEl.innerHTML = '';
    friends.forEach(f => {
        const row = document.createElement('div');
        row.className = 'friend-row stats-row';
        row.innerHTML = `
            <div>${f.username}</div>
            <div>${formatNumber(f.balance)} $BLACK</div>
        `;
        friendsContainerEl.appendChild(row);
    });
}

function refreshTasksState() {
    taskItems.forEach(li => {
        const task = li.dataset.task;
        const done = !!userData.tasksCompleted[task];
        
        // Define prereqMet based on task type
        const prereqMet = 
            task === 'code10' ? userData.totalCodesSubmitted >= 10 :
            task === 'code20' ? userData.totalCodesSubmitted >= 20 :
            task === 'code30' ? userData.totalCodesSubmitted >= 30 :
            task === 'code100' ? userData.totalCodeSubmissions >= 100 :
            task === 'code200' ? userData.totalCodeSubmissions >= 200 :
            task === 'code300' ? userData.totalCodeSubmissions >= 300 :
            true;
        
        const btn = li.querySelector('.complete-task');
        btn.disabled = done || !prereqMet;
        btn.textContent = done ? 'Claimed' : 'Claim';
    });
}

async function handleTaskClick(task) {
  try {
    const payload = {
      ...initializeUser(),
      action: 'complete_task',
      task
    };
    const exec = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    const data = JSON.parse(exec.responseBody || '{}');

    if (data.success) {
      // update local userData
      userData.balance         = data.balance;
      userData.miningPower     = data.mining_power;
      // **mark the task done locally**
      userData.tasksCompleted[task] = true;

      // re‑render
      refreshTasksState();
      updateUI();
    } else {
      showToast(data.message || 'Task failed');
    }
  } catch (err) {
    console.error('Task error:', err);
    tgAlert(err.message || 'Error completing task');
  }
}

taskItems.forEach(li => {
    li.querySelector('.complete-task').addEventListener('click', () => {
        const task = li.dataset.task;
        handleTaskClick(task);
    });
});

async function fetchUserData() {
    try {
        const payload = initializeUser();
        if (usernameEl) usernameEl.textContent = payload.username;

        const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
        const data = JSON.parse(execution.responseBody || '{}');

        if (data.error) {
            console.error('Backend error:', data.message);
            return data;
        }

        userData.isMining = data.active_session || false;
        userData.balance = data.balance || 0;
        userData.totalMined = data.total_mined || 0;
        userData.miningPower = data.mining_power || 1.0;
        userData.nextReset = data.next_reset || getDefaultResetTime();
        userData.dailyCode = data.daily_code || '';
        userData.submittedCodes = data.submitted_codes || [];
        userData.codeSubmissionsToday = data.code_submissions_today || 0;
        userData.referrals = data.referrals || 0;
        userData.referralEarnings = data.referral_earnings || 0;
        userData.totalCodeSubmissions = data.total_code_submissions || 0;
        userData.totalCodesSubmitted = data.total_codes_submitted || 0;
        userData.ownReferralCode = data.own_referral_code || '';
        userData.totalInvites = data.total_invites || 0;
        userData.usedReferralCode = data.used_referral_code || '';
        userData.referralLinksClicked = data.referral_links_clicked || 0;
        userData.tasksCompleted = data.tasks_completed || {};
        
        if (data.total_miners && totalMinersEl) {
            totalMinersEl.textContent = formatNumber(data.total_miners, 0);
        }

        saveMiningState();
        updateUI();
        return data;
    } catch (err) {
        console.error('Failed to fetch user data:', err);
        return null;
    }
}

async function mineCoins() {
    if (isAfterResetTime()) {
        stopMining();
        return;
    }

    try {
        const payload = initializeUser();
        const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
        const data = JSON.parse(execution.responseBody || '{}');

        if (data.error || !data.updated?.active_session) {
            console.error('Mining error:', data.message);
            stopMining();
            return;
        }

        userData.balance = data.updated.balance;
        userData.totalMined = data.total_mined;
        userData.miningPower = data.updated.mining_power;
        userData.nextReset = data.next_reset || userData.nextReset;
        userData.codeSubmissionsToday = data.updated.code_submissions_today || userData.codeSubmissionsToday;
        userData.referrals = data.referrals || userData.referrals;
        userData.referralEarnings = data.referral_earnings || userData.referralEarnings;
        userData.totalCodeSubmissions = data.total_code_submissions || userData.totalCodeSubmissions;
        userData.totalCodesSubmitted = data.total_codes_submitted || userData.totalCodesSubmitted;

        updateUI();
    } catch (err) {
        console.error('Mining failed:', err);
        stopMining();
    }
}

async function startMining() {
    if (userData.isMining || isAfterResetTime()) return;
    
    try {
        const payload = {
            ...initializeUser(),
            action: 'start_mining'
        };

        const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
        const data = JSON.parse(execution.responseBody || '{}');

        if (data.error || !data.started) {
            showToast(data.message || 'Failed to start mining');
            return;
        }

        userData.isMining = true;
        userData.nextReset = data.next_reset || userData.nextReset;
        userData.codeSubmissionsToday = data.code_submissions_today || 0;
        userData.totalCodeSubmissions = data.total_code_submissions || userData.totalCodeSubmissions;
        
        saveMiningState();
        updateUI();
        
        await mineCoins();
        mineInterval = setInterval(mineCoins, 60000);
    } catch (err) {
        console.error('Start mining failed:', err);
        stopMining();
    }
}

function stopMining() {
    clearInterval(mineInterval);
    mineInterval = null;
    userData.isMining = false;
    saveMiningState();
    updateUI();
}

function setupTabs() {
    const tabLinks = document.querySelectorAll('.tab-list li a');
    
    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.tab-list li a').forEach(tabLink => {
                tabLink.classList.remove('active');
            });
            
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
            this.classList.add('active');
        });
    });
}

function setupEventListeners() {
    if (mineBtn) {
        mineBtn.addEventListener('click', async () => {
            if (!userData.isMining && !isAfterResetTime()) {
                await startMining();
                mineBtn.disabled = true;
                startDotAnimation();
            } else if (userData.isMining) {
                mineBtn.disabled = true;
                startDotAnimation();
            } else if (isAfterResetTime()) {
                alert('Mining reset — please start again!');
                await fetchUserData();
            }
        });
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(dailyCodeEl.textContent);
                copyBtn.textContent = 'Copied';
                setTimeout(() => copyBtn.textContent = 'Copy', 2000);
            } catch {}
        });
    }

    function tgAlert(message) {
    if (window.Telegram?.WebApp) {
        showToast(message);
    } else {
        alert(message);
    }
}

if (submitBtn) {
    // Function to dismiss keyboard
    const dismissKeyboard = () => {
        if (document.activeElement === codeInput) {
            codeInput.blur(); // This removes focus and hides keyboard
        }
    };

    submitBtn.addEventListener('click', async () => {
        const submittedCode = codeInput.value.trim();
        if (!submittedCode) return tgAlert('Please enter a code to submit');

        try {
            const payload = {
                ...initializeUser(),
                action: 'submit_code',
                code: submittedCode
            };

            const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
            const data = JSON.parse(execution.responseBody || '{}');

            if (data.success) {
                userData.balance = data.balance;
                userData.submittedCodes = [...userData.submittedCodes, submittedCode];
                userData.codeSubmissionsToday = data.owner_submissions || userData.codeSubmissionsToday;
                userData.totalCodeSubmissions = data.total_code_submissions || userData.totalCodeSubmissions;
                userData.totalCodesSubmitted = data.total_codes_submitted || userData.totalCodesSubmitted;

                saveMiningState();
                updateUI();
                showToast(data.message || 'Code submitted successfully!');
                codeInput.value = '';
                
                // Dismiss keyboard after successful submission
                dismissKeyboard();
            } else {
                showToast(data.message || 'Code submission failed');
            }
        } catch (err) {
            console.error('Code submission failed:', err);
            tgAlert(err.message || 'Failed to submit code.');
        }
    });

    // Enter key support for code input
    codeInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            dismissKeyboard(); // Dismiss keyboard when Enter pressed
            submitBtn.click();
        }
    });

    // Close keyboard when tapping outside
    document.addEventListener('touchstart', (e) => {
        if (!codeInput.contains(e.target)) {
            dismissKeyboard();
        }
    });

    // Close keyboard when clicking outside (desktop)
    document.addEventListener('mousedown', (e) => {
        if (!codeInput.contains(e.target)) {
            dismissKeyboard();
        }
    });
}

    if (sendBtn) {
        sendBtn.addEventListener('click', async () => {
          const dailyCode    = dailyCodeEl.textContent.trim();
          const referralCode = userData.ownReferralCode;
      
          const shareText = `\nUse my $BLACK code today\n\`${dailyCode}\``;
          const shareUrl  = `https://t.me/theblacktgbot?startapp=${referralCode}`;
            
            if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.openTelegramLink(
                    `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`
                );
            } else {
                navigator.clipboard.writeText(shareText);
                alert('Code copied to clipboard!');
            }
            
            sendBtn.textContent = 'Sending';
            setTimeout(() => sendBtn.textContent = 'Send', 2000);
        });
    }

if (copyReferralBtn) {
    copyReferralBtn.addEventListener('click', async () => {
        try {
            const code = userData.ownReferralCode;
            const link = `https://t.me/theblacktgbot?startapp=${code}`;
            await navigator.clipboard.writeText(link);
            copyReferralBtn.textContent = 'Copied';
            setTimeout(() => copyReferralBtn.textContent = 'Copy', 2000);
        } catch (error) {
            console.error('Copy failed:', error);
        }
    });
}


    if (inviteBtn) {
        inviteBtn.addEventListener('click', async () => {
            try {
                const code = userData.ownReferralCode;
                const shareUrl = `https://t.me/theblacktgbot?startapp=${code}`;
                const message = `\nstart mining $BLACK today with one button!`;

                if (window.Telegram?.WebApp) {
                    window.Telegram.WebApp.openTelegramLink(
                        `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(message)}`
                    );
                } else {
                    const shareLink = `tg://msg?text=${encodeURIComponent(message)}`;
                    window.open(shareLink, '_blank');
                }
            } catch (error) {
                console.error('Sharing failed:', error);
            }
        });
    }
}

async function init() {
    const tg = window.Telegram?.WebApp;
    if (tg) {
        tg.expand();
        tg.ready();
        tg.enableClosingConfirmation();
    }

    setupTabs();
    setupEventListeners();
    loadMiningState();
    
    try {
    await fetchUserData();
    await fetchReferredFriends();
  } catch (error) {
    console.error('Initialization error:', error);
  }

    setInterval(updateCountdown, 1000);
    setInterval(async () => {
        await fetchUserData();
        updateUI();
    }, 300000);
}

document.addEventListener('DOMContentLoaded', init);