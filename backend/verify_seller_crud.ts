import axios from 'axios';
import prisma from './src/config/database';

const API_URL = 'http://127.0.0.1:3001/api';
let authToken = '';
let userId = '';
let productId = '';
let categoryId = '';

const checkHealth = async () => {
    try {
        console.log('0. Checking API Health...');
        const res = await axios.get(`${API_URL}/health`);
        console.log('Health Check:', res.data);
    } catch (error: any) {
        console.error('Health Check Failed:', error.code || error.message);
    }
}

const registerAndUpgradeUser = async () => {
    const email = `test.seller.${Date.now()}@example.com`;
    const password = 'Password@123';
    try {
        console.log('1. Registering user...');
        const res = await axios.post(`${API_URL}/auth/register`, {
            email,
            password,
            firstName: 'Test',
            lastName: 'Seller',
            phone: '0555555555' 
        });
        
        if (res.data.success) {
            // Check direct token or nested in data
            authToken = res.data.data?.accessToken || res.data.accessToken;
            userId = res.data.data?.user?.id || res.data.user.id;
            console.log(`User registered: ${userId}`);

            // Upgrade to SELLER using Prisma
            console.log('1b. Upgrading user to SELLER...');
            await prisma.user.update({
                where: { id: userId },
                data: { role: 'SELLER' }
            });
            console.log('User upgraded to SELLER in DB.');

            // Create Seller Profile? 
            // The service checks `req.user.sellerProfile`.
            // Does `User` model have `sellerProfile` relation?
            // Usually need a separate `SellerProfile` record or fields on User?
            // Let's check schema. But usually `sellerProfile` implies a separate table or relation.
            // If `req.user.sellerProfile` is populated, it means `user` has `sellerProfile`.
            // I should check if I need to create a SellerProfile.
            
            // Let's inspect the `User` model via Prisma? 
            // Or just try. If it fails with "Seller profile not found", I know I need to create one.
            
            try {
                // Create Seller Profile
                // Schema requires: businessName, slug, businessPhone
                const timestamp = Date.now();
                await (prisma as any).sellerProfile.create({
                    data: {
                        userId: userId,
                        businessName: `Test Store ${timestamp}`,
                        slug: `test-store-${timestamp}`,
                        businessPhone: '0555555555',
                        description: 'Test Description',
                    }
                });
                console.log('Seller Profile created.');
            } catch (e: any) {
                console.log('Seller Profile creation skipped/failed:', e.message);
            }
        }
    } catch (error: any) {
        console.error('Registration/Upgrade failed:', error.message);
        if (error.response) {
             console.error('Status:', error.response.status);
             console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
};

const getCategories = async () => {
    try {
        console.log('2. Fetching categories...');
        const res = await axios.get(`${API_URL}/categories`);
        if (res.data.success && res.data.data.categories.length > 0) {
            categoryId = res.data.data.categories[0].id;
            console.log(`Category found: ${categoryId}`);
        } else {
            console.log('No categories found. Please seed the database first.');
            // Abort if no categories
            return;
        }
    } catch (error: any) {
        console.error('Fetch categories failed:', error.message);
    }
};

const createProduct = async () => {
    if (!categoryId) {
        console.log('Skipping createProduct: No Category ID');
        return;
    }
    try {
        console.log('3. Creating product...');
        const res = await axios.post(`${API_URL}/products`, {
            name: 'Verification Product',
            priceInPesewas: 5000,
            categoryId,
            stockQuantity: 10,
            description: 'Test Description'
        }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (res.data.success) {
            productId = res.data.data.product.id;
            console.log(`Product created: ${productId}`);
        }
    } catch (error: any) {
        console.error('Create product failed:', error.message);
         if (error.response) console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
};

const updateProduct = async () => {
    if (!productId) {
         console.log('Skipping updateProduct: No Product ID');
         return;
    }
    try {
        console.log('4. Updating product...');
        // Change price and consume stock?
        const res = await axios.put(`${API_URL}/products/${productId}`, {
            name: 'Verification Product Updated',
            stockQuantity: 5
        }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        if (res.data.success) {
            console.log('Product updated successfully.');
        }
    } catch (error: any) {
         console.error('Update product failed:', error.message);
         if (error.response) console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
};

const getSellerProducts = async () => {
    if (!authToken) {
        console.log('Skipping getSellerProducts: No Auth Token');
        return;
    }
    try {
        console.log('5. Fetching seller products...');
        const res = await axios.get(`${API_URL}/seller/products`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (res.data.success) {
            const products = res.data.data.products;
            const found = products.find((p: any) => p.id === productId);
            if (found && found.name === 'Verification Product Updated') {
                console.log('Product verified in list with updated name.');
            } else {
                console.log('Product NOT found in list or name mismatch.');
                console.log('List IDs:', products.map((p: any) => p.id));
            }
        }
    } catch (error: any) {
        console.error('Get seller products failed:', error.message);
        if (error.response) console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
};

const deleteProduct = async () => {
    if (!productId) {
        console.log('Skipping deleteProduct: No Product ID');
        return;
    }
    try {
        console.log('6. Deleting product...');
        const res = await axios.delete(`${API_URL}/products/${productId}`, {
             headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (res.data.success) {
            console.log('Product deleted.');
        }
    } catch (error: any) {
        console.error('Delete product failed:', error.message);
         if (error.response) console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
};

const run = async () => {
    await checkHealth();
    await registerAndUpgradeUser();
    if (authToken) {
        await getCategories();
        await createProduct();
        await updateProduct();
        await getSellerProducts();
        await deleteProduct();
    } else {
        console.log('Aborting CRUD tests due to missing Auth Token');
    }
    
    // Explicitly disconnect prisma
    await prisma.$disconnect();
};

run();
