const fetch = require('node-fetch'); // Make sure node-fetch is installed, or run in browser console

async function setupFacebookIntegration(organizationId, pageId, pageAccessToken, controlPlaneSecret) {
  // 1. Create Channel in CRM
  console.log("Not automating CRM Channel creation yet. Please insert into crm_channels manually:");
  console.log(`INSERT INTO crm_channels (organization_id, channel_type, channel_name, channel_external_id) VALUES ('${organizationId}', 'facebook_page', 'My FB Page', '${pageId}');`);

  // 2. Deposit BYOK Secret for the Page
  const integrationKey = `facebook_page_${pageId}`;
  const depositUrl = 'http://127.0.0.1:3000/api/byok/deposit';
  
  const res = await fetch(depositUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${controlPlaneSecret}`
    },
    body: JSON.stringify({
      organization_id: organizationId,
      integration_key: integrationKey,
      secret_value: pageAccessToken
    })
  });

  const data = await res.json();
  console.log("BYOK Deposit Result:", data);
}

// setupFacebookIntegration('org-uuid-here', 'fb-page-id-here', 'fb-page-access-token-here', 'your-control-plane-secret');
