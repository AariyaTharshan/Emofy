import React, { useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';

const Chat = () => {
  const [tweet, setTweet] = useState('');
  const [sentiment, setSentiment] = useState(null);
  const [emotion, setEmotion] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleAnalyzeSentiment = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post('https://emofy-lxvt.onrender.com/analyze-sentiment', { tweet }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      });
      setSentiment(response.data.sentiment);
      setEmotion(response.data.lastEmotion);
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      setErrorMessage('Sentiment analysis failed. Please try again.');
    }
  };

  const handleFetchRecommendations = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post('https://emofy-lxvt.onrender.com/recommend', {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      console.log('API Response:', response.data);


      if (response.data && response.data.emotion) {
        setRecommendations({
          emotion: response.data.emotion,
          movies: response.data.movies,
          books: response.data.books || [],
        });
      } else {
        setErrorMessage('No recommendations found.');
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setErrorMessage('Fetching recommendations failed.');
    }
  };

  return (
    <div className="container my-5">
      <h2 className="text-center mb-4">Sentiment & Recommendation System</h2>

      <div className="mb-4">
        <label className="form-label">Enter Tweet for Sentiment Analysis:</label>
        <textarea
          className="form-control"
          rows="3"
          value={tweet}
          onChange={(e) => setTweet(e.target.value)}
        ></textarea>
      </div>

      <button className="btn btn-primary" onClick={handleAnalyzeSentiment}>
        Analyze Sentiment
      </button>

      {errorMessage && (
        <div className="alert alert-danger mt-3">{errorMessage}</div>
      )}

      {sentiment && (
        <div className="mt-4">
          <h4>Sentiment:</h4>
          <p>{sentiment}</p>
        </div>
      )}

      {emotion && (
          <button className="btn btn-success mt-3" onClick={handleFetchRecommendations}>
            Get Recommendations
          </button>
      )}

      {recommendations && (
        <div className="row mt-5">
          <h4>Movie Recommendations:</h4>
          {recommendations.movies && recommendations.movies.length > 0 ? (
            recommendations.movies.map((movie, index) => (
              <div className="col-md-4 mb-3" key={index}>
                <div className="card">
                  <img src={movie.poster} alt={movie.title} className="card-img-top" />
                  <div className="card-body">
                    <h5 className="card-title">{movie.title}</h5>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p>No movies found.</p>
          )}

          <h4 className="mt-4">Book Recommendations:</h4>
          {recommendations.books && recommendations.books.length > 0 ? (
            recommendations.books.map((book, index) => (
              <div className="col-md-4 mb-3" key={index}>
                <div className="card">
                  <img src={book.coverImage} alt={book.title} className="card-img-top" />
                  <div className="card-body">
                    <h5 className="card-title">{book.title}</h5>
                    <p className="card-text">Author: {book.author}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p>No books found.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Chat;
