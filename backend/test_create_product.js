const axios = require('axios');

async function test() {
  try {
    // 1. Login
    const loginRes = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'demo_seller@ghanamarket.com',
      password: 'password123'
    });
    const token = loginRes.data.data?.token || loginRes.data.token || loginRes.headers['set-cookie'];
    console.log('Login success, token exists:', !!token);

    // 2. Get Categories
    const catRes = await axios.get('http://localhost:3001/api/categories');
    const categories = catRes.data.data.categories;
    console.log('Categories:', categories.length);
    
    if (categories.length === 0) {
       console.log("No categories found");
       return;
    }

    // 3. Create Product
    const payload = {
      name: "Test Product",
      description: "<p>This is a test</p>",
      priceInPesewas: 1500,
      stockQuantity: 10,
      categoryId: categories[0].id,
      isActive: true, // test comment
      images: ["http://example.com/image.png"]
    };

    const prodRes = await axios.post('http://localhost:3001/api/products', payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Product created:', prodRes.data);

  } catch (error) {
    if (error.response) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Network Error:', error.message);
    }
  }
}

test();
