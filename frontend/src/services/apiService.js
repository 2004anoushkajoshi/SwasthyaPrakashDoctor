import axios from "axios";

// Deployed backend URLs
const NODE_API = import.meta.env.VITE_NODE_API;
const FLASK_API = import.meta.env.VITE_FLASK_API;

export const nodeAPI = axios.create({ baseURL: NODE_API });
export const flaskAPI = axios.create({ baseURL: FLASK_API });