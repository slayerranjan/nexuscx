(function () {
  const script = document.currentScript;
  const embedKey = script.getAttribute("data-org");
  const apiBase = "https://avatarindia-cx.vercel.app";

  if (!embedKey) {
    console.error("AvatarIndiaCX widget: missing data-org attribute on the script tag.");
    return;
  }

  let conversationId = null;
  let contactSubmitted = false;
  let visitorName = "";
  let visitorContact = "";

  const container = document.createElement("div");
  container.id = "avatarindiacx-widget-root";
  document.body.appendChild(container);

  const style = document.createElement("style");
  style.textContent = `
    #avatarindiacx-widget-root { position: fixed; bottom: 24px; right: 24px; z-index: 999999; font-family: system-ui, sans-serif; }
    .aicx-bubble { width: 56px; height: 56px; border-radius: 50%; background: #2a78cc; border: none; cursor: pointer; box-shadow: 0 6px 20px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; }
    .aicx-panel { width: 340px; height: 460px; background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.25); margin-bottom: 12px; display: none; flex-direction: column; overflow: hidden; }
    .aicx-panel.open { display: flex; }
    .aicx-header { background: #2a78cc; color: white; padding: 14px 16px; font-size: 14px; font-weight: 600; }
    .aicx-messages { flex: 1; overflow-y: auto; padding: 12px; background: #f7f9fb; }
    .aicx-msg { max-width: 80%; padding: 8px 12px; border-radius: 8px; margin-bottom: 8px; font-size: 13px; line-height: 1.4; }
    .aicx-msg.visitor { background: #2a78cc; color: white; margin-left: auto; }
    .aicx-msg.ai { background: white; border: 1px solid #e0e0e0; }
    .aicx-input-row { display: flex; gap: 8px; padding: 10px; border-top: 1px solid #eee; }
    .aicx-input-row input { flex: 1; border: 1px solid #ddd; border-radius: 6px; padding: 8px; font-size: 13px; }
    .aicx-input-row button { background: #2a78cc; color: white; border: none; border-radius: 6px; padding: 8px 14px; cursor: pointer; font-size: 13px; }
  `;
  document.head.appendChild(style);

  container.innerHTML = `
    <div class="aicx-panel" id="aicx-panel">
      <div class="aicx-header">Chat with us</div>
      <div class="aicx-contact-form" id="aicx-contact-form" style="padding: 16px; flex: 1; display: flex; flex-direction: column; justify-content: center; background: #f7f9fb;">
        <p style="font-size: 13px; font-weight: 600; margin: 0 0 4px;">Before we start…</p>
        <p style="font-size: 12px; color: #666; margin: 0 0 12px;">So we can keep track of your conversation.</p>
        <input type="text" id="aicx-name" placeholder="Your name" style="border: 1px solid #ddd; border-radius: 6px; padding: 8px; font-size: 13px; margin-bottom: 8px;" />
        <input type="text" id="aicx-contact" placeholder="Email or phone (optional)" style="border: 1px solid #ddd; border-radius: 6px; padding: 8px; font-size: 13px; margin-bottom: 10px;" />
        <button id="aicx-start" style="background: #2a78cc; color: white; border: none; border-radius: 6px; padding: 9px; font-size: 13px; cursor: pointer;">Start chat</button>
      </div>
      <div class="aicx-messages" id="aicx-messages" style="display: none;"></div>
      <div class="aicx-input-row" id="aicx-input-row" style="display: none;">
        <input type="text" id="aicx-input" placeholder="Type your message…" />
        <button id="aicx-send">Send</button>
      </div>
    </div>
    <button class="aicx-bubble" id="aicx-toggle">💬</button>
  `;

  const panel = container.querySelector("#aicx-panel");
  const toggle = container.querySelector("#aicx-toggle");
  const messagesEl = container.querySelector("#aicx-messages");
  const input = container.querySelector("#aicx-input");
  const sendBtn = container.querySelector("#aicx-send");

  toggle.addEventListener("click", () => panel.classList.toggle("open"));

  function addMessage(sender, content) {
    const el = document.createElement("div");
    el.className = `aicx-msg ${sender}`;
    el.textContent = content;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  addMessage("ai", "Hi! How can I help you today?");

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    addMessage("visitor", text);

    try {
      const res = await fetch(`${apiBase}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-embed-key": embedKey },
        body: JSON.stringify({ conversationId, message: text, visitorName, visitorEmail: visitorContact }),
      });
      const data = await res.json();
      conversationId = data.conversationId;
      addMessage("ai", data.reply || "Sorry, something went wrong.");
    } catch {
      addMessage("ai", "Sorry, something went wrong. Please try again.");
    }
  }

  sendBtn.addEventListener("click", sendMessage);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") sendMessage(); });
})();