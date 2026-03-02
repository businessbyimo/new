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

// লগইন অপশন
const loginOptions = {
  selfListen: false,
  listenEvents: true,
  online: true,
  autoMarkRead: true,
  forceLogin: true,
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
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "running", userId: userID }));
  });
  
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`🌐 হেলথ চেক সার্ভার চলছে পোর্ট ${PORT}-এ`);
  });

  // কমান্ড লিস্ট
  const COMMANDS = {
    "হ্যালো": "হ্যালো! কেমন আছেন?",
    "হাই": "হাই! কী খবর?",
    "কেমন আছ": "আলহামদুলিল্লাহ, ভালো আছি। আপনি?",
    "কি খবর": "ভালো! আপনার দিন কেমন?",
    "ধন্যবাদ": "আপনাকেও ধন্যবাদ!",
    "বিদায়": "বিদায়! আবার কথা হবে।",
    "বাই": "বাই বাই! ভালো থাকবেন।",
    "help": "কমান্ড: হ্যালো, কেমন আছ, ধন্যবাদ, বিদায়",
    "default": "'help' লিখুন"
  };

  const processedReqs = new Set();
  const processing = new Set();

  // মেইন লিসেনার
  api.listenMqtt((err, event) => {
    if (err) {
      console.error("❌ লিসেনিং এরর:", err.message);
      return;
    }

    // ইভেন্ট লগ
    console.log("📨 ইভেন্ট টাইপ:", event.type);

    // মেসেজ হ্যান্ডলার
    if (event.type === "message" && event.body && event.senderID !== userID) {
      console.log(`💬 মেসেজ: ${event.body}`);
      
      if (!processing.has(event.senderID)) {
        processing.add(event.senderID);
        
        let reply = COMMANDS.default;
        const msg = event.body.toLowerCase().trim();
        
        if (COMMANDS[msg]) reply = COMMANDS[msg];
        else {
          for (const key in COMMANDS) {
            if (msg.includes(key)) {
              reply = COMMANDS[key];
              break;
            }
          }
        }
        
        api.sendTypingIndicator(event.senderID, true);
        
        setTimeout(() => {
          api.sendMessage(reply, event.senderID, (sendErr) => {
            if (!sendErr) console.log("✅ রিপ্লাই:", reply);
            api.sendTypingIndicator(event.senderID, false);
            processing.delete(event.senderID);
          });
        }, 2000);
      }
    }

    // ফ্রেন্ড রিকোয়েস্ট
    if (event.type === "friend_request" && event.userID) {
      console.log("📩 ফ্রেন্ড রিকোয়েস্ট:", event.userID);
      
      if (!processedReqs.has(event.userID)) {
        api.addFriend(event.userID, (addErr) => {
          if (!addErr) {
            console.log("✅ ফ্রেন্ড অ্যাপ্রুভড");
            processedReqs.add(event.userID);
            setTimeout(() => {
              api.sendMessage("👋 হ্যালো! আপনার রিকোয়েস্ট অ্যাপ্রুভ করা হয়েছে।", event.userID);
            }, 2000);
          }
        });
      }
    }
  });
});
