// Force IPv4 DNS resolution process-wide.
// Render (and many cloud hosts) have no outbound IPv6 routing, so smtp.office365.com's
// AAAA records cause ENETUNREACH. This must run before any network code is imported.
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import 'dotenv/config';
import app from './app';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Wayn API running on http://localhost:${PORT}`);
});
