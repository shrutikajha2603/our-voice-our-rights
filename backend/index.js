// --- Dependencies ---
const express = require('express');
const { Pool } = require('pg');        
const { createClient } = require('redis'); 
const cors = require('cors');          
const cron = require('node-cron');     
const { fetchAndSaveData } = require('./dataFetcher'); 
const { setupDatabase } = require('./setupDatabase');

// --- Configuration ---
const app = express();
// Render sets the PORT environment variable for us.
const PORT = process.env.PORT || 8080;

// --- Middleware ---
app.use(cors()); // Allow cross-origin requests
app.use(express.json());

// --- Database & Cache Connections ---

// PostgreSQL Connection
// Render provides the DATABASE_URL environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Render Postgres
  },
});

// Redis Client Connection
// Render provides the REDIS_URL environment variable
const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

(async () => {
  try {
    await redisClient.connect();
    console.log('Connected to Redis successfully.');
  } catch (err) {
    console.error('Could not connect to Redis:', err);
  }
})();

// --- API Routes ---

/**
 * @route   GET /api/districts
 * @desc    Get all districts for the selected state (Uttar Pradesh)
 */
app.get('/api/districts', async (req, res) => {
  try {
    const query = `
      SELECT id, district_name_en, district_name_hi 
      FROM Districts 
      WHERE state_name = 'Uttar Pradesh' 
      ORDER BY district_name_hi;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching districts:', err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   GET /api/performance/:district_id
 * @desc    Get latest (and previous) performance data for a specific district
 */
app.get('/api/performance/:district_id', async (req, res) => {
  const district_id = parseInt(req.params.district_id, 10);
  if (isNaN(district_id)) {
    return res.status(400).json({ msg: 'District ID must be a number.' });
  }
  const cacheKey = `performance:${district_id}`;

  try {
    // --- STEP 1: REDIS (Keep this commented out) ---
    // const cachedData = await redisClient.get(cacheKey);
    // if (cachedData) {
    //   console.log(`CACHE HIT for district: ${district_id}`);
    //   return res.json(JSON.parse(cachedData));
    // }
    // console.log(`CACHE MISS for district: ${district_id}`);
    
    // --- STEP 2: DATABASE (This part MUST be active) ---
    const query = `
      SELECT * FROM monthlyperformance
      WHERE district_id = $1
      ORDER BY financial_year DESC, month DESC
      LIMIT 2; 
    `;
    const result = await pool.query(query, [district_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: 'No performance data found for this district.' });
    }

    // --- STEP 3: FORMATTING (This part MUST be active) ---
    const formattedData = {
      current_month: result.rows[0] || null,
      previous_month: result.rows[1] || null,
    };

    // --- STEP 4: REDIS (Keep this commented out) ---
    // await redisClient.set(cacheKey, JSON.stringify(formattedData), {
    //   EX: 86400, 
    // });

    res.json(formattedData);
  } catch (err) {
    console.error('Error fetching performance:', err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   GET /api/location/district
 * @desc    (Bonus) Get district ID from latitude and longitude
 */
app.get('/api/location/district', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ msg: 'Latitude (lat) and Longitude (lon) are required.' });
  }

  try {
    // --- This is a simulation ---
    // In a real app, you would use node-fetch to call a geocoding API
    const districtName = 'Agra'; // Hardcoded for example
    
    const query = `
      SELECT id, district_name_en, district_name_hi 
      FROM Districts 
      WHERE district_name_en = $1;
    `;
    const result = await pool.query(query, [districtName]);

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: 'District not found in our database.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching location:', err.message);
    res.status(500).send('Server Error');
  }
});

// --- TEMPORARY DEBUG ROUTE ---
// We will use this to run the fetcher and see its logs.
app.get('/api/run-fetcher-now', async (req, res) => {
  console.log("--- MANUAL DATA FETCH TRIGGERED ---");
  try {
    // Run the function
    await fetchAndSaveData();
    
    console.log("--- MANUAL DATA FETCH FINISHED ---");
    res.status(200).json({ message: "Data fetch completed. Check the Render logs for details." });

  } catch (err) {
    console.error("--- MANUAL DATA FETCH FAILED ---", err);
    res.status(500).json({ message: "Data fetch failed. Check the Render logs for the error." });
  }
});
// --- END OF TEMPORARY ROUTE ---

// --- TEMPORARY ROUTE TO SET UP THE DATABASE ---
app.get('/api/run-setup-now', async (req, res) => {
  console.log("--- MANUAL DATABASE SETUP TRIGGERED ---");
  try {
    // Run the setup function
    await setupDatabase();

    console.log("--- DATABASE SETUP FINISHED ---");
    res.status(200).json({ message: "Database setup completed. Check the Render logs for details." });

  } catch (err) {
    console.error("--- DATABASE SETUP FAILED ---", err);
    res.status(500).json({ message: "Database setup failed. Check the Render logs for the error." });
  }
});
// --- END OF TEMPORARY ROUTE ---

// --- Scheduled Job ---
// This won't run on the "Free" web service, but we'll add it anyway.
// We will trigger the data fetcher manually.
cron.schedule('0 3 * * *', () => {
  console.log('Running nightly data fetch job...');
  fetchAndSaveData().catch(console.error);
}, {
  timezone: "Asia/Kolkata"
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
  
  // NOTE: We will set up our database tables and run the fetcher
  // manually after this code is deployed.
});