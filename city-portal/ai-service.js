const db = require('./database');

// Simulated AI News Generator
function startAIService() {
    console.log('🤖 AI News Detection Service Started (Monitoring Villupuram Sources)...');

    // Simulate finding news every 30 seconds
    setInterval(() => {
        generateMockNews();
    }, 30000);

    // Initial generation
    generateMockNews();
}

function generateMockNews() {
    const topics = ['Transport', 'Politics', 'Weather', 'Education', 'Health'];
    const locations = ['Villupuram Bus Stand', 'Vikravandi', 'Tindivanam', 'Gingee Fort', 'Villupuram Medical College'];

    // Randomly generate a news item
    const topic = topics[Math.floor(Math.random() * topics.length)];
    const location = locations[Math.floor(Math.random() * locations.length)];

    const newsItem = {
        title: `AI Detected: Update regarding ${topic} near ${location}`,
        content: `Social media monitoring has detected a surge in posts regarding ${topic.toLowerCase()} activities near ${location}. Several users are reporting new developments. Waiting for official confirmation. Verify before publishing.`,
        category: topic,
        source: 'Twitter / Public Feeds',
        ai_summary: `Possible event detected at ${location} related to ${topic}. Confidence: High.`,
        importance: Math.random() > 0.8 ? 'High' : 'Normal', // 20% chance of high importance
        status: 'pending'
    };

    // Insert into DB
    db.run(`INSERT INTO news (title, content, status, category, source, ai_summary, importance) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [newsItem.title, newsItem.content, newsItem.status, newsItem.category, newsItem.source, newsItem.ai_summary, newsItem.importance],
        function (err) {
            if (err) {
                return console.error(err.message);
            }
            console.log(`[AI-AUTO] New potential news detected: ${newsItem.title} (ID: ${this.lastID})`);
        }
    );
}

module.exports = { startAIService };
