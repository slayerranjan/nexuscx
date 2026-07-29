import "./schema";
import { db } from "./client";
import { id, createArticle, createConversation, addMessage, updateConversationResolution, assignAgent } from "./queries";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding NexusCX demo data...");

  db.exec(`
    DELETE FROM messages;
    DELETE FROM conversations;
    DELETE FROM article_chunks;
    DELETE FROM knowledge_articles;
    DELETE FROM agents;
    DELETE FROM organizations;
  `);

  const orgId = id();
  db.prepare(`INSERT INTO organizations (id, name) VALUES (?, ?)`).run(orgId, "Avtar Retail Co (Demo Workspace)");

  // ---- Agents ----
  const passwordHash = await bcrypt.hash("demo1234", 10);
  const insertAgent = db.prepare(
    `INSERT INTO agents (id, organization_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)`
  );
  const adminId = id();
  const agentId = id();
  insertAgent.run(adminId, orgId, "Ritika Shah", "admin@avtarretail.demo", passwordHash, "admin");
  insertAgent.run(agentId, orgId, "Devansh Rao", "agent@avtarretail.demo", passwordHash, "agent");

  // ---- Knowledge base ----
  const articles: Array<[string, string, string]> = [
    [
      "Order status and tracking",
      "Once your order ships, you'll receive a tracking link by email and SMS within 24 hours.\n\nMost orders are delivered within 3-5 business days for metro cities and 5-8 business days for other locations.\n\nIf your tracking link shows no movement for more than 48 hours, this usually means the courier hasn't scanned it yet — this resolves itself within a day in almost all cases. If it persists past 48 hours, this should be escalated to an agent to raise a courier inquiry.",
      "Orders",
    ],
    [
      "Return and refund policy",
      "Items can be returned within 7 days of delivery if unused and in original packaging. To start a return, go to Orders > select the item > Request Return.\n\nRefunds are processed within 5-7 business days after we receive the returned item, credited to the original payment method.\n\nSale items and innerwear are final sale and cannot be returned unless defective.",
      "Orders",
    ],
    [
      "Damaged or wrong item received",
      "If an item arrives damaged or you received the wrong product, this is not a standard return — do not direct the customer to the normal return flow.\n\nThis always needs human review to arrange a replacement or refund and to file a courier damage claim, so any message describing a damaged or incorrect item should be escalated to an agent with photos requested from the customer.",
      "Orders",
    ],
    [
      "Payment and billing",
      "We accept UPI, credit/debit cards, net banking, and cash on delivery for orders under 5000 rupees.\n\nIf a payment was deducted but the order shows as failed, the amount is auto-refunded within 5-7 business days by the bank. We do not hold customer funds.\n\nFor disputes about being charged twice or an incorrect amount, this should be escalated to an agent since it may require a manual reconciliation with the payment gateway.",
      "Payments",
    ],
    [
      "Changing or cancelling an order",
      "Orders can be cancelled for free within 1 hour of placing them, from Orders > Cancel Order.\n\nAfter 1 hour, the order may already be packed for shipping and cannot be guaranteed to cancel — in that case it can be refused at the doorstep or returned per the standard return policy.\n\nAddress or size changes after an order is placed are not supported through self-service and should be escalated to an agent if the order hasn't shipped yet.",
      "Orders",
    ],
    [
      "Shipping costs and free shipping",
      "Shipping is free on all orders above 999 rupees. Orders below that have a flat shipping fee of 79 rupees.\n\nExpress delivery (1-2 days, select cities only) is available at checkout for an additional 149 rupees.",
      "Orders",
    ],
    [
      "Account and login help",
      "You can log in using your registered email or phone number and an OTP — no password needed.\n\nIf OTPs aren't arriving, check that the number is correct and not blocking promotional SMS; OTP messages are sent from a transactional route and should not be blocked, but this can still happen with some carriers. If the customer still can't log in after trying again, escalate to an agent.",
      "Account",
    ],
    [
      "Loyalty points and rewards",
      "Members earn 1 point per 10 rupees spent. Points can be redeemed at checkout, 100 points = 50 rupees off.\n\nPoints expire 12 months after being earned if unused. Points from a returned or cancelled order are deducted automatically.",
      "Account",
    ],
  ];

  for (const [title, content, category] of articles) {
    createArticle({ organizationId: orgId, title, content, category });
  }

  // ---- Demo conversations (a mix of AI-resolved, escalated, and agent-resolved) ----

  // 1. AI-resolved: order tracking
  const c1 = createConversation({ organizationId: orgId, visitorName: "Ananya Desai" });
  addMessage({ conversationId: c1.id, sender: "visitor", content: "Hi, when will my order arrive? I ordered 3 days ago." });
  addMessage({
    conversationId: c1.id,
    sender: "ai",
    content: "Most orders arrive within 3-5 business days for metro cities. You should receive it soon — you can check the live tracking link sent to your email for the exact status.",
  });
  addMessage({ conversationId: c1.id, sender: "visitor", content: "Great, thank you!" });
  updateConversationResolution(c1.id, "ai_resolved", { topicTag: "Order tracking", sentiment: "positive" });

  // 2. AI-resolved: return policy
  const c2 = createConversation({ organizationId: orgId, visitorName: "Kabir Malhotra" });
  addMessage({ conversationId: c2.id, sender: "visitor", content: "Can I return a shirt I bought last week? It doesn't fit." });
  addMessage({
    conversationId: c2.id,
    sender: "ai",
    content: "Yes — items can be returned within 7 days of delivery if unused and in original packaging. Go to Orders, select the item, and choose Request Return. Refunds take 5-7 business days once we receive it.",
  });
  updateConversationResolution(c2.id, "ai_resolved", { topicTag: "Returns", sentiment: "neutral" });

  // 3. Escalated: damaged item, now assigned to an agent
  const c3 = createConversation({ organizationId: orgId, visitorName: "Priyanka Nair" });
  addMessage({ conversationId: c3.id, sender: "visitor", content: "The lamp I ordered arrived completely shattered. I want a replacement." });
  addMessage({
    conversationId: c3.id,
    sender: "ai",
    content: "I'm really sorry to hear that. Let me connect you with someone who can arrange a replacement and file a damage claim right away.",
    escalationFlag: true,
  });
  addMessage({ conversationId: c3.id, sender: "agent", content: "Hi Priyanka, so sorry about that — could you share a photo of the damage? I'll get a replacement shipped today." });
  updateConversationResolution(c3.id, "escalated", { topicTag: "Damaged item", sentiment: "negative" });
  assignAgent(c3.id, agentId);

  // 4. Escalated: billing dispute, still open/unassigned
  const c4 = createConversation({ organizationId: orgId, visitorName: "Rohan Bhatt" });
  addMessage({ conversationId: c4.id, sender: "visitor", content: "I was charged twice for order #48213. This needs to be fixed now." });
  addMessage({
    conversationId: c4.id,
    sender: "ai",
    content: "I understand the concern — a duplicate charge needs to be looked at by our team directly since it involves the payment gateway. I'm escalating this to an agent now.",
    escalationFlag: true,
  });
  updateConversationResolution(c4.id, "escalated", { topicTag: "Billing dispute", sentiment: "negative" });

  // 5. AI-resolved: shipping cost question
  const c5 = createConversation({ organizationId: orgId, visitorName: "Meher Chopra" });
  addMessage({ conversationId: c5.id, sender: "visitor", content: "Do you offer free shipping?" });
  addMessage({
    conversationId: c5.id,
    sender: "ai",
    content: "Yes — shipping is free on all orders above 999 rupees. Below that, there's a flat 79 rupee shipping fee. Express delivery is also available for select cities at checkout.",
  });
  updateConversationResolution(c5.id, "ai_resolved", { topicTag: "Shipping cost", sentiment: "positive" });

  // 6. Pending: currently open, no resolution yet
  const c6 = createConversation({ organizationId: orgId, visitorName: "Yash Kulkarni" });
  addMessage({ conversationId: c6.id, sender: "visitor", content: "Hi, I want to change the delivery address for my order placed 10 minutes ago." });
  addMessage({
    conversationId: c6.id,
    sender: "ai",
    content: "Since it's been under an hour, I can help — but address changes after checkout need an agent to update it before the order ships. Connecting you now.",
    escalationFlag: true,
  });

  console.log("Seed complete.");
  console.log("");
  console.log("Demo logins (password for all: demo1234):");
  console.log("  admin@avtarretail.demo  (Admin)");
  console.log("  agent@avtarretail.demo  (Agent)");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
