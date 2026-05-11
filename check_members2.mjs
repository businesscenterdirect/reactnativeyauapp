import https from 'https';

async function fetchDocs(collectionName) {
  return new Promise((resolve, reject) => {
    https.get(`https://firestore.googleapis.com/v1/projects/yau-app/databases/(default)/documents/${collectionName}`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

(async () => {
    try {
      const parentData = await fetchDocs('parents');
      const coachData = await fetchDocs('coaches');
      const userData = await fetchDocs('users');
      
      console.log(`Parents found:`, parentData.documents ? parentData.documents.length : 0);
      if (parentData.documents) {
         parentData.documents.forEach(d => {
             const email = d.fields.email?.stringValue;
             const fname = d.fields.firstName?.stringValue;
             console.log(`Parent: ${fname} | ${email} | ID: ${d.name.split('/').pop()}`);
         });
      }
      
      console.log(`\nCoaches found:`, coachData.documents ? coachData.documents.length : 0);
      if (coachData.documents) {
         coachData.documents.forEach(d => {
             const email = d.fields.email?.stringValue;
             const fname = d.fields.firstName?.stringValue;
             console.log(`Coach: ${fname} | ${email} | ID: ${d.name.split('/').pop()}`);
         });
      }
      
      console.log(`\nUsers found:`, userData.documents ? userData.documents.length : 0);
      if (userData.documents) {
         userData.documents.forEach(d => {
             const email = d.fields.email?.stringValue;
             const role = d.fields.role?.stringValue;
             console.log(`User: ${role} | ${email} | ID: ${d.name.split('/').pop()}`);
         });
      }
    } catch(e) { console.log(e); }
})();
