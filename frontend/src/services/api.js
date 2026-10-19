import axios from 'axios';
import { BASE_URL } from '../config/apiConfig';

const API = axios.create({
    baseURL: BASE_URL || 'http://localhost:5000/api',
});

// Automatically attaches JWT token if present in localStorage
API.interceptors.request.use((req) => {
    const token = localStorage.getItem('token');
    if (token) {
        req.headers.Authorization = `Bearer ${token}`;
    }
    return req;
}, (error) => {
    return Promise.reject(error);
});

// Response Interceptor: Prevents accidental session wipe on page refresh errors
API.interceptors.response.use(
    (response) => response,
    (error) => {
        // Log network or auth issues without forcefully clearing session
        if (error.response && error.response.status === 401) {
            console.warn('⚠️ Unauthorized request intercepted');
        }
        return Promise.reject(error);
    }
);

export default API;