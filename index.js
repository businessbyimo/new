const login = require("fca-unofficial-fixed");
const http = require("http");
const fs = require("fs");
const path = require("path");

// ডিবাগ স্টোর
const debugLogs = [];
let currentAPI = null;

// ডিবাগ লগ ফাংশন
function addDebug(type, message, data = null) {
  const log = {
    timestamp: new Date().toISOString(),
    type: type,
    message: message,
    data: data
  };
  debugLogs.push(log);
  console.log(`[${type}] ${message}`, data ? JSON.stringify(data) : '');
  
  // সর্বোচ্চ ১০০০ লগ রাখি
  if (debugLogs.length > 1000) debugLogs.shift();
}

// হেলথ সার্ভার (ডিবাগ ভিউয়ার)
function startDebugServer(api) {
  const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    
    // ডিবাগ পৃষ্ঠা
    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      
      // HTML ডিবাগ ভিউয়ার
      const html = `<!DOCTYPE html>
<html>
<head>
    <title>Facebook Bot Debugger</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background: #f0f2f5; padding: 20px; }
        .container { max-width: 1400px; margin: 0 auto; }
        .header { background: #1877f2; color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header h1 { font-size: 24px; margin-bottom: 10px; }
        .header p { font-size: 14px; opacity: 0.9; }
        .status-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .card h3 { color: #65676b; font-size: 14px; margin-bottom: 10px; text-transform: uppercase; }
        .card .value { font-size: 24px; font-weight: bold; color: #1877f2; }
        .card .small { font-size: 12px; color: #65676b; margin-top: 5px; }
        .success { color: #42b72a; }
        .error { color: #fa383e; }
        .warning { color: #f7b928; }
        .info { color: #1877f2; }
        .logs { background: white; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden; }
        .logs-header { background: #f0f2f5; padding: 15px 20px; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center; }
        .logs-header h2 { font-size: 18px; color: #050505; }
        .logs-header button { background: #1877f2; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-size: 13px; }
        .logs-header button:hover { background: #166fe5; }
        .logs-table { width: 100%; border-collapse: collapse; }
        .logs-table th { background: #f8f9fa; padding: 12px; text-align: left; font-size: 13px; color: #65676b; border-bottom: 2px solid #ddd; }
        .logs-table td { padding: 12px; border-bottom: 1px solid #e4e6eb; font-size: 13px; vertical-align: top; }
        .logs-table tr:hover { background: #f5f6f7; }
        .log-type { display: inline-block; padding: 3px 8px; border-radius: 15px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
        .log-type.success { background: #e3f2e9; color: #42b72a; }
        .log-type.error { background: #ffebee; color: #fa383e; }
        .log-type.warning { background: #fff3e0; color: #f7b928; }
        .log-type.info { background: #e7f3ff; color: #1877f2; }
        .log-type.debug { background: #e8eaf6; color: #5c6bc0; }
        .message-cell { max-width: 500px; word-break: break-word; }
        .data-cell { max-width: 300px; overflow-x: auto; font-family: monospace; font-size: 11px; color: #666; }
        .timestamp { color: #65676b; font-size: 11px; }
        .refresh { text-align: center; margin: 20px 0; color: #65676b; font-size: 13px; }
        .filter { margin-bottom: 10px; }
        .filter select { padding: 8px; border-radius: 5px; border: 1px solid #ddd; font-size: 13px; }
        .stats { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
        .stat-item { background: white; padding: 10px 15px; border-radius: 8px; font-size: 13px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
        .stat-label { color: #65676b; margin-right: 10px; }
        .stat-value { font-weight: bold; color: #1877f2; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 Facebook Bot Debugger</h1>
            <p>বটের সকল কার্যকলাপ রিয়েল-টাইমে দেখুন</p>
        </div>
        
        <div class="status-cards" id="status-cards">
            <div class="card">
                <h3>বট স্ট্যাটাস</h3>
                <div class="value" id="bot-status">চালু হচ্ছে...</div>
                <div class="small" id="bot-uptime"></div>
            </div>
            <div class="card">
                <h3>মোট ইভেন্ট</h3>
                <div class="value" id="total-events">0</div>
                <div class="small">মেসেজ + রিকোয়েস্ট</div>
            </div>
            <div class="card">
                <h3>মেসেজ</h3>
                <div class="value" id="total-messages">0</div>
                <div class="small">পাওয়া + পাঠানো</div>
            </div>
            <div class="card">
                <h3>ফ্রেন্ড</h3>
                <div class="value" id="total-friends">0</div>
                <div class="small">নতুন রিকোয়েস্ট</div>
            </div>
        </div>
        
        <div class="stats" id="stats"></div>
        
        <div class="logs">
            <div class="logs-header">
                <h2>📋 ডিবাগ লগ</h2>
                <div>
                    <select id="filter-type" onchange="filterLogs()">
                        <option value="all">সব লগ</option>
                        <option value="success">Success</option>
                        <option value="error">Error</option>
                        <option value="warning">Warning</option>
                        <option value="info">Info</option>
                        <option value="debug">Debug</option>
                    </select>
                    <button onclick="refreshLogs()">⟳ রিফ্রেশ</button>
                </div>
            </div>
            <div style="overflow-x: auto;">
                <table class="logs-table" id="logs-table">
                    <thead>
                        <tr>
                            <th>টাইপ</th>
                            <th>সময়</th>
                            <th>মেসেজ</th>
                            <th>ডাটা</th>
                        </tr>
                    </thead>
                    <tbody id="logs-body">
                        <tr><td colspan="4" style="text-align: center; padding: 50px;">লোড হচ্ছে...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="refresh">
            অটো-রিফ্রেশ: প্রতি ৫ সেকেন্ড | <span id="last-update">--:--:--</span>
        </div>
    </div>
    
    <script>
        let currentFilter = 'all';
        
        async function refreshLogs() {
            try {
                const response = await fetch('/debug');
                const data = await response.json();
                
                document.getElementById('bot-status').innerHTML = data.status === 'running' ? 
                    '<span class="success">✅ চালু</span>' : 
                    '<span class="error">❌ বন্ধ</span>';
                
                document.getElementById('bot-uptime').innerHTML = 'Uptime: ' + formatTime(data.uptime);
                document.getElementById('total-events').innerHTML = data.stats.total;
                document.getElementById('total-messages').innerHTML = data.stats.messages;
                document.getElementById('total-friends').innerHTML = data.stats.friendRequests;
                
                document.getElementById('last-update').innerHTML = new Date().toLocaleTimeString();
                
                // স্ট্যাটস
                const statsHtml = Object.entries(data.statsByType).map(([type, count]) => 
                    '<div class="stat-item"><span class="stat-label">' + type + ':</span> <span class="stat-value">' + count + '</span></div>'
                ).join('');
                document.getElementById('stats').innerHTML = statsHtml;
                
                // লগ টেবিল
                let logs = data.logs;
                if (currentFilter !== 'all') {
                    logs = logs.filter(log => log.type === currentFilter);
                }
                
                if (logs.length === 0) {
                    document.getElementById('logs-body').innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px;">কোন লগ নেই</td></tr>';
                } else {
                    let html = '';
                    logs.forEach(log => {
                        html += '<tr>' +
                            '<td><span class="log-type ' + log.type + '">' + log.type + '</span></td>' +
                            '<td class="timestamp">' + new Date(log.timestamp).toLocaleTimeString() + '</td>' +
                            '<td class="message-cell">' + log.message + '</td>' +
                            '<td class="data-cell">' + (log.data ? JSON.stringify(log.data).substring(0, 100) + (JSON.stringify(log.data).length > 100 ? '...' : '') : '-') + '</td>' +
                        '</tr>';
                    });
                    document.getElementById('logs-body').innerHTML = html;
                }
            } catch (e) {
                console.error(e);
            }
        }
        
        function formatTime(seconds) {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = Math.floor(seconds % 60);
            return h + 'h ' + m + 'm ' + s + 's';
        }
        
        function filterLogs() {
            currentFilter = document.getElementById('filter-type').value;
            refreshLogs();
        }
        
        // অটো-রিফ্রেশ
        setInterval(refreshLogs, 5000);
        refreshLogs();
    </script>
</body>
</html>`;
      
      res.end(html);
    }
    
    // JSON ডিবাগ ডাটা
    else if (req.url === '/debug') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      
      // স্ট্যাটস তৈরি
      const stats = {
        total: debugLogs.length,
        messages: debugLogs.filter(l => l.message.includes('মেসেজ')).length,
        friendRequests: debugLogs.filter(l => l.message.includes('ফ্রেন্ড')).length
      };
      
      const statsByType = {};
      debugLogs.forEach(l => {
        statsByType[l.type] = (statsByType[l.type] || 0) + 1;
      });
      
      res.end(JSON.stringify({
        status: api ? 'running' : 'starting',
        uptime: process.uptime(),
        userId: api ? api.getCurrentUserID() : null,
        logs: debugLogs.slice(-100).reverse(),
        stats: stats,
        statsByType: statsByType,
        timestamp: new Date().toISOString()
      }));
    }
    
    else {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    addDebug('success', `ডিবাগ সার্ভার চালু হয়েছে পোর্ট ${PORT}-এ`, { port: PORT });
  });
  
  return server;
}

// ========== মেইন বট কোড ==========

addDebug('info', 'বট চালু হচ্ছে...', { nodeVersion: process.version });

// appstate লোড
let appState;
try {
  if (!process.env.APPSTATE) {
    throw new Error('APPSTATE environment variable পাওয়া যায়নি');
  }
  appState = JSON.parse(process.env.APPSTATE);
  addDebug('success', 'appstate লোড করা হয়েছে', { 
    keys: appState.map(k => k.key),
    count: appState.length 
  });
} catch (e) {
  addDebug('error', 'appstate লোড করতে ব্যর্থ', { error: e.message });
  process.exit(1);
}

// কমান্ড লিস্ট
const COMMANDS = {
  "হ্যালো": "হ্যালো! কেমন আছেন?",
  "হাই": "হাই! কী খবর?",
  "কেমন আছ": "আলহামদুলিল্লাহ, ভালো আছি। আপনি?",
  "কেমন আছো": "আলহামদুলিল্লাহ, ভালো আছি। আপনি?",
  "কি খবর": "ভালো! আপনার দিন কেমন?",
  "ধন্যবাদ": "আপনাকেও ধন্যবাদ!",
  "বিদায়": "বিদায়! আবার কথা হবে।",
  "বাই": "বাই বাই! ভালো থাকবেন।",
  "help": "আমি বাংলায় কথা বলতে পারি! বলুন: হ্যালো, কেমন আছ, ধন্যবাদ, বিদায়",
  "default": "'help' লিখুন দেখি কি করতে পারি"
};

addDebug('info', 'কমান্ড লোড করা হয়েছে', { count: Object.keys(COMMANDS).length });

// লগইন অপশন
const loginOptions = {
  selfListen: false,
  listenEvents: true,
  online: true,
  autoMarkRead: true,
  forceLogin: true,
  logLevel: "info"
};

addDebug('info', 'লগইন অপশন সেট করা হয়েছে', loginOptions);

// লগইন
addDebug('info', 'Facebook-এ লগইন করার চেষ্টা করছি...');

login({ appState }, loginOptions, (err, api) => {
  if (err) {
    addDebug('error', 'লগইন ব্যর্থ', { 
      error: err.message,
      stack: err.stack 
    });
    
    // রিস্টার্ট
    setTimeout(() => {
      addDebug('warning', '৩০ সেকেন্ড পর রিস্টার্ট হচ্ছে...');
      process.exit(1);
    }, 30000);
    return;
  }

  currentAPI = api;
  const userID = api.getCurrentUserID();
  
  addDebug('success', 'বট সফলভাবে লগইন করেছে!', { 
    userId: userID,
    timestamp: new Date().toISOString()
  });

  // ডিবাগ সার্ভার শুরু
  startDebugServer(api);

  // প্রসেসিং ট্র্যাক করা
  const processing = new Set();
  const acceptedFriends = new Set();
  
  addDebug('info', 'লিসেনার চালু হচ্ছে...');

  // ========== লিসেনার ==========
  api.listen((err, event) => {
    if (err) {
      addDebug('error', 'লিসেনিং এ ঘটেছে', { error: err.message });
      return;
    }

    // ইভেন্ট লগ
    addDebug('debug', 'নতুন ইভেন্ট', { 
      type: event.type,
      hasBody: !!event.body,
      hasSender: !!event.senderID,
      hasUser: !!event.userID
    });

    try {
      // ---------- মেসেজ হ্যান্ডলার ----------
      if (event.type === "message" && event.body) {
        addDebug('info', 'মেসেজ পাওয়া গেছে', {
          from: event.senderID,
          body: event.body,
          length: event.body.length,
          isSelf: event.senderID === userID
        });
        
        // নিজের মেসেজ ইগনোর
        if (event.senderID === userID) {
          addDebug('debug', 'নিজের মেসেজ ইগনোর করা হয়েছে');
          return;
        }
        
        // ডুপ্লিকেট চেক
        if (processing.has(event.senderID)) {
          addDebug('debug', 'ইতিমধ্যে প্রসেসিং চলছে', { sender: event.senderID });
          return;
        }
        
        processing.add(event.senderID);
        addDebug('info', 'মেসেজ প্রসেসিং শুরু', { sender: event.senderID });
        
        // রিপ্লাই তৈরি
        let reply = COMMANDS.default;
        const msg = event.body.toLowerCase().trim();
        
        addDebug('debug', 'মেসেজ প্রসেসিং', { 
          original: event.body,
          processed: msg 
        });
        
        if (COMMANDS[msg]) {
          reply = COMMANDS[msg];
          addDebug('success', 'সরাসরি ম্যাচ পাওয়া গেছে', { 
            keyword: msg, 
            reply: reply 
          });
        } else {
          // অংশবিশেষ ম্যাচ
          for (const key in COMMANDS) {
            if (key !== "default" && msg.includes(key.toLowerCase())) {
              reply = COMMANDS[key];
              addDebug('success', 'আংশিক ম্যাচ পাওয়া গেছে', { 
                keyword: key, 
                reply: reply 
              });
              break;
            }
          }
        }
        
        // টাইপিং ইন্ডিকেটর
        api.sendTypingIndicator(event.senderID, true);
        addDebug('debug', 'টাইপিং ইন্ডিকেটর চালু');
        
        // ২ সেকেন্ড পর রিপ্লাই
        setTimeout(() => {
          api.sendMessage(reply, event.senderID, (sendErr) => {
            if (sendErr) {
              addDebug('error', 'রিপ্লাই পাঠাতে ব্যর্থ', { 
                sender: event.senderID,
                error: sendErr.message 
              });
            } else {
              addDebug('success', 'রিপ্লাই পাঠানো হয়েছে', { 
                sender: event.senderID,
                reply: reply 
              });
            }
            api.sendTypingIndicator(event.senderID, false);
            processing.delete(event.senderID);
            addDebug('debug', 'প্রসেসিং শেষ');
          });
        }, 2000);
      }
      
      // ---------- ফ্রেন্ড রিকোয়েস্ট ----------
      else if (event.type === "friend_request") {
        addDebug('warning', 'ফ্রেন্ড রিকোয়েস্ট পাওয়া গেছে', { 
          from: event.userID,
          timestamp: event.timestamp 
        });
        
        if (!acceptedFriends.has(event.userID)) {
          api.addFriend(event.userID, (addErr) => {
            if (addErr) {
              addDebug('error', 'ফ্রেন্ড রিকোয়েস্ট অ্যাপ্রুভ ব্যর্থ', { 
                user: event.userID,
                error: addErr.message 
              });
            } else {
              addDebug('success', 'ফ্রেন্ড রিকোয়েস্ট অ্যাপ্রুভ করা হয়েছে', { 
                user: event.userID 
              });
              acceptedFriends.add(event.userID);
              
              // ওয়েলকাম মেসেজ
              setTimeout(() => {
                api.sendMessage("👋 হ্যালো! আপনার ফ্রেন্ড রিকোয়েস্ট অ্যাপ্রুভ করা হয়েছে।", event.userID, (sendErr) => {
                  if (sendErr) {
                    addDebug('error', 'ওয়েলকাম মেসেজ ব্যর্থ', { user: event.userID });
                  } else {
                    addDebug('success', 'ওয়েলকাম মেসেজ পাঠানো হয়েছে', { user: event.userID });
                  }
                });
              }, 2000);
            }
          });
        } else {
          addDebug('debug', 'ইতিমধ্যে অ্যাপ্রুভ করা হয়েছে', { user: event.userID });
        }
      }
      
      // ---------- নতুন ফ্রেন্ড ----------
      else if (event.type === "log:subscribe" && event.addedParticipants) {
        event.addedParticipants.forEach(user => {
          if (user.userID && user.userID !== userID) {
            addDebug('success', 'নতুন ফ্রেন্ড অ্যাড হয়েছে', { 
              user: user.userID,
              name: user.name || 'অজানা'
            });
            
            setTimeout(() => {
              api.sendMessage("👋 হ্যালো! এখন থেকে আমরা ফ্রেন্ড।", user.userID, (sendErr) => {
                if (!sendErr) {
                  addDebug('success', 'ওয়েলকাম মেসেজ পাঠানো হয়েছে', { user: user.userID });
                }
              });
            }, 2000);
          }
        });
      }
      
      // ---------- অন্যান্য ইভেন্ট ----------
      else {
        addDebug('debug', 'অন্যান্য ইভেন্ট', { type: event.type });
      }
      
    } catch (handlerErr) {
      addDebug('error', 'ইভেন্ট হ্যান্ডলারে এরর', { 
        error: handlerErr.message,
        stack: handlerErr.stack 
      });
    }
  });
  
  addDebug('success', 'লিসেনার সফলভাবে চালু হয়েছে');
  
  // গ্রেসফুল শাটডাউন
  process.on("SIGINT", () => {
    addDebug('warning', 'বট বন্ধ হচ্ছে...');
    setTimeout(() => process.exit(0), 1000);
  });
  
  process.on("uncaughtException", (err) => {
    addDebug('error', 'Uncaught Exception', { 
      error: err.message,
      stack: err.stack 
    });
  });
  
  process.on("unhandledRejection", (reason) => {
    addDebug('error', 'Unhandled Rejection', { 
      reason: reason 
    });
  });
});
