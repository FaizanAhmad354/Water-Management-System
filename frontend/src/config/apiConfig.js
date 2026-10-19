// Future mein jab backend host karoge (e.g., Render, Railway, AWS), 
// toh bas yahan URL change kar dena, pure project mein automatically update ho jayega.

export const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api' ;