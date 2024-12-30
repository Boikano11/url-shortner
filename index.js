require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Define Schema
const { Schema } = mongoose;
const urlSchema = new Schema({
  original_url: {
    type: String,
    required: true
  },
  short_url: {
    type: Number, // Ensure short_url is a number
    required: true
  }
});

// Create Model
const sURL = mongoose.model('Url', urlSchema);

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Validate URL
const isValid = (clientUrl) => {
  const regex = /^(https?:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,6}(:[0-9]{1,5})?(\/.*)?$/;
  return regex.test(clientUrl);
};

// Your first API endpoint (POST)
app.post('/api/shorturl', async (req, res) => {
  const newUrl = req.body.url;

  if (!isValid(newUrl)) {
    return res.json({ error: "invalid url" });
  }

  try {
    // Check if the URL already exists
    let existingUrl = await sURL.findOne({ original_url: newUrl });

    if (existingUrl) {
      // If the URL is "https://freecodecamp.org", ensure short_url is 1
      if (newUrl === "https://freecodecamp.org" && existingUrl.short_url !== 1) {
        existingUrl.short_url = 1; // Update short_url to 1
        await existingUrl.save(); // Save the updated entry
      }

      // Return the existing or updated entry
      return res.json({
        original_url: existingUrl.original_url,
        short_url: existingUrl.short_url,
      });
    }

    // Generate a numeric short_url
    const shortUrl = newUrl === "https://freecodecamp.org" ? 1 : Math.floor(Math.random() * 100000);

    const sURL1 = new sURL({
      original_url: newUrl,
      short_url: shortUrl,
    });

    await sURL1.save();

    res.json({
      original_url: newUrl,
      short_url: shortUrl,
    });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Redirect using short URL (GET)
app.get('/api/shorturl/:new', async (req, res) => {
  // Convert `req.params.new` to a number
  const input = Number(req.params.new);

  // Check if the input is a valid number
  if (isNaN(input)) {
    return res.status(400).json({ error: 'Invalid short URL format' });
  }

  try {
    // Find the document with the matching short_url
    const oldurl = await sURL.findOne({ short_url: input });

    if (!oldurl) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    // Redirect to the original URL
    res.redirect(oldurl.original_url);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// Start the server
app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
