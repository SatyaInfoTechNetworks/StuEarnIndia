import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Scale } from 'lucide-react';

export default function Terms() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 100, 
        background: 'rgba(10, 11, 16, 0.7)', 
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-glass)' 
      }}>
        <div className="container" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          height: '70px' 
        }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              color: '#fff',
              fontSize: '1.2rem'
            }}>S</div>
            <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>
              StuEarn<span style={{ color: 'var(--primary)' }}>India</span>
            </span>
          </Link>
          <Link to="/" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main style={{ flex: 1, padding: '60px 0 100px' }}>
        <div className="container" style={{ maxWidth: '800px' }}>
          <div className="glass-panel" style={{ padding: '40px 30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
              <div style={{ 
                background: 'rgba(168, 85, 247, 0.1)', 
                color: 'var(--primary)', 
                width: '50px', 
                height: '50px', 
                borderRadius: '12px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center'
              }}>
                <Scale size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.8rem', margin: 0 }}>Terms & Conditions</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Last Updated: May 2026</p>
              </div>
            </div>

            <div style={{ color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              <section>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#fff' }}>1. Agreement to Terms</h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                  By accessing or using the StuEarn India mobile application and web frontend, you agree to be bound by these Terms and Conditions. If you do not agree, you must immediately terminate usage of our software.
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#fff' }}>2. Account Registration</h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                  You must register an account using verified authentication methods (Google Sign-In). You are responsible for ensuring the confidentiality of your credentials. Creating multiple accounts or utilizing scripts to bypass security, create synthetic referrals, or spoof location will result in an immediate account ban and forfeiture of all accumulated coins.
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#fff' }}>3. Reward System & Verification</h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Coins earned within StuEarn India have no raw cash value outside the application ecosystem. Coins are only credited after manual administrative verification of your submitted proofs. Rejections are final and determined solely by administrators based on instruction compliance.
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#fff' }}>4. Payout Rules & Eligibility</h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Withdrawals are subject to verification controls, system liquidity, and minimum payout limits. We reserve the absolute right to delay, reject, or freeze payouts if we suspect fraudulent task submissions, location spoofing, or device emulation.
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#fff' }}>5. Limitation of Liability</h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                  StuEarn India is provided on an "as-is" and "as-available" basis. We do not guarantee fixed income, uninterrupted system availability, or absolute confirmation of rewards. We shall not be liable for any direct or indirect damages arising out of your software usage.
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#fff' }}>6. Termination</h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                  We reserve the right to suspend or terminate accounts that breach these terms, engage in system exploits, or attempt to manipulate ledger transactions.
                </p>
              </section>

            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ 
        background: '#07080c', 
        borderTop: '1px solid var(--border-glass)', 
        padding: '30px 0',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: 'var(--text-muted)'
      }}>
        &copy; 2026 StuEarnIndia. All rights reserved.
      </footer>
    </div>
  );
}
