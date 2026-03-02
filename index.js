const login = require("fca-unofficial-fixed");
const http = require("http");

console.log("🤖 বট চালু হচ্ছে...");

// appstate লোড
let appState;
try {
  appState = JSON.parse(process.env.APPSTATE);
  console.log("✅ appstate লোড করা হয়েছে");
} catch (e) {
  console.error("❌ appstate লোড করতে ব্যর্থ:", e.message);
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
  "help": "হ্যালো, কেমন আছ, ধন্যবাদ, বিদায় - এই কথাগুলো বলতে পারেন",
  "default": "'help' লিখুন দেখি কি করতে পারি"
};

// লগইন অপশন
const loginOptions = {
  selfListen: false,
  listenEvents: true,
  online: true,
  autoMarkRead: true,
  forceLogin: true,
  logLevel: "silent"
};

// লগইন
login({ appState }, loginOptions, (err, api) => {
  if (err) {
    console.error("❌ লগইন ব্যর্থ:", err.message);
    return;
  }

  const userID = api.getCurrentUserID();
  console.log("✅ বট লগইন করেছে!");
  console.log("👤 ইউজার আইডি:", userID);

  // হেলথ চেক সার্ভার
  const server = http.createServer((req, res) => {
    if (req.url === "/health" || req.url === "/") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ 
        status: "running", 
        userId: userID,
        uptime: process.uptime() 
      }));
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
  });
  
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`🌐 হেলথ চেক সার্ভার চলছে পোর্ট ${PORT}-এ`);
  });

  // প্রসেসিং ট্র্যাক রাখা
  const processing = new Set();
  const acceptedFriends = new Set();

  // ========== স্ট্যান্ডার্ড লিসেনার ==========
  api.listen((err, event) => {
    if (err) {
      console.error("❌ লিসেনিং এরর:", err.message);
      return;
    }

    try {
      // সব ইভেন্ট দেখি
      console.log("📨 ইভেন্ট টাইপ:", event.type);

      // ---------- মেসেজ হ্যান্ডলার ----------
      if (event.type === "message" && event.body) {
        // নিজের মেসেজ ইগনোর
        if (event.senderID === userID) return;
        
        console.log(`💬 ${event.senderID}: ${event.body}`);
        
        // ডুপ্লিকেট চেক
        if (processing.has(event.senderID)) return;
        
        processing.add(event.senderID);
        
        // রিপ্লাই তৈরি
        let reply = COMMANDS.default;
        const msg = event.body.toLowerCase().trim();
        
        if (COMMANDS[msg]) {
          reply = COMMANDS[msg];
        } else {
          for (const key in COMMANDS) {
            if (key !== "default" && msg.includes(key)) {
              reply = COMMANDS[key];
              break;
            }
          }
        }
        
        // টাইপিং ইন্ডিকেটর
        api.sendTypingIndicator(event.senderID, true);
        
        // ২ সেকেন্ড পর রিপ্লাই
        setTimeout(() => {
          api.sendMessage(reply, event.senderID, (sendErr) => {
            if (sendErr) {
              console.error("❌ রিপ্লাই ব্যর্থ:", sendErr.message);
            } else {
              console.log("✅ রিপ্লাই:", reply);
            }
            api.sendTypingIndicator(event.senderID, false);
            processing.delete(event.senderID);
          });
        }, 2000);
      }
      
      // ---------- ফ্রেন্ড রিকোয়েস্ট ----------
      if (event.type === "friend_request" && event.userID) {
        console.log("📩 ফ্রেন্ড রিকোয়েস্ট:", event.userID);
        
        if (!acceptedFriends.has(event.userID)) {
          api.addFriend(event.userID, (addErr) => {
            if (addErr) {
              console.error("❌ ফ্রেন্ড অ্যাপ্রুভ ব্যর্থ:", addErr.message);
            } else {
              console.log("✅ ফ্রেন্ড অ্যাপ্রুভড:", event.userID);
              acceptedFriends.add(event.userID);
              
              // ওয়েলকাম মেসেজ
              setTimeout(() => {
                api.sendMessage("👋 হ্যালো! আপনার ফ্রেন্ড রিকোয়েস্ট অ্যাপ্রুভ করা হয়েছে।", event.userID);
              }, 2000);
            }
          });
        }
      }
      
      // ---------- নতুন ফ্রেন্ড ----------
      if (event.type === "log:subscribe" && event.addedParticipants) {
        event.addedParticipants.forEach(user => {
          if (user.userID && user.userID !== userID) {
            console.log("👋 নতুন ফ্রেন্ড:", user.userID);
            setTimeout(() => {
              api.sendMessage("👋 হ্যালো! এখন থেকে আমরা ফ্রেন্ড।", user.userID);
            }, 2000);
          }
        });
      }
      
    } catch (error) {
      console.error("❌ ইভেন্ট প্রসেসিং এরর:", error.message);
    }
  });
  
  console.log("✅ লিসেনার চালু হয়েছে");
  
  // গ্রেসফুল শাটডাউন
  process.on("SIGINT", () => {
    console.log("⚠️ বট বন্ধ হচ্ছে...");
    process.exit(0);
  });
});
