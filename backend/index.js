import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const app = express();
app.use(cors());
app.use(express.json());

const SECRET = "supersecretkey";

// ===== Fake DB =====
let users = [];
let challenges = [
  { id: 1, text: "Drink 2L water today", done: 0, user: "system" }
];

// ===== Auth middleware =====
function auth(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// ===== Register =====
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Missing fields" });

  const exists = users.find(u => u.username === username);
  if (exists) return res.status(400).json({ error: "User exists" });

  const hashed = await bcrypt.hash(password, 10);
  users.push({ id: Date.now(), username, password: hashed });

  const token = jwt.sign({ username }, SECRET);
  res.json({ token });
});

// ===== Login =====
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (!user) return res.status(400).json({ error: "User not found" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: "Wrong password" });

  const token = jwt.sign({ username }, SECRET);
  res.json({ token });
});

// ===== Challenges =====
app.get("/challenges", (req, res) => {
  res.json(challenges);
});

app.post("/challenges", auth, (req, res) => {
  const newChallenge = {
    id: Date.now(),
    text: req.body.text,
    done: 0,
    user: req.user.username
  };
  challenges.unshift(newChallenge);
  res.json(newChallenge);
});

app.post("/challenges/:id/done", auth, (req, res) => {
  const challenge = challenges.find(c => c.id == req.params.id);
  if (challenge) challenge.done++;
  res.json(challenge);
});

app.listen(5000, () => console.log("Auth API running on http://localhost:5000"));
