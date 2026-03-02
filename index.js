const { login } = require("xnil-ypb-fca");
const fs = require("fs");
const path = require("path");
const http = require("http");

// কনফিগারেশন
const CONFIG = {
  SELF_LISTEN: false,
  LISTEN_EVENTS: true,
  ONLINE_STATUS: true,
  AUTO_MARK_READ: true,
  WELCOME_DELAY: 2000,
  REPLY_DELAY: 2000,
  CLEANUP_TIMEOUT: 600000,
  MAX_RETRIES: 3,
  DEBUG_MODE: false,  // presence স্প্যাম এড়াতে false
  LOG_ALL_EVENTS: false,  // presence লগ বন্ধ
};

// কমান্ড লিস্ট
const COMMANDS = {
  "হ্যালো": "হ্যালো! কেমন আছেন?",
  "হাই": "হাই! কী খবর?",
  "কেমন আছ": "আলহামদুলিল্লাহ, ভালো আছি। আপনি?",
  "কেমন আছো": "আলহামদুলিল্লাহ, ভালো আছি। আপনি?",
  "কি খবর": "ভালো! আপনার দিন কেমন?",
  "ধন্যবাদ": "আপনাকেও ধন্যবাদ!",
  "থ্যাংকস": "Welcome!",
  "বিদায়": "বিদায়! আবার কথা হবে।",
  "বাই": "বাই বাই! ভালো থাকবেন।",
  "help": "উপলব্ধ কমান্ড:\n• হ্যালো\n• কেমন আছ\n• ধন্যবাদ\n• বিদায়",
  "সাহায্য": "উপলব্ধ কমান্ড:\n• হ্যালো\n• কেমন আছ\n• ধন্যবাদ\n• বিদায়",
  "নাম কি": "আমার নাম বট। আপনার নাম কি?",
  "hello": "Hello! How are you?",
  "hi": "Hi there!",
  "how are you": "I'm fine, Alhamdulillah!",
  "thanks": "Welcome!",
  "bye": "Bye bye!",
  "name": "My name is Bot.",
  "default": "'help' লিখুন দেখি কি করতে পারি।"
};

function log(message, type = "INFO") {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
}

function loadAppState() {
  if (process.env.APPSTATE) {
    try {
      return JSON.parse(process.env.APPSTATE);
    } catch (e) {
      log(`❌ Environment appstate পার্স করতে ব্যর্থ: ${e.message}`, "ERROR");
      return null;
    }
  }
  return null;
}

function generateReply(message) {
  if (!message) return COMMANDS.default;
  const msg = message.toLowerCase().trim();
  
  if (COMMANDS[msg]) return COMMANDS[msg];
  
  for (const [key, value] of Object.entries(COMMANDS)) {
    if (key !== "default" && msg.includes(key.toLowerCase())) {
      return value;
    }
  }
  return COMMANDS.default;
}

// হেলথ সার্ভার
function startHealthServer(api) {
  const server = http.createServer((req, res) => {
    if (req.url === "/health" || req.url === "/") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        status: "active",
        bot: "running",
        userId: api ? api.getCurrentUserID() : "unknown",
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      }));
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
  });
  
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    log(`🌐 হেলথ চেক সার্ভার চলছে পোর্ট ${PORT}-এ`);
  });
  return server;
}

// মেইন ফাংশন
async function startBot() {
  log("🤖 বট চালু হচ্ছে...");
  
  const appState = loadAppState();
  if (!appState) {
    log("❌ appstate পাওয়া যায়নি!", "ERROR");
    process.exit(1);
  }
  
  // স্পেশাল অপশনস - এটা গুরুত্বপূর্ণ!
  const loginOptions = {
    selfListen: false,
    listenEvents: true,
    online: true,
    autoMarkRead: true,
    forceLogin: true,  // ফোর্স লগইন
    logLevel: "error",  // শুধু এরর দেখাবে
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
  };
  
  login({ appState }, loginOptions, (err, api) => {
    if (err) {
      log(`❌ লগইন ব্যর্থ: ${err.message}`, "ERROR");
      setTimeout(() => startBot(), 30000);
      return;
    }
    
    log("✅ বট লগইন করেছে!", "SUCCESS");
    const userID = api.getCurrentUserID();
    log(`👤 ইউজার আইডি: ${userID}`);
    
    startHealthServer(api);
    
    // প্রসেসড রেকর্ড
    const processed = new Set();
    const pendingReplies = new Set();
    
    // MQTT লিসেনার - সিম্পল ভার্সন
    api.listenMqtt((err, event) => {
      if (err) {
        log(`❌ লিসেনিং এরর: ${err.message}`, "ERROR");
        return;
      }
      
      // শুধু মেসেজ ইভেন্ট দেখি
      if (event.type === "message" || event.type === "message_new") {
        if (event.body && event.senderID && event.senderID !== userID) {
          log(`💬 মেসেজ: ${event.senderID} -> ${event.body}`, "INFO");
          
          // ডুপ্লিকেট চেক
          if (pendingReplies.has(event.senderID)) return;
          pendingReplies.add(event.senderID);
          
          const reply = generateReply(event.body);
          
          // টাইপিং ইন্ডিকেটর
          api.sendTypingIndicator(event.senderID, true);
          
          setTimeout(() => {
            api.sendMessage(reply, event.senderID, (sendErr) => {
              if (sendErr) {
                log(`❌ রিপ্লাই ব্যর্থ: ${sendErr.message}`, "ERROR");
              } else {
                log(`✅ রিপ্লাই: ${reply}`, "SUCCESS");
              }
              api.sendTypingIndicator(event.senderID, false);
              pendingReplies.delete(event.senderID);
            });
          }, 2000);
        }
      }
      
      // ফ্রেন্ড রিকোয়েস্ট হ্যান্ডলার
      else if (event.type === "friend_request" || event.type === "friend_req") {
        const requesterID = event.userID || event.from;
        if (requesterID && !processed.has(requesterID)) {
          log(`📩 ফ্রেন্ড রিকোয়েস্ট: ${requesterID}`, "INFO");
          
          api.addFriend(requesterID, (addErr) => {
            if (addErr) {
              log(`❌ অ্যাপ্রুভ ব্যর্থ: ${addErr.message}`, "ERROR");
            } else {
              log(`✅ ফ্রেন্ড অ্যাপ্রুভড: ${requesterID}`, "SUCCESS");
              processed.add(requesterID);
              
              // ওয়েলকাম মেসেজ
              setTimeout(() => {
                api.sendMessage("👋 হ্যালো! আপনার রিকোয়েস্ট অ্যাপ্রুভ করা হয়েছে।", requesterID);
              }, 2000);
            }
          });
        }
      }
      
      // নতুন ফ্রেন্ড
      else if (event.type === "log:subscribe") {
        const added = event.addedParticipants || [];
        added.forEach(user => {
          if (user.userID && user.userID !== userID) {
            log(`👋 নতুন ফ্রেন্ড: ${user.userID}`, "INFO");
            setTimeout(() => {
              api.sendMessage("👋 হ্যালো! এখন থেকে আমরা ফ্রেন্ড।", user.userID);
            }, 2000);
          }
        });
      }
    });
    
    // গ্রেসফুল শাটডাউন
    process.on("SIGINT", () => {
      log("⚠️ বট বন্ধ হচ্ছে...", "WARN");
      process.exit(0);
    });
  });
}

// স্টার্ট
startBot();
