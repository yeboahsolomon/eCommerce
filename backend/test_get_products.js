const axios = require('axios');
const fs = require('fs');

async function test() {
  try {
    const res = await axios.get('http://localhost:3001/api/products?limit=8');
    fs.writeFileSync('product_out.json', JSON.stringify(res.data.data.products[0], null, 2));
    console.log("Written");
  } catch (error) {
    console.error(error.message);
  }
}

test();
