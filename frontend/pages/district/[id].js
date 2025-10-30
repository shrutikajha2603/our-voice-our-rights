// frontend/pages/district/[id].js

import { useState, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  FaPlay,
  FaPause,
  FaUsers,
  FaHome,
  FaMoneyBillWave,
  FaCalendarCheck,
} from 'react-icons/fa'; // Using the icons we installed

// Vercel provides this environment variable
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// --- This is Server-Side Rendering (SSR) ---
// This function runs on the SERVER (on Vercel) before the page is sent to the user.
export async function getServerSideProps(context) {
  const { id } = context.params;

  try {
    // 1. Fetch data from OUR reliable backend API
    const res = await fetch(`${API_URL}/api/performance/${id}`);
    
    // If our API returns a 404 (no data), we show a 404 page
    if (!res.ok) {
      return { notFound: true };
    }

    const performanceData = await res.json();

    // 2. Send this data as "props" to our page component
    return {
      props: {
        performanceData,
        districtId: id,
      },
    };
  } catch (err) {
    // Handle any other errors
    return { notFound: true };
  }
}

// --- This is the Page Component ---
// It receives the "props" from getServerSideProps
export default function DistrictPage({ performanceData, districtId }) {
  const router = useRouter();
  const { name_hi } = router.query; // Get the Hindi name from the URL query

  const { current_month, previous_month } = performanceData;

  // --- Audio Player Logic ---
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  
  // NOTE: This part is a demo. For real audio, you would
  // record MP3s and place them in `frontend/public/audio/1.mp3`, etc.
  const audioSrc = `/audio/${districtId}.mp3`; 

  const handlePlayPause = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Helper to format large numbers
  const formatNumber = (num) => {
    if (num === null || num === undefined) return 'N/A';
    return new Intl.NumberFormat('en-IN').format(num);
  };

  // Helper for the bar chart
  const getBarHeight = (value, max) => {
    if (!value || max === 0) return '0%';
    return `${(value / max) * 100}%`;
  };
  
  const maxPersonDays = Math.max(
    current_month?.person_days_generated || 0,
    previous_month?.person_days_generated || 0
  );

  return (
    <>
      <Head>
        <title>{name_hi || 'जिला रिपोर्ट'}</title>
      </Head>

      <main>
        {/* --- Hidden Audio Element --- */}
        <audio
          ref={audioRef}
          src={audioSrc}
          onEnded={() => setIsPlaying(false)}
        />

        <header>
          <Link href="/" passHref>
            <a className="back-link">← वापस जाएं (Go Back)</a>
          </Link>
          <h1 className="district-title">{name_hi}</h1>
        </header>

        {/* --- Play Audio Button --- */}
        <button className="audio-button" onClick={handlePlayPause}>
          {isPlaying ? (
            <>
              <FaPause /> रोकें (Pause)
            </>
          ) : (
            <>
              <FaPlay /> रिपोर्ट सुनें (Listen)
            </>
          )}
        </button>

        {/* --- Data Cards --- */}
        <div className="card-grid">
          {/* Card: Pending Wages (The "Rights" Card) */}
          <div
            className={`card ${
              (current_month?.wage_liabilities_pending_rs || 0) > 0
                ? 'card-red'
                : 'card-green'
            }`}
          >
            <FaMoneyBillWave className="card-icon" />
            <div className="card-content">
              <h3>रुकी हुई मज़दूरी</h3>
              <div className="card-value">
                ₹ {formatNumber(current_month?.wage_liabilities_pending_rs || 0)}
              </div>
              <p>
                {(current_month?.wage_liabilities_pending_rs || 0) > 0
                  ? 'पैसा मिलना बाकी है'
                  : 'सबका पैसा मिल गया है'}
              </p>
            </div>
          </div>

          {/* Card: Active Workers */}
          <div className="card">
            <FaUsers className="card-icon" />
            <div className="card-content">
              <h3>काम करने वाले लोग</h3>
              <div className="card-value">
                {formatNumber(current_month?.active_workers)}
              </div>
            </div>
          </div>

          {/* Card: 100 Days Completed */}
          <div className="card">
            <FaHome className="card-icon" />
            <div className="card-content">
              <h3>परिवार (१०० दिन पूरे)</h3>
              <div className="card-value">
                {formatNumber(current_month?.households_100_days)}
              </div>
            </div>
          </div>

          {/* Card: Person-Days Generated */}
          <div className="card">
            <FaCalendarCheck className="card-icon" />
            <div className="card-content">
              <h3>कुल काम के दिन</h3>
              <div className="card-value">
                {formatNumber(current_month?.person_days_generated)}
              </div>
            </div>
          </div>
        </div>

        {/* --- Comparison Chart --- */}
        <div className="chart-container">
          <h2>इस महीने बनाम पिछला महीना</h2>
          <p>(कुल काम के दिन)</p>
          <div className="chart">
            <div className="bar-group">
              <div className="bar-wrapper">
                <div
                  className="bar"
                  style={{ height: getBarHeight(previous_month?.person_days_generated, maxPersonDays) }}
                ></div>
              </div>
              <div className="bar-label">पिछला महीना</div>
              <div className="bar-value">{formatNumber(previous_month?.person_days_generated)}</div>
            </div>
            <div className="bar-group">
              <div className="bar-wrapper">
                <div
                  className="bar bar-current"
                  style={{ height: getBarHeight(current_month?.person_days_generated, maxPersonDays) }}
                ></div>
              </div>
              <div className="bar-label">इस महीने</div>
              <div className="bar-value">{formatNumber(current_month?.person_days_generated)}</div>
            </div>
          </div>
        </div>
      </main>

      {/* --- Page-Specific Styles --- */}
      <style jsx>{`
        .back-link {
          font-size: 1rem;
          color: var(--text-color-muted);
        }
        .district-title {
          font-size: 2.5rem;
          color: var(--accent-color);
          text-align: center;
          margin: 0.5rem 0 1.5rem;
        }
        .audio-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.8rem;
          width: 100%;
          padding: 1rem;
          font-size: 1.3rem;
          font-weight: bold;
          color: white;
          background-color: var(--green-color);
          border: none;
          border-radius: 8px;
          cursor: pointer;
          margin-bottom: 2rem;
        }
        .card-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .card {
          background-color: var(--secondary-bg);
          border-radius: 8px;
          padding: 1.5rem;
          display: flex;
          gap: 1rem;
        }
        .card-icon {
          font-size: 2.5rem;
          color: var(--accent-color);
          flex-shrink: 0;
          margin-top: 5px;
        }
        .card-content h3 {
          margin: 0 0 0.5rem;
          font-size: 1.1rem;
          color: var(--text-color-muted);
        }
        .card-content .card-value {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 0.25rem;
        }
        .card-content p {
          margin: 0;
          font-size: 0.9rem;
        }

        /* Special Card Colors */
        .card-red {
          background-color: #4a252a;
          border: 1px solid var(--red-color);
        }
        .card-red .card-icon {
          color: var(--red-color);
        }
        .card-green {
          background-color: #254a32;
          border: 1px solid var(--green-color);
        }
        .card-green .card-icon {
          color: var(--green-color);
        }

        /* Bar Chart */
        .chart-container {
          background-color: var(--secondary-bg);
          border-radius: 8px;
          padding: 1.5rem;
          margin-top: 2rem;
          text-align: center;
        }
        .chart-container h2 {
          margin: 0 0 0.25rem;
        }
        .chart-container p {
          margin-top: 0;
          color: var(--text-color-muted);
        }
        .chart {
          display: flex;
          justify-content: space-around;
          align-items: flex-end;
          height: 200px;
          margin-top: 2rem;
        }
        .bar-group {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 40%;
        }
        .bar-wrapper {
          width: 100%;
          height: 100%;
          background-color: #3e3e3e;
          border-radius: 4px 4px 0 0;
          display: flex;
          align-items: flex-end;
          overflow: hidden;
        }
        .bar {
          width: 100%;
          background-color: var(--text-color-muted);
          transition: height 0.5s ease-out;
        }
        .bar-current {
          background-color: var(--accent-color);
        }
        .bar-label {
          margin-top: 0.5rem;
          font-size: 0.9rem;
          color: var(--text-color-muted);
        }
        .bar-value {
          font-weight: bold;
          font-size: 1.1rem;
        }

        /* Responsive for small screens */
        @media (max-width: 480px) {
          .card-grid {
            grid-template-columns: 1fr;
          }
          .card {
            padding: 1rem;
          }
          .card-icon {
            font-size: 2rem;
          }
          .card-content .card-value {
            font-size: 1.8rem;
          }
          .district-title {
            font-size: 2rem;
          }
        }
      `}</style>
    </>
  );
}