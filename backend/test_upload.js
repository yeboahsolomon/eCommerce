const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

async function testUpload() {
  try {
    console.log("Downloading a real image...");
    const imageResp = await axios.get('https://placehold.co/200x200.png', { responseType: 'arraybuffer' });
    fs.writeFileSync('test_image.png', imageResp.data);

    console.log("Logging in...");
    const loginRes = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'demo_seller@ghanamarket.com',
      password: 'password123'
    });
    const token = loginRes.data.data?.token || loginRes.data.token || loginRes.headers['set-cookie'];
    if (!token) throw new Error("Could not get token");
    
    console.log("Uploading to /api/upload/image...");
    const form = new FormData();
    form.append('image', fs.createReadStream('test_image.png'));
    form.append('type', 'product');

    const uploadRes = await axios.post('http://localhost:3001/api/upload/image', form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });

    console.log('\\nSUCCESS! Upload Response:', JSON.stringify(uploadRes.data, null, 2));

  } catch (err) {
    if (err.response) {
      console.error('\\nAPI Error:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('\\nScript Error:', err.message);
    }
  }
}
testUpload();
