import 'dotenv/config';
// Force IPv4 DNS resolution for all outbound connections.
// Cloud hosts (Render, Railway, etc.) have no outbound IPv6 — without this,
// smtp.office365.com resolves to a 2603:… IPv6 address and fails with ENETUNREACH.
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import app from './app';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Wayn backend running on http://localhost:${PORT}`);
});
