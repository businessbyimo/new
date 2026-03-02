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
  DEBUG_MODE: true,           // ডিবাগ মোড অন
  LOG_ALL_EVENTS: true,       // সব ইভেন্ট লগ করবে
};

// কমান্ড লিস্ট
const COMMANDS = {
  // বাংলা কমান্ড
  "হ্যালো": "হ্যালো! কেমন আছেন? আমি আপনার বট বন্ধু।",
  "হাই": "হাই! কী খবর?",
  "কেমন আছ": "আলহামদুলিল্লাহ, আমি ভালো আছি। আপনি কেমন আছেন?",
  "কেমন আছো": "আলহামদুলিল্লাহ, আমি ভালো আছি। আপনি কেমন আছেন?",
  "কি খবর": "একদম ভালো! আপনার দিন কাটছে কেমন?",
  "ধন্যবাদ": "আপনাকেও ধন্যবাদ! সবসময় পাশে আছি।",
  "থ্যাংকস": "ওয়েলকাম!",
  "বিদায়": "বিদায়! আবার কথা হবে। যত্নে থাকবেন!",
  "বাই": "বাই বাই! ভালো থাকবেন।",
  "help": "আমি কিছু কথা বলতে পারি:\n• হ্যালো\n• হাই\n• কেমন আছ\n• কি খবর\n• ধন্যবাদ\n• বিদায়/বাই\n• নাম কি",
  "সাহায্য": "আমি কিছু কথা বলতে পারি:\n• হ্যালো\n• হাই\n• কেমন আছ\n• কি খবর\n• ধন্যবাদ\n• বিদায়/বাই\n• নাম কি",
  "নাম কি": "আমার নাম বট। আপনার নাম কি?",
  
  // ইংরেজি কমান্ড
  "hello": "Hello! How are you?",
  "hi": "Hi there!",
  "how are you": "I'm fine, Alhamdulillah!",
  "thanks": "Welcome!",
  "thank you": "You're welcome!",
  "bye": "Bye bye! Take care.",
  "name": "My name is Bot. What's yours?",
  
  // ডিফল্ট রিপ্লাই
  "default": "আমি বুঝতে পারিনি। 'help' বা 'সাহায্য' লিখুন।"
};

// লগিং ফাংশন
function log(message, type = "INFO") {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
}

// অ্যাপস্টেট লোড
function loadAppState() {
  if (process.env.APPSTATE) {
    try {
      log("📦 Environment থেকে appstate লোড করছি...");
      return JSON.parse(process.env.APPSTATE);
    } catch (e) {
      log(`❌ Environment appstate পার্স করতে ব্যর্থ: ${e.message}`, "ERROR");
      return null;
    }
  }
  
  try {
    const appStatePath = path.join(__dirname, "appstate.json");
    if (fs.existsSync(appStatePath)) {
      log("📁 ফাইল থেকে appstate লোড করছি...");
      return JSON.parse(fs.readFileSync(appStatePath, "utf8"));
    }
  } catch (e) {
    log(`❌ ফাইল থেকে appstate লোড করতে ব্যর্থ: ${e.message}`, "ERROR");
  }
  
  return null;
}

// রিপ্লাই জেনারেট
function generateReply(message) {
  if (!message) return COMMANDS.default;
  
  const msg = message.toLowerCase().trim();
  log(`🔍 মেসেজ প্রসেস করছি: "${msg}"`, "DEBUG");
  
  // সরাসরি ম্যাচ
  if (COMMANDS[msg]) {
    log(`✅ সরাসরি ম্যাচ পাওয়া গেছে: ${msg}`, "DEBUG");
    return COMMANDS[msg];
  }
  
  // কমান্ডের অংশবিশেষ ম্যাচ
  for (const [key, value] of Object.entries(COMMANDS)) {
    if (key !== "default" && msg.includes(key.toLowerCase())) {
      log(`✅ আংশিক ম্যাচ পাওয়া গেছে: ${key} -> ${msg}`, "DEBUG");
      return value;
    }
  }
  
  log(`❌ কোন ম্যাচ পাওয়া যায়নি, ডিফল্ট রিপ্লাই দিচ্ছি`, "DEBUG");
  return COMMANDS.default;
}

// হেলথ চেক সার্ভার
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
    log("❌ appstate পাওয়া যায়নি! APPSTATE environment variable চেক করুন", "ERROR");
    process.exit(1);
  }
  
  const loginOptions = {
    selfListen: CONFIG.SELF_LISTEN,
    listenEvents: CONFIG.LISTEN_EVENTS,
    online: CONFIG.ONLINE_STATUS,
    autoMarkRead: CONFIG.AUTO_MARK_READ,
    forceLogin: false,
    logLevel: "info",  // লগ লেভেল
  };
  
  login({ appState }, loginOptions, (err, api) => {
    if (err) {
      log(`❌ লগইন ব্যর্থ: ${err.message}`, "ERROR");
      
      if (err.message && err.message.includes("session")) {
        log("⚠️ সেশন মেয়াদোত্তীর্ণ। নতুন appstate.json তৈরি করুন।", "WARN");
      }
      
      setTimeout(() => {
        log("🔄 রিস্টার্ট করার চেষ্টা করছি...");
        startBot();
      }, 30000);
      
      return;
    }
    
    log("✅ বট সফলভাবে লগইন করেছে!", "SUCCESS");
    const userID = api.getCurrentUserID();
    log(`👤 ইউজার আইডি: ${userID}`);
    
    // হেলথ সার্ভার শুরু
    startHealthServer(api);
    
    // স্টেট ম্যানেজমেন্ট
    const processedRequests = new Set();
    const pendingMessages = new Map();
    
    // লিসেনার সেটআপ
    const stopListening = api.listenMqtt((err, event) => {
      if (err) {
        log(`❌ লিসেনিং এরর: ${err.message}`, "ERROR");
        return;
      }
      
      // ডিবাগ: সব ইভেন্ট দেখি
      if (CONFIG.DEBUG_MODE) {
        log(`📨 ইভেন্ট পাওয়া গেছে: ${JSON.stringify({
          type: event.type,
          hasBody: !!event.body,
          hasSender: !!event.senderID,
          hasUser: !!event.userID,
          hasFrom: !!event.from
        })}`, "DEBUG");
      }
      
      try {
        // ========== ফ্রেন্ড রিকোয়েস্ট হ্যান্ডলার ==========
        if (event.type === "friend_request" || event.type === "friend_req" || 
            (event.type === "inbox" && event.from) || event.type === "msgr_friend_update") {
          
          const requesterID = event.userID || event.from || (event.actor && event.actor.id);
          
          if (requesterID && !processedRequests.has(requesterID)) {
            log(`📩 ফ্রেন্ড রিকোয়েস্ট পাওয়া গেছে: ${requesterID}`, "INFO");
            
            api.addFriend(requesterID, (addErr) => {
              if (addErr) {
                log(`❌ রিকোয়েস্ট অ্যাপ্রুভ করতে ব্যর্থ: ${addErr.message}`, "ERROR");
              } else {
                log(`✅ রিকোয়েস্ট অ্যাপ্রুভ করা হয়েছে: ${requesterID}`, "SUCCESS");
                processedRequests.add(requesterID);
                
                // ওয়েলকাম মেসেজ পাঠাই
                setTimeout(() => {
                  const welcomeMsg = `👋 হ্যালো! আপনার ফ্রেন্ড রিকোয়েস্ট অ্যাপ্রুভ করা হয়েছে।\n\n🤖 আমি একটি অটোমেটেড বট। আমাকে কিছু লিখুন:\n"হ্যালো" বা "help"`;
                  
                  api.sendMessage(welcomeMsg, requesterID, (sendErr) => {
                    if (sendErr) {
                      log(`❌ ওয়েলকাম মেসেজ ব্যর্থ: ${sendErr.message}`, "ERROR");
                    } else {
                      log(`✅ ওয়েলকাম মেসেজ পাঠানো হয়েছে: ${requesterID}`, "SUCCESS");
                    }
                  });
                }, CONFIG.WELCOME_DELAY);
                
                setTimeout(() => processedRequests.delete(requesterID), CONFIG.CLEANUP_TIMEOUT);
              }
            });
          }
        }
        
        // ========== নতুন ফ্রেন্ড হ্যান্ডলার ==========
        if (event.type === "log:subscribe" || event.type === "subscribe") {
          const addedUsers = event.addedParticipants || [];
          
          if (addedUsers.length > 0) {
            addedUsers.forEach(user => {
              if (user.userID && user.userID !== userID) {
                log(`👋 নতুন ফ্রেন্ড অ্যাড হয়েছে: ${user.userID}`, "INFO");
                
                setTimeout(() => {
                  const welcomeMsg = `👋 হ্যালো! এখন থেকে আমরা ফ্রেন্ড।\n\nআমি একটি বট। আমাকে কিছু লিখুন দেখি!`;
                  
                  api.sendMessage(welcomeMsg, user.userID, (sendErr) => {
                    if (sendErr) {
                      log(`❌ ওয়েলকাম মেসেজ ব্যর্থ: ${sendErr.message}`, "ERROR");
                    } else {
                      log(`✅ ওয়েলকাম মেসেজ পাঠানো হয়েছে: ${user.userID}`, "SUCCESS");
                    }
                  });
                }, CONFIG.WELCOME_DELAY);
              }
            });
          }
        }
        
        // ========== মেসেজ হ্যান্ডলার ==========
        if ((event.type === "message" || event.type === "message_new") && 
             event.body && 
             event.senderID !== userID) {
          
          const senderID = event.senderID;
          const msg = event.body;
          
          log(`💬 মেসেজ পেয়েছি (${senderID}): "${msg}"`, "INFO");
          
          // ডুপ্লিকেট চেক
          if (pendingMessages.has(senderID)) {
            log(`⏳ ইতিমধ্যে ${senderID} এর জন্য প্রসেসিং চলছে`, "DEBUG");
            return;
          }
          
          pendingMessages.set(senderID, true);
          
          // টাইপিং ইন্ডিকেটর
          api.sendTypingIndicator(senderID, true);
          
          // রিপ্লাই জেনারেট
          const reply = generateReply(msg);
          
          // রিপ্লাই পাঠাই
          setTimeout(() => {
            api.sendMessage(reply, senderID, (sendErr) => {
              if (sendErr) {
                log(`❌ রিপ্লাই পাঠাতে ব্যর্থ: ${sendErr.message}`, "ERROR");
              } else {
                log(`✅ রিপ্লাই পাঠানো হয়েছে: "${reply.substring(0, 50)}${reply.length > 50 ? '...' : ''}"`, "SUCCESS");
              }
              
              api.sendTypingIndicator(senderID, false);
              pendingMessages.delete(senderID);
            });
          }, CONFIG.REPLY_DELAY);
        }
        
        // ========== অন্যান্য ইভেন্ট লগ ==========
        if (CONFIG.LOG_ALL_EVENTS && !["message", "message_new", "friend_request", "log:subscribe"].includes(event.type)) {
          if (event.type) {
            log(`📌 অন্যান্য ইভেন্ট: ${event.type}`, "DEBUG");
          }
        }
        
      } catch (handlerErr) {
        log(`❌ ইভেন্ট হ্যান্ডলারে এরর: ${handlerErr.message}`, "ERROR");
      }
    });
    
    // গ্রেসফুল শাটডাউন
    process.on("SIGINT", () => {
      log("⚠️ বট বন্ধ করা হচ্ছে...", "WARN");
      if (stopListening) stopListening();
      process.exit(0);
    });
    
    process.on("SIGTERM", () => {
      log("⚠️ বট টারমিনেট হচ্ছে...", "WARN");
      if (stopListening) stopListening();
      process.exit(0);
    });
    
    // আনহ্যান্ডেল্ড এরর
    process.on("uncaughtException", (err) => {
      log(`❌ আনহ্যান্ডেল্ড এরর: ${err.message}`, "ERROR");
    });
    
    process.on("unhandledRejection", (reason) => {
      log(`❌ আনহ্যান্ডেল্ড রিজেকশন: ${reason}`, "ERROR");
    });
    
  });
}

// বট শুরু
startBot();
