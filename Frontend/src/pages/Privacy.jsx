import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export default function Privacy() {
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
                background: 'rgba(20, 184, 166, 0.1)', 
                color: 'var(--accent)', 
                width: '50px', 
                height: '50px', 
                borderRadius: '12px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center'
              }}>
                <ShieldCheck size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.8rem', margin: 0 }}>Privacy Policy</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Last Updated: May 2026</p>
              </div>
            </div>

            <div style={{ color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              <section>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#fff' }}>1. Information We Collect</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  We collect information to verify completed tasks, secure accounts, and authorize payouts:
                </p>
                <ul style={{ color: 'var(--text-secondary)', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <li><strong>Account Profile Data:</strong> Name, verified Google email address, and profile picture.</li>
                  <li><strong>Verification Records:</strong> Uploaded proof files (screenshots, IDs) submitted explicitly by you to claim task completions.</li>
                  <li><strong>Transaction Details:</strong> Ledger inputs tracking earnings, withdrawals, and referral bonuses.</li>
                </ul>
              </section>

              <section>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#fff' }}>2. How We Use Information</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  We process data for the following specific purposes:
                </p>
                <ul style={{ color: 'var(--text-secondary)', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <li>Manually verifying task proof and processing coin credits accurately.</li>
                  <li>Preventing sybil attacks, location emulation, and script automation.</li>
                  <li>Sending Firebase Cloud Messages (FCM) to update you on task approval status or community announcements.</li>
                  <li>Processing withdrawals to UPI or Giftcard accounts.</li>
                </ul>
              </section>

              <section>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#fff' }}>3. Data Sharing and Protection</h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                  We do not sell, trade, or distribute your email or personal information to third-party brokers. All data is securely stored inside AppDatabase using advanced connection standards. Access is limited to authenticated administrators of StuEarn India.
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#fff' }}>4. Data Deletion Rights</h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                  In accordance with privacy rights, you have the absolute right to request the permanent erasure of your account data. You can submit an account erasure request at any time through our <Link to="/delete-account" style={{ color: 'var(--primary-hover)', textDecoration: 'underline' }}>Delete Account Page</Link>. Once approved by an administrator, all user records, transaction logs, and profile associations will be fully and permanently expunged from our databases.
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#fff' }}>5. Updates to This Policy</h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                  We may periodically update this policy. We recommend users review this page regularly to keep abreast of our data handling practices.
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
