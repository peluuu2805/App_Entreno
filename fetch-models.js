const fs = require('fs');
fetch('https://openrouter.ai/api/v1/models')
  .then(r => r.json())
  .then(data => {
    const models = data.data.map(m => m.id);
    const moonshot = models.filter(m => m.toLowerCase().includes('moonshot') || m.toLowerCase().includes('kimi'));
    console.log('MOONSHOT MODELS:', moonshot);
  });
