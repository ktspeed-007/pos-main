const fetch = require('node-fetch');

async function testPurchaseOrderAPI() {
  try {
    console.log('Testing purchase orders API...');
    
    // Test GET all purchase orders
    console.log('\n1. Testing GET /api/purchase-orders');
    const getAllResponse = await fetch('http://localhost:3001/api/purchase-orders');
    const getAllData = await getAllResponse.json();
    console.log('GET all response:', getAllData);
    
    if (getAllData.success && getAllData.data && getAllData.data.length > 0) {
      const firstOrder = getAllData.data[0];
      console.log('\n2. Testing GET /api/purchase-orders/:id with ID:', firstOrder.id);
      
      const getByIdResponse = await fetch(`http://localhost:3001/api/purchase-orders/${firstOrder.id}`);
      const getByIdData = await getByIdResponse.json();
      console.log('GET by ID response:', getByIdData);
      
      if (getByIdData.success && getByIdData.data) {
        console.log('\n3. Order details:');
        console.log('- ID:', getByIdData.data.id);
        console.log('- Status:', getByIdData.data.status);
        console.log('- Items count:', getByIdData.data.items ? getByIdData.data.items.length : 'No items');
        console.log('- Items:', getByIdData.data.items);
      }
    } else {
      console.log('No purchase orders found to test with');
    }
    
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testPurchaseOrderAPI();
