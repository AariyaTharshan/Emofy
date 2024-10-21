require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const User = require('./user.js');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 5000;
const OMDB = process.env.OMDB_API_KEY;
const apiKey = process.env.API_KEY;

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

let chatHistory = [];
let lastEmotion = '';

const generationConfig = {
  temperature: 2,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: 'text/plain',
};

const corsOptions = {
  origin: 'https://emofy-dev.vercel.app',
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type,Authorization'
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

function classifyEmotion(response) {
  const positiveKeywords = ['happy', 'joy', 'good', 'excited', 'positive'];
  const negativeKeywords = ['sad', 'angry', 'bad', 'negative', 'upset', 'sadness'];

  const lowerResponse = response.toLowerCase();
  
  let positiveCount = 0;
  let negativeCount = 0;

  positiveKeywords.forEach(word => {
    if (lowerResponse.includes(word)) {
      positiveCount++;
    }
  });

  negativeKeywords.forEach(word => {
    if (lowerResponse.includes(word)) {
      negativeCount++;
    }
  });

  if (positiveCount > negativeCount) {
    return 'positive';
  } else if (negativeCount > positiveCount) {
    return 'negative';
  } else {
    return 'neutral';
  }
}

app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10); // Hash the password before saving
    const newUser = new User({ 
      username, 
      password: hashedPassword, // Save the hashed password
      inputResponse: [],
      lastEmotion: 'neutral'
    });
    await newUser.save();
    return res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    console.error('Error during signup:', error);
    return res.status(500).json({ error: 'User registration failed.' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'None' 
    });
    return res.json({ message: 'Login successful!', token });
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ error: 'Login failed.' });
  }
});

const authenticateJWT = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ msg: 'No token' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ msg: 'Invalid token' });
    }
    req.userId = user.id;
    next();
  });
};

app.post('/analyze-sentiment', authenticateJWT, async (req, res) => {
  try {
    const inputTweet = req.body.tweet;
    const userId = req.userId;
    if (!inputTweet) {
      return res.status(400).json({ error: 'Tweet is required.' });
    }

    chatHistory.push({ role: 'user', parts: [{ text: inputTweet }] });

    const chatSession = model.startChat({
      generationConfig,
      history: chatHistory,
    });

    const result = await chatSession.sendMessage('');
    const response = result.response.text();

    chatHistory.push({ role: 'model', parts: [{ text: response }] });

    lastEmotion = classifyEmotion(response);

    const user = await User.findById(userId);
    
    if (user) {
      user.inputResponse.push([inputTweet, response]);
      user.lastEmotion = lastEmotion;
      await user.save();
    }

    return res.json({ sentiment: response, lastEmotion: lastEmotion });
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    return res.status(500).json({ error: 'Sentiment analysis failed.' });
  }
});

async function fetchMovies(emotion) {
  const genreKeywords = {
    positive: 'happy',
    negative: 'sad',
    neutral: 'Documentary',
  };

  const genres = genreKeywords[emotion.toLowerCase()] || 'Movie';
  const url = `https://www.omdbapi.com/?apikey=${OMDB}&s=${genres}&type=movie`;

  try {
    const response = await axios.get(url);
    const movies = response.data.Search ? response.data.Search.map(movie => ({
      title: movie.Title,
      poster: movie.Poster || null,
    })) : [];

    const topMovies = movies.sort((a, b) => b.rating - a.rating).slice(0, 10);

    return topMovies;
  } catch (error) {
    console.error('Error fetching movies:', error);
    return [];
  }
}

async function fetchBooks(emotion) {
  const emotionKeywords = {
    positive: 'happiness',
    negative: 'sadness',
    neutral: 'life',
  };

  const query = emotionKeywords[emotion.toLowerCase()];
  const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=10`;

  try {
    const response = await axios.get(url);
    const books = response.data.items.map(book => ({
      title: book.volumeInfo.title,
      coverImage: book.volumeInfo.imageLinks ? book.volumeInfo.imageLinks.thumbnail : null,
      author: book.volumeInfo.authors ? book.volumeInfo.authors.join(', ') : 'Unknown Author',
    }));
    return books;
  } catch (error) {
    console.error('Error fetching books:', error);
    return [];
  }
}

app.post('/recommend', authenticateJWT, async (req, res) => {
  try {
    if (!lastEmotion) {
      return res.status(400).json({ error: 'No emotion detected yet.' });
    }

    const movies = await fetchMovies(lastEmotion);
    const books = await fetchBooks(lastEmotion);

    return res.json({ emotion: lastEmotion, movies, books });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return res.status(500).json({ error: 'Recommendation failed.' });
  }
});

app.post('/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ message: 'Logout successful!' });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
