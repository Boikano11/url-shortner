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
    type: String,
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

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Validate URL
const isValid = (clientUrl) => {
  const regex = /^(https?:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,6}(:[0-9]{1,5})?(\/.*)?$/;
  return regex.test(clientUrl);
};

// Your first API endpoint (POST)
app.post('/api/shorturl', (req, res) => {
  const newUrl = req.body.url;

  if (!isValid(newUrl)) {
    return res.json({ error: "invalid url" });
  }

  // Generate a unique short URL
  const shortUrl = Math.floor(Math.random() * 100000); 

  const sURL1 = new sURL({
    original_url: newUrl,
    short_url: shortUrl
  });

  sURL1.save()
    .then(() => {
      res.json({
        original_url: newUrl,
        short_url: shortUrl,
      });
    })
    .catch(err => {
      console.error("Error saving URL:", err);
      res.status(500).json({ error: "Database error" });
    });
});

// Redirect using short URL (GET)
app.get('/api/shorturl/:new', async (req, res) => {
  const input = req.params.new;

  try {
    const oldurl = await sURL.findOne({ short_url: input });

    if (!oldurl) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    res.redirect(oldurl.original_url);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start the server
app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
