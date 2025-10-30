// frontend/pages/index.js

import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

// Vercel provides this environment variable
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function Home() {
  const [districts, setDistricts] = useState([]);
  const [detectedDistrict, setDetectedDistrict] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // --- 1. Try to get the user's location (Bonus Feature) ---
    const getLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              // Call our backend, which is live on Render
              const res = await fetch(
                `${API_URL}/api/location/district?lat=${latitude}&lon=${longitude}`
              );
              if (!res.ok) throw new Error('Could not find district');
              const data = await res.json();
              setDetectedDistrict(data);
            } catch (err) {
              console.warn('Geolocation failed:', err.message);
            }
          },
          (err) => {
            console.warn(`Geolocation error: ${err.message}`);
          }
        );
      }
    };

    // --- 2. Fetch the list of all districts ---
    const fetchDistricts = async () => {
      try {
        const res = await fetch(`${API_URL}/api/districts`);
        if (!res.ok) throw new Error('Failed to fetch districts');
        const data = await res.json();
        setDistricts(data);
      } catch (err) {
        setError(err.message);
      }
    };

    // --- 3. Run both functions ---
    const loadPage = async () => {
      setLoading(true);
      await Promise.all([getLocation(), fetchDistricts()]);
      setLoading(false);
    };

    loadPage();
  }, []);

  return (
    <>
      <Head>
        <title>हमारी आवाज़, हमारे अधिकार</title>
        <meta name="description" content="MGNREGA Performance Dashboard" />
      </Head>

      <main>
        <header>
          <h1>हमारी आवाज़, हमारे अधिकार</h1>
          <p>अपना जिला चुनें (Select your district)</p>
        </header>

        {loading && <div className="loading">लोड हो रहा है...</div>}
        {error && <div className="error">{error}</div>}

        {/* --- Bonus Feature Box --- */}
        {detectedDistrict && (
          <Link
            href={`/district/${
              detectedDistrict.id
            }?name_hi=${encodeURIComponent(detectedDistrict.district_name_hi)}`}
            passHref
          >
            <a className="geo-button">
              <span className="geo-icon">📍</span>
              <div>
                क्या आप <strong>{detectedDistrict.district_name_hi}</strong> की
                रिपोर्ट देखना चाहते हैं?
              </div>
            </a>
          </Link>
        )}

        {/* --- Full District List --- */}
        <div className="district-list">
          {!loading &&
            districts.map((district) => (
              <Link
                key={district.id}
                href={`/district/${
                  district.id
                }?name_hi=${encodeURIComponent(district.district_name_hi)}`}
                passHref
              >
                <a className="district-button">
                  {district.district_name_hi}
                </a>
              </Link>
            ))}
        </div>
      </main>

      {/* --- Page-Specific Styles --- */}
      <style jsx>{`
        header {
          text-align: center;
          border-bottom: 2px solid var(--secondary-bg);
          padding-bottom: 1rem;
        }
        h1 {
          font-size: 1.8rem;
          color: var(--accent-color);
          margin-bottom: 0.5rem;
        }
        p {
          font-size: 1.1rem;
          color: var(--text-color-muted);
        }
        .loading,
        .error {
          text-align: center;
          font-size: 1.2rem;
          padding: 2rem;
        }
        .geo-button {
          display: flex;
          align-items: center;
          background-color: #2e3c50;
          padding: 1rem 1.5rem;
          border-radius: 8px;
          margin: 1.5rem 0;
          font-size: 1.2rem;
          border: 1px solid var(--accent-color);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
        }
        .geo-icon {
          font-size: 2rem;
          margin-right: 1rem;
        }
        .district-list {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
          margin-top: 1.5rem;
        }
        .district-button {
          display: block;
          background-color: var(--secondary-bg);
          padding: 1.2rem;
          border-radius: 8px;
          font-size: 1.3rem;
          font-weight: 500;
          text-align: center;
          transition: background-color 0.2s ease, transform 0.2s ease;
        }
        .district-button:hover {
          background-color: var(--accent-color);
          transform: scale(1.02);
        }
      `}</style>
    </>
  );
}