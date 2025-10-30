const { Pool } = require('pg');

// We get this from the environment variable we set on Render
const API_KEY = process.env.DATA_GOV_API_KEY;
const API_URL = `https://api.data.gov.in/resource/ee03643a-ee4c-48c2-ac30-9f2ff26ab722?api-key=${API_KEY}&format=json&limit=2000`;

// Database Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

/**
 * Fetches data from data.gov.in, processes it, and saves it to the database.
 */
async function fetchAndSaveData() {
  console.log('Connecting to database for data fetch...');
  const client = await pool.connect();
  console.log('Starting data fetch from data.gov.in...');

  try {
    // 1. Fetch data from the external API
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }
    const data = await response.json();
    
    if (!data.records || data.records.length === 0) {
      console.log('No records found in API response.');
      return;
    }
    console.log(`Fetched ${data.records.length} records from API.`);

    // 2. Start a database transaction
    await client.query('BEGIN');

    // 3. Process each record
    for (const record of data.records) {
      // We only care about Uttar Pradesh
      if (record.state_name !== 'Uttar Pradesh') {
        continue;
      }

      // 3a. Find the district_id from our 'Districts' table
      const distQuery = 'SELECT id FROM Districts WHERE district_name_en = $1';
      const distRes = await client.query(distQuery, [record.district_name]);

      if (distRes.rows.length === 0) {
        console.warn(`Skipping: District not found in DB: ${record.district_name}`);
        continue;
      }
      const districtId = distRes.rows[0].id;

      // 3b. Prepare the data for insertion
      const finYear = record.financial_year; // e.g., "2025-2026"
      const month = parseInt(record.month, 10); // e.g., "10"
      
      const jobCards = parseInt(record.total_no__of_jobcards_issued, 10) ?? 0;
      const activeWorkers = parseInt(record.total_no__of_workers, 10) ?? 0;
      const personDays = parseInt(record.total_persondays_generated, 10) ?? 0;
      const households100Days = parseInt(record.total_no__of_households_completed_100_days, 10) ?? 0;
      const pendingWages = parseFloat(record.pending_wage_liability__in_rs__lakh_) * 100000 ?? 0; // Convert Lakhs to Rs

      // 3c. Insert or Update data using "ON CONFLICT"
      const upsertQuery = `
        INSERT INTO MonthlyPerformance (
          district_id, financial_year, month, 
          job_cards_issued, active_workers, person_days_generated, 
          households_100_days, wage_liabilities_pending_rs
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (district_id, financial_year, month)
        DO UPDATE SET
          job_cards_issued = EXCLUDED.job_cards_issued,
          active_workers = EXCLUDED.active_workers,
          person_days_generated = EXCLUDED.person_days_generated,
          households_100_days = EXCLUDED.households_100_days,
          wage_liabilities_pending_rs = EXCLUDED.wage_liabilities_pending_rs,
          data_fetched_at = CURRENT_TIMESTAMP;
      `;
      
      await client.query(upsertQuery, [
        districtId, finYear, month, 
        jobCards, activeWorkers, personDays, 
        households100Days, pendingWages
      ]);
    }

    // 4. Commit the transaction
    await client.query('COMMIT');
    console.log('Data fetch and database update successful.');

  } catch (err) {
    // 5. If anything goes wrong, roll back the transaction
    await client.query('ROLLBACK');
    console.error('Error during data fetch or database update:', err);
  } finally {
    // 6. Release the database client back to the pool
    client.release();
  }
}

// This allows the file to be "required" by index.js
module.exports = { fetchAndSaveData };

// This part allows us to run the file manually
if (require.main === module) {
  console.log('Running dataFetcher as a standalone script...');
  fetchAndSaveData().catch(err => {
    console.error('Standalone fetch failed:', err);
    process.exit(1);
  }).finally(() => {
    pool.end(); // Close the pool when script is done
    console.log('Database pool closed.');
  });
}