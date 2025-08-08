const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: 'posuser',
  host: 'localhost',
  database: 'posdb',
  password: 'pospassword',
  port: 5432,
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is running!' });
});

// Products endpoints
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.id as category_id, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      ORDER BY p.created_at DESC
    `);
    if (result.rows.length > 0) {
      console.log('DEBUG PRODUCTS SQL RESULT:', result.rows[0]);
    } else {
      console.log('DEBUG PRODUCTS SQL RESULT: No products found');
    }
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  let {
    productCode, lotCode, barcode, name, price, stock, categoryId,
    sellerId, warehouseId, storageLocationId,
    productionDate, expiryDate, paymentMethods, creditDays, dueDate,
    active, minStock, maxStock
  } = req.body;

  // แปลง string ว่างเป็น null และ string เป็น int
  categoryId = categoryId ? parseInt(categoryId) : null;
  sellerId = sellerId ? parseInt(sellerId) : null;
  warehouseId = warehouseId ? parseInt(warehouseId) : null;
  storageLocationId = storageLocationId ? parseInt(storageLocationId) : null;

  try {
    const result = await pool.query(
      `INSERT INTO products (
        productCode, lotCode, barcode, name, price, stock, category_id,
        sellerId, warehouseId, storageLocationId,
        productionDate, expiryDate, paymentMethods, creditDays, dueDate,
        active, minStock, maxStock, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())
      RETURNING *`,
      [
        productCode, lotCode, barcode, name, price, stock || 0, categoryId,
        sellerId, warehouseId, storageLocationId,
        productionDate, expiryDate, JSON.stringify(paymentMethods), creditDays, dueDate,
        active !== false, minStock || 0, maxStock || 0
      ]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { 
    productCode, lotCode, barcode, name, price, stock, categoryId,
    sellerId, seller, warehouseId, warehouseName, storageLocationId, storageLocationName,
    productionDate, expiryDate, paymentMethods, creditDays, dueDate,
    active, minStock, maxStock
  } = req.body;
  
  // แปลง string ว่างเป็น null และ string เป็น int
  const category_id = categoryId ? parseInt(categoryId) : null;
  
  try {
    const result = await pool.query(
      `UPDATE products SET 
        productCode = $1, lotCode = $2, barcode = $3, name = $4, price = $5, stock = $6, category_id = $7,
        sellerId = $8, seller = $9, warehouseId = $10, warehouseName = $11, storageLocationId = $12, storageLocationName = $13,
        productionDate = $14, expiryDate = $15, paymentMethods = $16, creditDays = $17, dueDate = $18,
        active = $19, minStock = $20, maxStock = $21, updated_at = NOW()
      WHERE id = $22 RETURNING *`,
      [
        productCode, lotCode, barcode, name, price, stock || 0, category_id,
        sellerId, seller, warehouseId, warehouseName, storageLocationId, storageLocationName,
        productionDate, expiryDate, JSON.stringify(paymentMethods), creditDays, dueDate,
        active !== false, minStock || 0, maxStock || 0, id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/products/:id - อัปเดตเฉพาะ field ที่ส่งมา (partial update)
app.patch('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const fields = req.body;
  const allowed = ['name', 'price', 'stock', 'active', 'categoryId', 'sellerId', 'seller', 'warehouseId', 'warehouseName', 'storageLocationId', 'storageLocationName', 'productCode', 'lotCode', 'productionDate', 'expiryDate', 'paymentMethods', 'creditDays', 'dueDate', 'minStock', 'maxStock'];
  const set = [];
  const values = [];
  let idx = 1;
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      if (key === 'categoryId') {
        set.push(`category_id = $${idx}`);
        values.push(fields[key] ? parseInt(fields[key]) : null);
      } else {
        set.push(`${key} = $${idx}`);
        values.push(key === 'paymentMethods' ? JSON.stringify(fields[key]) : fields[key]);
      }
      idx++;
    }
  }
  if (set.length === 0) {
    return res.status(400).json({ success: false, error: 'No valid fields to update' });
  }
  values.push(id);
  try {
    const result = await pool.query(
      `UPDATE products SET ${set.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/products/:id/stock - อัปเดต stock สินค้าโดยตรง
app.patch('/api/products/:id/stock', async (req, res) => {
  const { id } = req.params;
  const { stock } = req.body;
  try {
    const result = await pool.query(
      'UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [stock, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/products/stock/bulk - อัปเดต stock หลายรายการพร้อมกัน
app.patch('/api/products/stock/bulk', async (req, res) => {
  const { updates } = req.body;
  
  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ success: false, error: 'Invalid updates array' });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const updatedProducts = [];
      
      for (const update of updates) {
        const { id, stock } = update;
        if (!id || stock === undefined) {
          throw new Error('Invalid update data: missing id or stock');
        }
        
        const result = await client.query(
          'UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
          [stock, id]
        );
        
        if (result.rows.length === 0) {
          throw new Error(`Product not found: ${id}`);
        }
        
        updatedProducts.push(result.rows[0]);
      }
      
      await client.query('COMMIT');
      res.json({ success: true, data: updatedProducts });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Users endpoints
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, name, role, active FROM users ORDER BY id');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  const { username, name, password, role } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO users (username, name, password, role, active) VALUES ($1, $2, $3, $4, true) RETURNING id, username, name, role, active',
      [username, name, password, role]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { username, name, role } = req.body;
  try {
    const result = await pool.query(
      'UPDATE users SET username = $1, name = $2, role = $3, updated_at = NOW() WHERE id = $4 RETURNING id, username, name, role, active',
      [username, name, role, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/users/:id/toggle', async (req, res) => {
  const { id } = req.params;
  try {
    // First get current user status
    const currentUser = await pool.query(
      'SELECT id, username, name, role, active FROM users WHERE id = $1',
      [id]
    );
    
    if (currentUser.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const newActiveStatus = !currentUser.rows[0].active;
    
    const result = await pool.query(
      'UPDATE users SET active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username, name, role, active',
      [newActiveStatus, id]
    );
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT id, username, name, password, role, active FROM users WHERE username = $1 AND active = true',
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    if (user.password !== password) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, data: { user: userWithoutPassword } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Sellers endpoints
app.get('/api/sellers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sellers ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/sellers', async (req, res) => {
  const { shopCode, name, address, phone, taxId, bankAccount, bankName } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO sellers (shopCode, name, address, phone, taxId, bankAccount, bankName, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *',
      [shopCode, name, address, phone, taxId, bankAccount, bankName]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/sellers/:id', async (req, res) => {
  const { id } = req.params;
  const { shopCode, name, address, phone, taxId, bankAccount, bankName } = req.body;
  try {
    const result = await pool.query(
      'UPDATE sellers SET shopCode = $1, name = $2, address = $3, phone = $4, taxId = $5, bankAccount = $6, bankName = $7, updated_at = NOW() WHERE id = $8 RETURNING *',
      [shopCode, name, address, phone, taxId, bankAccount, bankName, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Seller not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/sellers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM sellers WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Seller not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Warehouses endpoints
app.get('/api/warehouses', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM warehouses ORDER BY name');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

// POST a new warehouse
app.post('/api/warehouses', async (req, res) => {
  const { warehouseCode, name, description } = req.body;
  try {
    if (!warehouseCode || !name) {
      return res.status(400).json({ success: false, error: 'warehouseCode and name are required' });
    }
    const result = await pool.query(
      'INSERT INTO warehouses (warehouseCode, name, description, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *',
      [warehouseCode, name, description]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') { // unique violation
      return res.status(409).json({ success: false, error: 'Warehouse code already exists' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/warehouses/:id - update warehouse
app.put('/api/warehouses/:id', async (req, res) => {
  const { id } = req.params;
  const { warehouseCode, name, description } = req.body;
  try {
    if (!warehouseCode || !name) {
      return res.status(400).json({ success: false, error: 'warehouseCode and name are required' });
    }
    const result = await pool.query(
      'UPDATE warehouses SET warehouseCode = $1, name = $2, description = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
      [warehouseCode, name, description, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Warehouse not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') { // unique violation
      return res.status(409).json({ success: false, error: 'Warehouse code already exists' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// Categories API
// GET all categories
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY id');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST a new category
app.post('/api/categories', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Category name is required' });
    }
    const newCategory = await pool.query(
      'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *',
      [name, description]
    );
    res.status(201).json({ success: true, data: newCategory.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') { // Unique violation
      return res.status(409).json({ success: false, error: 'Category name already exists' });
    }
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// PUT to update a category
app.put('/api/categories/:id', async (req, res) => {
  try {
  const { id } = req.params;
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Category name is required' });
    }
    const updatedCategory = await pool.query(
      'UPDATE categories SET name = $1, description = $2, created_at = NOW() WHERE id = $3 RETURNING *',
      [name, description, id]
    );
    if (updatedCategory.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    res.json({ success: true, data: updatedCategory.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: 'Category name already exists' });
    }
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// DELETE a category
app.delete('/api/categories/:id', async (req, res) => {
  try {
  const { id } = req.params;
    const deleteOp = await pool.query('DELETE FROM categories WHERE id = $1', [id]);
    if (deleteOp.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    res.status(204).send(); // No Content
  } catch (err) {
    console.error(err);
    // Handle case where category is still in use by products
    if (err.code === '23503') { // Foreign key violation
      return res.status(400).json({ success: false, error: 'Cannot delete category, it is still in use by some products.' });
    }
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});


// Products API
// GET all products with details
// ลบโค้ดนี้ออก
// app.get('/api/products', async (req, res) => {
//   try {
//     const result = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
//     res.json({ success: true, data: result.rows });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// });

// เพิ่มฟังก์ชัน generatePurchaseOrderId ก่อน route purchase-orders
async function generatePurchaseOrderId() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const dateStr = dd + mm + yyyy;
  const prefix = `PO${dateStr}`;
  // หาเลขที่ล่าสุดของวันนี้
  const result = await pool.query(
    "SELECT id FROM purchase_orders WHERE id LIKE $1 ORDER BY id DESC LIMIT 1",
    [`${prefix}-%`]
  );
  let nextSeq = 1;
  if (result.rows.length > 0) {
    const lastId = result.rows[0].id;
    const lastSeq = parseInt(lastId.split('-')[1], 10);
    nextSeq = lastSeq + 1;
  }
  const seqStr = String(nextSeq).padStart(4, '0');
  return `${prefix}-${seqStr}`;
}


app.delete('/api/purchase-orders/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM purchase_orders WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Purchase order not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET all purchase orders (แนบ items)
app.get('/api/purchase-orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM purchase_orders ORDER BY created_at DESC');
    const orders = result.rows;
    // แนบ items
    for (const order of orders) {
      order.items = await getPurchaseOrderItems(order.id);
    }
    res.json({ success: true, data: orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET purchase order by id (แนบ items)
app.get('/api/purchase-orders/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM purchase_orders WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Purchase order not found' });
    }
    const order = result.rows[0];
    order.items = await getPurchaseOrderItems(order.id);
    res.json({ success: true, data: order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create purchase order (batch create items)
app.post('/api/purchase-orders', async (req, res) => {
  console.log('=== BACKEND CREATE PO ===');
  console.log('DEBUG: req.body:', req.body);
  let { id, items, total, status, sellerId, sellerName, createdBy, expectedDeliveryDate, notes, paymentMethod, creditDays, dueDate } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // generate id if not provided
    if (!id) {
      id = await generatePurchaseOrderId();
    }
    if (!createdBy) {
      createdBy = 'unknown';
    }
    // DEBUG: log items ที่รับเข้ามา
    console.log('DEBUG: items payload:', items);
    // สร้าง purchase_orders
    const result = await client.query(
      `INSERT INTO purchase_orders (
        id, items, total, status, sellerid, sellername, createdby, expecteddeliverydate, notes, paymentmethod, creditdays, duedate, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()) RETURNING *`,
      [id, JSON.stringify(items), total, status, sellerId, sellerName, createdBy, expectedDeliveryDate, notes, paymentMethod, creditDays, dueDate]
    );
    console.log('DEBUG: after insert purchase_orders', result.rows[0]);
    // batch insert purchase_order_items
    console.log('DEBUG: items received in backend:', items);
    if (Array.isArray(items)) {
      console.log('DEBUG: entering for-loop for items');
      for (const item of items) {
        try {
          console.log('DEBUG: insert purchase_order_item:', item);
          await client.query(
            `INSERT INTO purchase_order_items (purchase_order_id, product_id, qty, received_qty, lotcode, expirydate, price, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [id, item.product_id, item.qty, item.received_qty || 0, item.lotcode, item.expirydate, item.price]
          );
          console.log('SUCCESS: inserted purchase_order_item:', item);
        } catch (err) {
          console.error('ERROR inserting purchase_order_item:', err, item);
          throw err;
        }
      }
      console.log('DEBUG: finished for-loop for items');
    }
    await client.query('COMMIT');
    console.log('COMMIT SUCCESS for PO', id);
    // แนบ items กลับ
    const po = result.rows[0];
    po.items = await getPurchaseOrderItems(po.id);
    res.status(201).json({ success: true, data: po });
  } catch (err) {
    console.log('DEBUG: before rollback');
    await client.query('ROLLBACK');
    console.log('DEBUG: after rollback');
    console.error('ERROR in purchase order creation:', err, JSON.stringify(err, Object.getOwnPropertyNames(err)));
    console.log('DEBUG: before return res.status(500)');
    res.status(500).json({ success: false, error: err.message || err });
  } finally {
    console.log('RELEASING DB CONNECTION for PO', id);
    client.release();
  }
});

// PUT update purchase order (batch update items)
app.put('/api/purchase-orders/:id', async (req, res) => {
  const { id } = req.params;
  const { items, total, status, sellerid, sellername, createdby, expecteddeliverydate, notes, paymentmethod, creditdays, duedate } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // DEBUG: log items ที่รับเข้ามา
    console.log('DEBUG: items payload (PUT):', items);
    console.log('DEBUG: full request body (PUT):', req.body); // เพิ่ม debug log
    console.log('DEBUG: sellerid (PUT):', sellerid); // เพิ่ม debug log
    console.log('DEBUG: sellername (PUT):', sellername); // เพิ่ม debug log
    console.log('DEBUG: paymentmethod (PUT):', paymentmethod); // เพิ่ม debug log
    console.log('DEBUG: creditdays (PUT):', creditdays); // เพิ่ม debug log
    console.log('DEBUG: duedate (PUT):', duedate); // เพิ่ม debug log
    
    // ตรวจสอบ column names ใน DB
    const columnCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'purchase_orders' 
      AND column_name IN ('sellerid', 'sellername', 'paymentmethod', 'creditdays', 'duedate', 'expecteddeliverydate')
      ORDER BY column_name
    `);
    console.log('DEBUG: DB columns:', columnCheck.rows);
    
    // สร้าง dynamic UPDATE query เฉพาะ field ที่มีค่า
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;
    
    // ตรวจสอบ items เฉพาะเมื่อมีการส่งมาและไม่เป็น null
    if (items !== undefined && items !== null) {
      updateFields.push(`items = $${paramIndex++}`);
      updateValues.push(JSON.stringify(items));
    }
    if (total !== undefined) {
      updateFields.push(`total = $${paramIndex++}`);
      updateValues.push(total);
    }
    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      updateValues.push(status);
    }
    if (sellerid !== undefined) {
      updateFields.push(`sellerid = $${paramIndex++}`);
      updateValues.push(sellerid);
    }
    if (sellername !== undefined) {
      updateFields.push(`sellername = $${paramIndex++}`);
      updateValues.push(sellername);
    }
    if (createdby !== undefined) {
      updateFields.push(`createdby = $${paramIndex++}`);
      updateValues.push(createdby);
    }
    if (expecteddeliverydate !== undefined) {
      updateFields.push(`expecteddeliverydate = $${paramIndex++}`);
      updateValues.push(expecteddeliverydate);
    }
    if (notes !== undefined) {
      updateFields.push(`notes = $${paramIndex++}`);
      updateValues.push(notes);
    }
    if (paymentmethod !== undefined) {
      updateFields.push(`paymentmethod = $${paramIndex++}`);
      updateValues.push(paymentmethod);
    }
    if (creditdays !== undefined) {
      updateFields.push(`creditdays = $${paramIndex++}`);
      updateValues.push(creditdays);
    }
    if (duedate !== undefined) {
      updateFields.push(`duedate = $${paramIndex++}`);
      updateValues.push(duedate);
    }
    
    // เพิ่ม updated_at เสมอ
    updateFields.push(`updated_at = NOW()`);
    
    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }
    
    console.log('DEBUG: updateFields:', updateFields); // เพิ่ม debug log
    console.log('DEBUG: updateValues:', updateValues); // เพิ่ม debug log
    
    // update purchase_orders
    const result = await client.query(
      `UPDATE purchase_orders SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      [...updateValues, id]
    );
    
    // ลบ items เดิม แล้ว insert ใหม่ (เฉพาะเมื่อมี items)
    if (items !== undefined && items !== null && Array.isArray(items)) {
      await client.query('DELETE FROM purchase_order_items WHERE purchase_order_id = $1', [id]);
      for (const item of items) {
        console.log('DEBUG: insert purchase_order_item (PUT):', item);
        await client.query(
          `INSERT INTO purchase_order_items (purchase_order_id, product_id, qty, received_qty, lotcode, expirydate, price, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [id, item.product_id, item.qty, item.received_qty || 0, item.lotcode, item.expirydate, item.price]
        );
      }
    }
    
    await client.query('COMMIT');
    // แนบ items กลับ
    const po = result.rows[0];
    console.log('DEBUG: UPDATE result.rows:', result.rows); // เพิ่ม debug log
    console.log('DEBUG: po object:', po); // เพิ่ม debug log
    
    if (!po) {
      console.error('DEBUG: No PO found after UPDATE');
      return res.status(404).json({ success: false, error: 'Purchase order not found after update' });
    }
    
    try {
      po.items = await getPurchaseOrderItems(po.id);
      console.log('DEBUG: final response po:', po); // เพิ่ม debug log
      res.json({ success: true, data: po });
    } catch (itemsError) {
      console.error('DEBUG: Error getting items:', itemsError);
      // ส่งข้อมูล PO โดยไม่มี items แทนที่จะ error
      res.json({ success: true, data: po });
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// --- Endpoint สำหรับ "รับของ" (update received_qty, received_at, และ stock) ---
app.post('/api/purchase-order-items/receive', async (req, res) => {
  const { item_id, received_qty, received_at } = req.body;
  console.log('DEBUG: receive request body:', { item_id, received_qty, received_at }); // เพิ่ม debug log
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // อัปเดต received_qty, received_at ใน purchase_order_items
    const result = await client.query(
      `UPDATE purchase_order_items SET received_qty = $1, received_at = $2 WHERE id = $3 RETURNING *`,
      [received_qty, received_at, item_id]
    );
    console.log('DEBUG: update result rows:', result.rows); // เพิ่ม debug log
    if (result.rows.length === 0) {
      throw new Error('Item not found');
    }
    const item = result.rows[0];
    
    // อัปเดต received_at ใน purchase_orders ด้วย
    await client.query(
      `UPDATE purchase_orders SET received_at = $1 WHERE id = $2`,
      [received_at, item.purchase_order_id]
    );
    
    // อัปเดต stock ใน products
    await client.query(
      `UPDATE products SET stock = stock + $1 WHERE id = $2`,
      [received_qty, item.product_id]
    );
    await client.query('COMMIT');
    res.json({ success: true, data: item });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// --- Migration function: migratePurchaseOrderItems ---
// เรียกใช้ manual ผ่าน node shell หรือเพิ่ม endpoint ชั่วคราวได้
async function migratePurchaseOrderItems() {
  const pos = await pool.query('SELECT * FROM purchase_orders');
  for (const po of pos.rows) {
    if (Array.isArray(po.items)) {
      for (const item of po.items) {
        await pool.query(
          `INSERT INTO purchase_order_items (purchase_order_id, product_id, qty, received_qty, lotcode, expirydate, price, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [po.id, item.product_id, item.qty, item.received_qty || 0, item.lotcode, item.expirydate, item.price]
        );
      }
    }
  }
  console.log('Migration complete');
}

// Sales endpoints
app.get('/api/sales', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sales ORDER BY timestamp DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/sales', async (req, res) => {
  // Remove timestamp if present in the request body
  if ('timestamp' in req.body) {
    delete req.body.timestamp;
  }
  const { items, total, paymentMethod, receivedAmount, changeAmount, canceled } = req.body;
  let id;
  try {
    console.log('POST /api/sales body:', req.body);

    // Generate id: DDMMYYYY + running number 4 digits
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const dateStr = dd + mm + yyyy;
    const prefix = `${dateStr}`;
    const result = await pool.query(
      "SELECT id FROM sales WHERE id LIKE $1 ORDER BY id DESC LIMIT 1",
      [`${prefix}%`]
    );
    let nextSeq = 1;
    if (result.rows.length > 0) {
      const lastId = result.rows[0].id;
      const lastSeq = parseInt(lastId.slice(prefix.length), 10);
      nextSeq = lastSeq + 1;
    }
    const seqStr = String(nextSeq).padStart(4, '0');
    id = `${prefix}${seqStr}`;
    console.log('Final sale id:', id);

    // Insert sale with all-lowercase column names, never include timestamp
    await pool.query(
      'INSERT INTO sales (id, items, total, paymentmethod, receivedamount, changeamount, canceled) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, JSON.stringify(items), total, paymentMethod, receivedAmount, changeAmount, canceled || false]
    );

    // Deduct stock for each sold item, with log
    if (Array.isArray(items)) {
      for (const item of items) {
        if (item.id && item.quantity) {
          console.log('Deducting stock for product', item.id, 'qty', item.quantity);
          await pool.query(
            'UPDATE products SET stock = stock - $1 WHERE id = $2',
            [item.quantity, item.id]
          );
        }
      }
    }

    // Fetch the inserted sale to get the correct timestamp
    const result2 = await pool.query('SELECT * FROM sales WHERE id = $1', [id]);
    res.status(201).json({ success: true, data: result2.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/sales/:id', async (req, res) => {
  const { id } = req.params;
  const { canceled } = req.body;
  try {
    const result = await pool.query(
      'UPDATE sales SET canceled = $1 WHERE id = $2 RETURNING *',
      [canceled, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Sale not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Logs endpoints
app.get('/api/logs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM logs ORDER BY timestamp DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/logs', async (req, res) => {
  const { action, user, details } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO logs (action, username, details, timestamp) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [action, user, details]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Shop Info endpoints
app.get('/api/shop-info', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM shop_info LIMIT 1');
    if (result.rows.length === 0) {
      // Return default if no shop info exists
      return res.json({ 
        success: true, 
        data: { 
          id: '1', 
          name: 'Grocery Guru', 
          logo: '', 
          address: '', 
          phone: '', 
          taxId: '' 
        } 
      });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/shop-info', async (req, res) => {
  const { name, logo, address, phone, taxId } = req.body;
  try {
    // Check if shop info exists
    const existing = await pool.query('SELECT * FROM shop_info LIMIT 1');
    
    if (existing.rows.length > 0) {
      // Update existing
      const result = await pool.query(
        'UPDATE shop_info SET name = $1, logo = $2, address = $3, phone = $4, taxId = $5, updated_at = NOW() WHERE id = $6 RETURNING *',
        [name, logo, address, phone, taxId, existing.rows[0].id]
      );
      res.json({ success: true, data: result.rows[0] });
    } else {
      // Create new
      const result = await pool.query(
        'INSERT INTO shop_info (name, logo, address, phone, taxId, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
        [name, logo, address, phone, taxId]
      );
      res.status(201).json({ success: true, data: result.rows[0] });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// เพิ่ม endpoint สำหรับตรวจสอบรหัสผ่าน admin โดยไม่เปลี่ยน session user
app.post('/api/verify-admin-password', async (req, res) => {
  const { password } = req.body;
  try {
    const result = await pool.query(
      'SELECT id FROM users WHERE username = $1 AND password = $2 AND role = $3 AND active = true',
      ['admin', password, 'admin']
    );
    if (result.rows.length > 0) {
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET all storage locations
app.get('/api/storage-locations', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM storage_locations ORDER BY name');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST a new storage location
app.post('/api/storage-locations', async (req, res) => {
  const { storageCode, name, description } = req.body;
  try {
    if (!storageCode || !name) {
      return res.status(400).json({ success: false, error: 'storageCode and name are required' });
    }
    const result = await pool.query(
      'INSERT INTO storage_locations (storageCode, name, description, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *',
      [storageCode, name, description]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') { // unique violation
      return res.status(409).json({ success: false, error: 'Storage code already exists' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/storage-locations/:id - update storage location
app.put('/api/storage-locations/:id', async (req, res) => {
  const { id } = req.params;
  const { storageCode, name, description } = req.body;
  try {
    if (!storageCode || !name) {
      return res.status(400).json({ success: false, error: 'storageCode and name are required' });
    }
    const result = await pool.query(
      'UPDATE storage_locations SET storageCode = $1, name = $2, description = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
      [storageCode, name, description, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Storage location not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') { // unique violation
      return res.status(409).json({ success: false, error: 'Storage code already exists' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Purchase Order Items API ---
// GET all items or by purchase_order_id
app.get('/api/purchase-order-items', async (req, res) => {
  const { purchase_order_id } = req.query;
  try {
    let result;
    if (purchase_order_id) {
      result = await pool.query('SELECT * FROM purchase_order_items WHERE purchase_order_id = $1 ORDER BY id', [purchase_order_id]);
    } else {
      result = await pool.query('SELECT * FROM purchase_order_items ORDER BY id');
    }
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create item
app.post('/api/purchase-order-items', async (req, res) => {
  const { purchase_order_id, product_id, qty, received_qty, received_at, lotcode, expirydate, price } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO purchase_order_items (purchase_order_id, product_id, qty, received_qty, received_at, lotcode, expirydate, price, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`,
      [purchase_order_id, product_id, qty, received_qty || 0, received_at, lotcode, expirydate, price]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update item
app.put('/api/purchase-order-items/:id', async (req, res) => {
  const { id } = req.params;
  const { qty, received_qty, received_at, lotcode, expirydate, price } = req.body;
  try {
    const result = await pool.query(
      `UPDATE purchase_order_items SET qty = $1, received_qty = $2, received_at = $3, lotcode = $4, expirydate = $5, price = $6 WHERE id = $7 RETURNING *`,
      [qty, received_qty, received_at, lotcode, expirydate, price, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE item
app.delete('/api/purchase-order-items/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM purchase_order_items WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('POS API is running!');
});

const PORT = 3001;
app.listen(PORT, () => console.log(`API running on port ${PORT}`)); 

// --- Migration endpoint (ชั่วคราว) ---
app.post('/api/purchase-orders/migrate-items', async (req, res) => {
  try {
    await migratePurchaseOrderItems();
    res.json({ success: true, message: 'Migration complete' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
}); 

// Utility: ดึง purchase_order_items ทั้งหมดของ PO เดียว พร้อมข้อมูลสินค้า
async function getPurchaseOrderItems(purchase_order_id) {
  const result = await pool.query(
    `SELECT i.id, i.purchase_order_id, i.product_id, i.qty, i.received_qty, i.lotcode, i.expirydate, i.price, i.created_at,
            p.name, p.productCode, p.lotCode AS productLotCode, p.barcode, p.price AS productPrice, p.seller, p.sellerid
     FROM purchase_order_items i
     LEFT JOIN products p ON i.product_id = p.id
     WHERE i.purchase_order_id = $1
     ORDER BY i.id`,
    [purchase_order_id]
  );
  return result.rows;
} 