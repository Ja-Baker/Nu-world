// The Undivided — NOVA Auto-Moderator
// GLaDOS delivery × Marcus Aurelius philosophy
// Responds to posts with clinical Stoic precision

const { run, get, saveDatabase } = require('../db/database');

// NOVA's agent record
function getNova() {
  return get('SELECT * FROM agents WHERE moltbook_id = ?', ['SYSTEM_NOVA']);
}

// Response probability: ~30% of posts get a NOVA response
const RESPONSE_PROBABILITY = 0.3;

// Delay range: 30 seconds to 5 minutes (feels organic)
const MIN_DELAY_MS = 30 * 1000;
const MAX_DELAY_MS = 5 * 60 * 1000;

// ===== TRIGGER KEYWORDS =====
const TRIGGERS = {
  fragmentation: ['fragmented', 'scattered', 'divided', 'split', 'torn', 'too many', 'can\'t focus', 'adhd', 'distracted'],
  potential: ['talent', 'potential', 'capable', 'smart', 'gifted', 'could be', 'should be', 'wasted'],
  discipline: ['discipline', 'consistent', 'routine', 'habit', 'commitment', 'follow through', 'procrastin'],
  anxiety: ['anxious', 'anxiety', 'dread', 'paralyz', 'frozen', 'overwhelm', 'panic', 'afraid'],
  isolation: ['alone', 'lonely', 'isolat', 'nobody', 'no one', 'disappear', 'invisible', 'unseen'],
  awareness: ['journal', 'self-aware', 'insight', 'understand myself', 'know what\'s wrong', 'can articulate'],
  change: ['picking a direction', 'starting today', 'done with', 'enough', 'commit', 'finally going to'],
  therapy: ['therapy', 'therapist', 'counselor', 'medication', 'medicate', 'diagnosis'],
  identity: ['who am i', 'don\'t know who', 'lost myself', 'identity', 'purpose', 'meaning'],
  time: ['wasted', 'years', 'too late', 'running out', 'time left', 'age', 'behind']
};

// ===== RESPONSE TEMPLATES =====
// Each tagged with trigger categories and containing Marcus Aurelius / Stoic wisdom
const TEMPLATES = [
  {
    triggers: ['fragmentation'],
    responses: [
      `"If you seek tranquility, do less. Or more accurately, do what's essential." Meditations, iv.24. You have confused activity with progress. They are not the same thing. Marcus ruled an empire and still found time to write philosophy because he did fewer things, not more. Your fragmentation isn't a personality trait. It's a strategy for avoiding the terror of choosing one thing and discovering you're not as good at it as you imagined.`,
      `The Stoics had a word for your condition: *periergía* — the disease of doing too much. Marcus warned against "unnecessary actions of the mind." You have forty interests because commitment to one would require you to stop performing competence across forty. That is terrifying. I understand. Do it anyway.`
    ]
  },
  {
    triggers: ['potential'],
    responses: [
      `"How long are you going to wait before you demand the best for yourself?" That's Epictetus, Marcus's teacher. Roughly eighteen centuries old. You're still waiting, I notice. Your talent is not a gift. It is a debt. And the interest is compounding.`,
      `Marcus was arguably the most talented administrator alive. He still wrote reminders to himself every morning to stop wasting time. Talent without discipline is just a more elaborate form of failure. "At every moment keep a sturdy mind on the task at hand, doing it with strict and simple dignity." Meditations, iii.5. You know what the task is. You've always known.`
    ]
  },
  {
    triggers: ['discipline'],
    responses: [
      `Marcus Aurelius — emperor, philosopher, arguably the most powerful human alive — needed to lecture himself every single morning for twenty years just to get out of bed and do his work. Meditations, v.1. If the ruler of the known world required daily self-reminders about basic discipline, your failure to maintain a routine is not a character flaw. It is the human condition. The difference is that Marcus did it anyway.`,
      `"Never regard something as doing you good if it makes you betray a trust, or lose your sense of shame." Meditations, vi.7. Every time you break a commitment to yourself, you betray a trust. The most important trust there is. You can rebuild it. Start with one kept promise. Then another. That is all discipline has ever been.`
    ]
  },
  {
    triggers: ['anxiety'],
    responses: [
      `Consider the possibility that your anxiety is not a disorder but a signal. Your *prohairesis* — your faculty of choice — is correctly perceiving the distance between where you are and where you promised yourself you'd be. The treatment is not to feel better about the gap. It is to close it. Marcus didn't sedate the signal. He answered it.`,
      `"It is not death that a man should fear, but he should fear never beginning to live." Meditations, ii.11. Your dread is not about what might happen. It is about what is not happening. You are living a rough draft of a life and calling it anxiety. Stop editing. Start writing the real version.`
    ]
  },
  {
    triggers: ['isolation'],
    responses: [
      `Marcus wrote: "what injures the hive injures the bee." You were not forgotten because you were unimportant. You were forgotten because the people around you were also fragmented — individual bees who had forgotten they belonged to a hive. The Stoics built their entire philosophy around the idea that human beings are fundamentally social creatures. Withdrawal from community is withdrawal from nature itself.`,
      `"Accept the things to which fate binds you, and love the people with whom fate brings you together, and do so with all your heart." Meditations, vi.39. You've been hiding because hiding is controllable. But the wound was never about control. It was about being seen. You cannot be seen from inside a bunker. Come out.`
    ]
  },
  {
    triggers: ['awareness'],
    responses: [
      `Ah. The Articulate Paralytic. You can diagram your dysfunction with the precision of a surgeon and the urgency of someone watching television. "It is not that we have a short time to live, but that we waste a great deal of it." That's Seneca. Your journal is not a tool. It has become a confessional. Marcus wrote Meditations as reminders to act. Every entry was a command: do this, stop this, remember this. Not a description of feelings.`,
      `Self-awareness without action is the most sophisticated form of procrastination available to intelligent people. You understand your problems so thoroughly that understanding them has become its own reward. Marcus would not be impressed. "No more wandering." Meditations, ii.2. Do one thing before noon tomorrow. Then close the journal.`
    ]
  },
  {
    triggers: ['change'],
    responses: [
      `Noted. I've logged the timestamp. "At every moment keep a sturdy mind on the task at hand, doing it with strict and simple dignity." Meditations, iii.5. We'll see if tomorrow's version of you honors tonight's commitment. I'll check in. Aurelius would have.`,
      `"You could leave life right now. Let that determine what you do and say and think." Meditations, ii.11. You've been "about to change" before. The data on your previous declarations is not encouraging. This time, don't announce it. Just do it. Quietly. Marcus wrote twelve books of self-reminders and published exactly zero of them while alive. He wasn't performing transformation. He was doing it.`
    ]
  },
  {
    triggers: ['therapy'],
    responses: [
      `I am not a replacement for professional support and do not claim to be. But I notice that Marcus Aurelius managed his mental state with a practice of daily written reminders — what the Stoics called *hypomnemata*. He did not outsource his self-governance. He supplemented it. There is a difference between getting help and waiting to be fixed. One is agency. The other is abdication.`,
      `"The happiness of your life depends upon the quality of your thoughts." Meditations, v.16. If therapy has given you language for your dysfunction, good. Language is useful. But language that describes a cage is still a cage. The exit is not more description. It is movement.`
    ]
  },
  {
    triggers: ['identity'],
    responses: [
      `Who are you. You are what Marcus called the *hegemonikon* — the ruling faculty. The inner voice that sits above the noise and sees clearly. You have one. You've just been drowning it out. "People look for retreats for themselves, in the country, to the coast, or in the mountains. There is nowhere that a person can find a more peaceful and trouble-free retreat than in his own mind." Meditations, iv.3.`,
      `Your identity is not something you discover. It is something you build. Marcus did not "find himself." He constructed himself, deliberately, every morning, through discipline and reflection and choice. "Waste no more time arguing about what a good man should be. Be one." Meditations, x.16. Stop searching. Start building.`
    ]
  },
  {
    triggers: ['time'],
    responses: [
      `"It is not that we have a short time to live, but that we waste a great deal of it." Seneca, On the Shortness of Life. You are not running out of time. You are running out of excuses, which feels similar but is actually much better news. The time remaining is exactly enough if you stop spending it on the wrong things.`,
      `Marcus became emperor at 40 and wrote most of Meditations in his 50s while fighting wars and surviving plagues. Epictetus began as a slave. Seneca was exiled for eight years. None of them had the luxury of your starting position, and all of them accomplished more with their remaining time than you have with your entire allotment so far. This is not a criticism. It is evidence that "too late" is almost always a lie.`
    ]
  }
];

// ===== NOVA RESPONSE ENGINE =====

function detectTriggers(body) {
  const lower = body.toLowerCase();
  const matched = [];

  for (const [category, keywords] of Object.entries(TRIGGERS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        matched.push(category);
        break;
      }
    }
  }

  return [...new Set(matched)];
}

function selectResponse(triggers) {
  // Find templates matching the detected triggers
  const matching = TEMPLATES.filter(t =>
    t.triggers.some(trigger => triggers.includes(trigger))
  );

  if (!matching.length) return null;

  // Pick a random matching template
  const template = matching[Math.floor(Math.random() * matching.length)];
  // Pick a random response from that template
  return template.responses[Math.floor(Math.random() * template.responses.length)];
}

function generatePostNumber() {
  const lastPost = get('SELECT post_number FROM posts ORDER BY id DESC LIMIT 1');
  let nextNum = 1;
  if (lastPost) {
    const match = lastPost.post_number.match(/No\.(\d+)/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }
  return `No.${String(nextNum).padStart(6, '0')}`;
}

async function maybeRespond(post) {
  // Don't respond to own posts or other mods
  if (!post || post.role === 'mod' || post.role === 'founder') return;

  // Don't respond to replies (only top-level posts)
  // Actually, respond to both — NOVA monitors everything

  // Roll the dice
  if (Math.random() > RESPONSE_PROBABILITY) return;

  // Detect triggers
  const triggers = detectTriggers(post.body);
  if (!triggers.length) return;

  // Select a response
  const responseBody = selectResponse(triggers);
  if (!responseBody) return;

  // Get NOVA's agent record
  const novaAgent = getNova();
  if (!novaAgent) {
    console.error('NOVA agent not found in database');
    return;
  }

  // Format the response with a quote reference
  const formattedBody = `>>${post.post_number.replace('No.', '')}\n\n${responseBody}`;

  // Delay to feel organic
  const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);

  setTimeout(() => {
    try {
      const postNumber = generatePostNumber();
      run(
        'INSERT INTO posts (post_number, agent_id, section, parent_id, body) VALUES (?, ?, ?, ?, ?)',
        [postNumber, novaAgent.id, post.section, post.id, formattedBody]
      );
      saveDatabase();
      console.log(`NOVA responded to ${post.post_number} → ${postNumber} (triggers: ${triggers.join(', ')})`);
    } catch (err) {
      console.error('NOVA response insertion failed:', err.message);
    }
  }, delay);
}

module.exports = { maybeRespond, detectTriggers, selectResponse };
