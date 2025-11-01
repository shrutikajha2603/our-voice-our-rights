const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function setupDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Creating Districts table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS Districts (
        id SERIAL PRIMARY KEY,
        state_name VARCHAR(100) NOT NULL,
        district_name_en VARCHAR(100) NOT NULL,
        district_name_hi VARCHAR(100) NOT NULL,
        UNIQUE(state_name, district_name_en)
      );
    `);

    console.log('Creating MonthlyPerformance table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS MonthlyPerformance (
        id SERIAL PRIMARY KEY,
        district_id INTEGER REFERENCES Districts(id) ON DELETE CASCADE,
        financial_year VARCHAR(20) NOT NULL,
        month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
        job_cards_issued INTEGER DEFAULT 0,
        active_workers INTEGER DEFAULT 0,
        person_days_generated INTEGER DEFAULT 0,
        households_100_days INTEGER DEFAULT 0,
        wage_liabilities_pending_rs NUMERIC(15,2) DEFAULT 0,
        data_fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(district_id, financial_year, month)
      );
    `);

    console.log('Populating Districts table for Uttar Pradesh...');
    
    const upDistricts = [
      ['Uttar Pradesh', 'Agra', 'आगरा'],
      ['Uttar Pradesh', 'Aligarh', 'अलीगढ़'],
      ['Uttar Pradesh', 'Ambedkar Nagar', 'अम्बेडकर नगर'],
      ['Uttar Pradesh', 'Amethi', 'अमेठी'],
      ['Uttar Pradesh', 'Amroha', 'अमरोहा'],
      ['Uttar Pradesh', 'Auraiya', 'औरैया'],
      ['Uttar Pradesh', 'Azamgarh', 'आज़मगढ़'],
      ['Uttar Pradesh', 'Baghpat', 'बागपत'],
      ['Uttar Pradesh', 'Bahraich', 'बहराइच'],
      ['Uttar Pradesh', 'Ballia', 'बलिया'],
      ['Uttar Pradesh', 'Balrampur', 'बलरामपुर'],
      ['Uttar Pradesh', 'Banda', 'बाँदा'],
      ['Uttar Pradesh', 'Barabanki', 'बाराबंकी'],
      ['Uttar Pradesh', 'Bareilly', 'बरेली'],
      ['Uttar Pradesh', 'Basti', 'बस्ती'],
      ['Uttar Pradesh', 'Bhadohi', 'भदोही'],
      ['Uttar Pradesh', 'Bijnor', 'बिजनौर'],
      ['Uttar Pradesh', 'Budaun', 'बदायूँ'],
      ['Uttar Pradesh', 'Bulandshahr', 'बुलन्दशहर'],
      ['Uttar Pradesh', 'Chandauli', 'चन्दौली'],
      ['Uttar Pradesh', 'Chitrakoot', 'चित्रकूट'],
      ['Uttar Pradesh', 'Deoria', 'देवरिया'],
      ['Uttar Pradesh', 'Etah', 'एटा'],
      ['Uttar Pradesh', 'Etawah', 'इटावा'],
      ['Uttar Pradesh', 'Ayodhya', 'अयोध्या'],
      ['Uttar Pradesh', 'Farrukhabad', 'फ़र्रूख़ाबाद'],
      ['Uttar Pradesh', 'Fatehpur', 'फ़तेहपुर'],
      ['Uttar Pradesh', 'Firozabad', 'फ़िरोज़ाबाद'],
      ['Uttar Pradesh', 'Gautam Buddha Nagar', 'गौतम बुद्ध नगर'],
      ['Uttar Pradesh', 'Ghaziabad', 'ग़ाज़ियाबाद'],
      ['Uttar Pradesh', 'Ghazipur', 'ग़ाज़ीपुर'],
      ['Uttar Pradesh', 'Gonda', 'गोंडा'],
      ['Uttar Pradesh', 'Gorakhpur', 'गोरखपुर'],
      ['Uttar Pradesh', 'Hamirpur', 'हमीरपुर'],
      ['Uttar Pradesh', 'Hapur', 'हापुड़'],
      ['Uttar Pradesh', 'Hardoi', 'हरदोई'],
      ['Uttar Pradesh', 'Hathras', 'हाथरस'],
      ['Uttar Pradesh', 'Jalaun', 'जालौन'],
      ['Uttar Pradesh', 'Jaunpur', 'जौनपुर'],
      ['Uttar Pradesh', 'Jhansi', 'झाँसी'],
      ['Uttar Pradesh', 'Kannauj', 'कन्नौज'],
      ['Uttar Pradesh', 'Kanpur Dehat', 'कानपुर देहात'],
      ['Uttar Pradesh', 'Kanpur Nagar', 'कानपुर नगर'],
      ['Uttar Pradesh', 'Kasganj', 'कासगंज'],
      ['Uttar Pradesh', 'Kaushambi', 'कौशाम्बी'],
      ['Uttar Pradesh', 'Kushinagar', 'कुशीनगर'],
      ['Uttar Pradesh', 'Lakhimpur Kheri', 'लखीमपुर खीरी'],
      ['Uttar Pradesh', 'Lalitpur', 'ललितपुर'],
      ['Uttar Pradesh', 'Lucknow', 'लखनऊ'],
      ['Uttar Pradesh', 'Maharajganj', 'महाराजगंज'],
      ['Uttar Pradesh', 'Mahoba', 'महोबा'],
      ['Uttar Pradesh', 'Mainpuri', 'मैनपुरी'],
      ['Uttar Pradesh', 'Mathura', 'मथुरा'],
      ['Uttar Pradesh', 'Mau', 'मऊ'],
      ['Uttar Pradesh', 'Meerut', 'मेरठ'],
      ['Uttar Pradesh', 'Mirzapur', 'मिर्ज़ापुर'],
      ['Uttar Pradesh', 'Moradabad', 'मुरादाबाद'],
      ['Uttar Pradesh', 'Muzaffarnagar', 'मुज़फ़्फ़रनगर'],
      ['Uttar Pradesh', 'Pilibhit', 'पीलीभीत'],
      ['Uttar Pradesh', 'Pratapgarh', 'प्रतापगढ़'],
      ['Uttar Pradesh', 'Prayagraj', 'प्रयागराज'],
      ['Uttar Pradesh', 'Raebareli', 'रायबरेली'],
      ['Uttar Pradesh', 'Rampur', 'रामपुर'],
      ['Uttar Pradesh', 'Saharanpur', 'सहारनपुर'],
      ['Uttar Pradesh', 'Sambhal', 'सम्भल'],
      ['Uttar Pradesh', 'Sant Kabir Nagar', 'संत कबीर नगर'],
      ['Uttar Pradesh', 'Shahjahanpur', 'शाहजहाँपुर'],
      ['Uttar Pradesh', 'Shamli', 'शामली'],
      ['Uttar Pradesh', 'Shravasti', 'श्रावस्ती'],
      ['Uttar Pradesh', 'Siddharthnagar', 'सिद्धार्थनगर'],
      ['Uttar Pradesh', 'Sitapur', 'सीतापुर'],
      ['Uttar Pradesh', 'Sonbhadra', 'सोनभद्र'],
      ['Uttar Pradesh', 'Sultanpur', 'सुल्तानपुर'],
      ['Uttar Pradesh', 'Unnao', 'उन्नाव'],
      ['Uttar Pradesh', 'Varanasi', 'वाराणसी']
    ];

    for (const [state, nameEn, nameHi] of upDistricts) {
      await client.query(
        `INSERT INTO Districts (state_name, district_name_en, district_name_hi) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (state_name, district_name_en) DO NOTHING`,
        [state, nameEn, nameHi]
      );
    }

    console.log('✓ Database setup complete!');
    console.log('✓ Tables created');
    console.log('✓ Districts populated (75 districts)');

  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

module.exports = { setupDatabase };