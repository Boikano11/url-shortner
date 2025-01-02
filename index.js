require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const dns = require('dns');
const { URL } = require('url');

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection error:", err));

// Define Schema
const { Schema } = mongoose;
const urlSchema = new Schema({
  original_url: {
    type: String,
    required: true,
  },
  short_url: {
    type: Number,
    required: true,
  },
});

// Create Model
const sURL = mongoose.model('Url', urlSchema);

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Validate URL using dns.lookup
const validateURLWithDNS = (clientUrl) => {
  return new Promise((resolve, reject) => {
    try {
      const { hostname } = new URL(clientUrl); // Parse hostname from URL
      dns.lookup(hostname, (err) => {
        if (err) {
          reject("invalid url");
        } else {
          resolve(true);
        }
      });
    } catch {
      reject("invalid url");
    }
  });
};

// Handle POST request to create short URL
app.post('/api/shorturl', async (req, res) => {
  const newUrl = req.body.url;

  try {
    await validateURLWithDNS(newUrl); // Validate using DNS lookup

    const existingURL = await sURL.findOne({ original_url: newUrl });
    if (existingURL) {
      return res.json({ original_url: existingURL.original_url, short_url: existingURL.short_url });
    }

    // Generate a unique short URL
    const shortUrl = Math.floor(Math.random() * 100000);
    const newEntry = new sURL({ original_url: newUrl, short_url: shortUrl });
    await newEntry.save();
    res.json({ original_url: newUrl, short_url: shortUrl });
  } catch (error) {
    res.json({ error });
  }
});

// Redirect using short URL
app.get('/api/shorturl/:new', async (req, res) => {
  const input = Number(req.params.new);

  if (isNaN(input)) {
    return res.status(400).json({ error: 'Invalid short URL format' });
  }

  try {
    const oldurl = await sURL.findOne({ short_url: input });

    if (!oldurl) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    res.redirect(oldurl.original_url);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
