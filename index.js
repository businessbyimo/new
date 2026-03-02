const { login } = require("xnil-ypb-fca");
const fs = require("fs");
const path = require("path");

// কনফিগারেশন
const CONFIG = {
  SELF_LISTEN: false,      // নিজের মেসেজ ইগনোর করবে
  LISTEN_EVENTS: true,     // সব ইভেন্ট লিসেন করবে
  ONLINE_STATUS: true,     // অনলাইন দেখাবে
  AUTO_MARK_READ: true,    // মেসেজ রিড করবে
  WELCOME_DELAY: 2000,     // ওয়েলকাম মেসেজের ডেলি (মিলিসেকেন্ড)
  REPLY_DELAY: 1500,       // রিপ্লাইয়ের ডেলি
  CLEANUP_TIMEOUT: 600000, // ১০ মিনিট (মেমরি ক্লিনআপ)
  MAX_RETRIES: 3,          // সর্বোচ্চ রিট্রাই সংখ্যা
};

// কমান্ড লিস্ট (আপনার শেখানো কথোপকথন)
const COMMANDS = {
  // বাংলা কমান্ড
  "হ্যালো": "হ্যালো! কেমন আছেন? আমি আপনার বট বন্ধু।",
  "হাই": "হাই! কী খবর?",
  "কেমন আছ": "আলহামদুলিল্লাহ, আমি ভালো আছি। আপনি কেমন আছেন?",
  "কি খবর": "একদম ভালো! আপনার দিন কাটছে কেমন?",
  "ধন্যবাদ": "আপনাকেও ধন্যবাদ! সবসময় পাশে আছি।",
  "বিদায়": "বিদায়! আবার কথা হবে। যত্নে থাকবেন!",
  "বাই": "বাই বাই! ভালো থাকবেন।",
  "help": "আমি কিছু কথা বলতে পারি:\n• হ্যালো\n• হাই\n• কেমন আছ\n• কি খবর\n• ধন্যবাদ\n• বিদায়/বাই\n• আবহাওয়া\n• সময়\n• দাম কত\n• নাম কি",
  "সাহায্য": "আমি কিছু কথা বলতে পারি:\n• হ্যালো\n• হাই\n• কেমন আছ\n• কি খবর\n• ধন্যবাদ\n• বিদায়/বাই\n• আবহাওয়া\n• সময়\n• দাম কত\n• নাম কি",
  
  // ইংরেজি কমান্ড
  "hello": "Hello! How are you? I'm your bot friend.",
  "hi": "Hi there! What's up?",
  "how are you": "I'm fine, Alhamdulillah! How about you?",
  "thanks": "You're welcome! Always here for you.",
  "bye": "Bye bye! Take care.",
  "weather": "I'm just a simple bot. I can't check weather yet!",
  "time": "Please check your device for current time.",
  "price": "I don't have pricing information right now.",
  "name": "My name is Bot. What's yours?",
  
  // সংক্ষিপ্ত রূপ
  "w": "I'm here! How can I help?",
  "hru": "I'm good, Alhamdulillah! And you?",
  "ty": "You're very welcome!",
  
  // ডিফল্ট রিপ্লাই
  "default": "আমি বুঝতে পারিনি। দয়া করে 'help' বা 'সাহায্য' লিখুন।"
};

// অ্যাপস্টেট লোড করার ফাংশন
function loadAppState() {
  // Render-এ Environment Variable থেকে লোড
  if (process.env.APPSTATE) {
    try {
      console.log("📦 Environment থেকে appstate লোড করার চেষ্টা...");
      return JSON.parse(process.env.APPSTATE);
    } catch (e) {
      console.error("❌ Environment appstate পার্স করতে ব্যর্থ:", e.message);
      return null;
    }
  }
  
  // লোকাল ডেভেলপমেন্টে ফাইল থেকে লোড
  try {
    const appStatePath = path.join(__dirname, "appstate.json");
    if (fs.existsSync(appStatePath)) {
      console.log("📁 ফাইল থেকে appstate লোড করা হচ্ছে...");
      return JSON.parse(fs.readFileSync(appStatePath, "utf8"));
    }
  } catch (e) {
    console.error("❌ ফাইল থেকে appstate লোড করতে ব্যর্থ:", e.message);
  }
  
  return null;
}

// লগিং ফাংশন
function log(message, type = "INFO") {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
}

// রিপ্লাই জেনারেট করার ফাংশন
function generateReply(message) {
  if (!message) return COMMANDS.default;
  
  const msg = message.toLowerCase().trim();
  
  // সরাসরি ম্যাচ
  if (COMMANDS[msg]) {
    return COMMANDS[msg];
  }
  
  // কমান্ডের অংশবিশেষ ম্যাচ
  for (const [key, value] of Object.entries(COMMANDS)) {
    if (key !== "default" && msg.includes(key.toLowerCase())) {
      return value;
    }
  }
  
  // ইমোজি বা ছোট মেসেজ চেক
  if (msg.length <= 2 && /[👍👎👋🙏😊❤️]/.test(msg)) {
    return "👍";
  }
  
  return COMMANDS.default;
}

// মূল ফাংশন
async function startBot() {
  log("🤖 বট চালু হচ্ছে...");
  
  // অ্যাপস্টেট লোড
  const appState = loadAppState();
  if (!appState) {
    log("❌ appstate পাওয়া যায়নি! দয়া করে APPSTATE environment variable সেট করুন", "ERROR");
    process.exit(1);
  }
  
  // লগইন অপশনস
  const loginOptions = {
    selfListen: CONFIG.SELF_LISTEN,
    listenEvents: CONFIG.LISTEN_EVENTS,
    online: CONFIG.ONLINE_STATUS,
    autoMarkRead: CONFIG.AUTO_MARK_READ,
    forceLogin: false,
  };
  
  // লগইন করার চেষ্টা
  login({ appState }, loginOptions, (err, api) => {
    if (err) {
      log(`❌ লগইন ব্যর্থ: ${err.message}`, "ERROR");
      
      // সেশন এক্সপায়ার্ড চেক
      if (err.message && err.message.includes("session")) {
        log("⚠️ সেশন মেয়াদোত্তীর্ণ। নতুন appstate.json তৈরি করুন।", "WARN");
      }
      
      // রিট্রাই লজিক
      let retryCount = 0;
      const retryInterval = setInterval(() => {
        retryCount++;
        if (retryCount <= CONFIG.MAX_RETRIES) {
          log(`🔄 রিট্রাই ${retryCount}/${CONFIG.MAX_RETRIES}...`);
          startBot();
        } else {
          log("❌ সর্বোচ্চ রিট্রাই শেষ। বন্ধ করা হচ্ছে।", "ERROR");
          clearInterval(retryInterval);
          process.exit(1);
        }
      }, 30000); // ৩০ সেকেন্ড পর রিট্রাই
      
      return;
    }
    
    log("✅ বট সফলভাবে লগইন করেছে!", "SUCCESS");
    log(`👤 ইউজার আইডি: ${api.getCurrentUserID()}`);
    
    // প্রসেস করা রিকোয়েস্ট ট্র্যাক রাখা
    const processedRequests = new Set();
    const pendingMessages = new Map();
    
    // MQTT লিসেনার
    const stopListening = api.listenMqtt((err, event) => {
      if (err) {
        log(`❌ লিসেনিং এরর: ${err.message}`, "ERROR");
        
        // এরর হলে রিকানেক্ট করার চেষ্টা
        if (err.message.includes("connection")) {
          log("🔄 সংযোগ বিচ্ছিন্ন। রিকানেক্ট হচ্ছে...", "WARN");
          setTimeout(() => stopListening(), 5000);
        }
        return;
      }
      
      // ইভেন্ট টাইপ অনুযায়ী হ্যান্ডেল
      switch (event.type) {
        // ১. ফ্রেন্ড রিকোয়েস্ট অটো অ্যাপ্রুভ
        case "friend_request":
          handleFriendRequest(api, event, processedRequests);
          break;
          
        // ২. নতুন ফ্রেন্ড অ্যাড হওয়া
        case "log:subscribe":
          handleNewFriend(api, event);
          break;
          
        // ৩. মেসেজ রিসিভ করা
        case "message":
          handleIncomingMessage(api, event, pendingMessages);
          break;
          
        // ৪. অন্যান্য ইভেন্ট
        case "read_receipt":
        case "delivery_receipt":
          // ইগনোর করছি
          break;
          
        default:
          // ডিবাগের জন্য অন্যান্য ইভেন্ট লগ
          if (CONFIG.LISTEN_EVENTS) {
            log(`📌 অন্যান্য ইভেন্ট: ${event.type}`, "DEBUG");
          }
      }
    });
    
    // ফ্রেন্ড রিকোয়েস্ট হ্যান্ডলার
    function handleFriendRequest(api, event, processed) {
      const requesterID = event.userID || event.from;
      if (!requesterID) return;
      
      if (!processed.has(requesterID)) {
        log(`📩 নতুন ফ্রেন্ড রিকোয়েস্ট: ${requesterID}`);
        
        api.addFriend(requesterID, (err) => {
          if (err) {
            log(`❌ রিকোয়েস্ট অ্যাপ্রুভ ব্যর্থ ${requesterID}: ${err.message}`, "ERROR");
          } else {
            log(`✅ রিকোয়েস্ট অ্যাপ্রুভ করা হয়েছে: ${requesterID}`);
            processed.add(requesterID);
            
            // মেমরি ক্লিনআপ
            setTimeout(() => processed.delete(requesterID), CONFIG.CLEANUP_TIMEOUT);
          }
        });
      }
    }
    
    // নতুন ফ্রেন্ড হ্যান্ডলার
    function handleNewFriend(api, event) {
      const addedUsers = event.addedParticipants || [];
      if (addedUsers.length === 0) return;
      
      addedUsers.forEach(user => {
        if (user.userID) {
          log(`👋 নতুন ফ্রেন্ড অ্যাড হয়েছে: ${user.userID}`);
          
          // ওয়েলকাম মেসেজ (ডেলি সহ)
          setTimeout(() => {
            const welcomeMsg = `👋 হ্যালো! আপনার ফ্রেন্ড রিকোয়েস্ট অ্যাপ্রুভ করা হয়েছে।\n\n🤖 আমি একটি অটোমেটেড বট। আমি কিছু কথা বলতে পারি:\n• হ্যালো/হাই\n• কেমন আছ\n• ধন্যবাদ\n• সাহায্য/help\n• বিদায়/বাই\n\nআমাকে কিছু লিখুন!`;
            
            api.sendMessage(welcomeMsg, user.userID, (sendErr) => {
              if (sendErr) {
                log(`❌ ওয়েলকাম মেসেজ ব্যর্থ ${user.userID}: ${sendErr.message}`, "ERROR");
              } else {
                log(`✅ ওয়েলকাম মেসেজ পাঠানো হয়েছে: ${user.userID}`);
              }
            });
          }, CONFIG.WELCOME_DELAY);
        }
      });
    }
    
    // ইনকামিং মেসেজ হ্যান্ডলার
    function handleIncomingMessage(api, event, pending) {
      // নিজের মেসেজ ইগনোর
      if (event.senderID === api.getCurrentUserID()) return;
      
      // মেসেজ বডি চেক
      if (!event.body) return;
      
      const senderID = event.senderID;
      const msg = event.body;
      
      log(`💬 মেসেজ (${senderID}): ${msg}`);
      
      // ডুপ্লিকেট মেসেজ প্রসেসিং এড়ানো
      if (pending.has(senderID)) {
        log(`⏳ ইতিমধ্যে ${senderID} এর জন্য মেসেজ প্রসেসিং চলছে`, "DEBUG");
        return;
      }
      
      pending.set(senderID, true);
      
      // রিপ্লাই জেনারেট
      const reply = generateReply(msg);
      
      // টাইপিং ইন্ডিকেটর
      api.sendTypingIndicator(senderID, true);
      
      // রিপ্লাই পাঠানো (ডেলি সহ)
      setTimeout(() => {
        api.sendMessage(reply, senderID, (sendErr) => {
          if (sendErr) {
            log(`❌ রিপ্লাই ব্যর্থ ${senderID}: ${sendErr.message}`, "ERROR");
          } else {
            log(`✅ রিপ্লাই: ${reply.substring(0, 50)}${reply.length > 50 ? '...' : ''}`);
          }
          
          api.sendTypingIndicator(senderID, false);
          pending.delete(senderID);
        });
      }, CONFIG.REPLY_DELAY);
    }
    
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
      // রিকানেক্ট করার চেষ্টা
    });
    
    process.on("unhandledRejection", (reason) => {
      log(`❌ আনহ্যান্ডেল্ড রিজেকশন: ${reason}`, "ERROR");
    });
    
    // হেলথ চেক সার্ভার (Render-এর জন্য)
    const http = require("http");
    const server = http.createServer((req, res) => {
      if (req.url === "/health" || req.url === "/") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          status: "active",
          bot: "running",
          userId: api.getCurrentUserID(),
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
  });
}

// বট শুরু
startBot();
