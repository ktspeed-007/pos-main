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
    const result = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  const { 
    productCode, lotCode, barcode, name, price, stock, category,
    sellerId, seller, warehouseId, warehouseName, storageLocationId, storageLocationName,
    productionDate, expiryDate, paymentMethods, creditDays, dueDate,
    active, minStock, maxStock
  } = req.body;
  
  try {
    const result = await pool.query(
      `INSERT INTO products (
        productCode, lotCode, barcode, name, price, stock, category,
        sellerId, seller, warehouseId, warehouseName, storageLocationId, storageLocationName,
        productionDate, expiryDate, paymentMethods, creditDays, dueDate,
        active, minStock, maxStock, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW()) 
      RETURNING *`,
      [
        productCode, lotCode, barcode, name, price, stock || 0, category,
        sellerId, seller, warehouseId, warehouseName, storageLocationId, storageLocationName,
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
    productCode, lotCode, barcode, name, price, stock, category,
    sellerId, seller, warehouseId, warehouseName, storageLocationId, storageLocationName,
    productionDate, expiryDate, paymentMethods, creditDays, dueDate,
    active, minStock, maxStock
  } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE products SET 
        productCode = $1, lotCode = $2, barcode = $3, name = $4, price = $5, stock = $6, category = $7,
        sellerId = $8, seller = $9, warehouseId = $10, warehouseName = $11, storageLocationId = $12, storageLocationName = $13,
        productionDate = $14, expiryDate = $15, paymentMethods = $16, creditDays = $17, dueDate = $18,
        active = $19, minStock = $20, maxStock = $21, updated_at = NOW()
      WHERE id = $22 RETURNING *`,
      [
        productCode, lotCode, barcode, name, price, stock || 0, category,
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
  const allowed = ['name', 'price', 'stock', 'active', 'category', 'sellerId', 'seller', 'warehouseId', 'warehouseName', 'storageLocationId', 'storageLocationName', 'productCode', 'lotCode', 'productionDate', 'expiryDate', 'paymentMethods', 'creditDays', 'dueDate', 'minStock', 'maxStock'];
  const set = [];
  const values = [];
  let idx = 1;
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      set.push(`${key} = $${idx}`);
      values.push(key === 'paymentMethods' ? JSON.stringify(fields[key]) : fields[key]);
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
    const result = await pool.query('SELECT * FROM warehouses ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/warehouses', async (req, res) => {
  const { warehouseCode, name, description } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO warehouses (warehouseCode, name, description, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [warehouseCode, name, description]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/warehouses/:id', async (req, res) => {
  const { id } = req.params;
  const { warehouseCode, name, description } = req.body;
  try {
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
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/warehouses/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM warehouses WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Warehouse not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Storage Locations endpoints
app.get('/api/storage-locations', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM storage_locations ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/storage-locations', async (req, res) => {
  const { storageCode, name, description } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO storage_locations (storageCode, name, description, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [storageCode, name, description]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/storage-locations/:id', async (req, res) => {
  const { id } = req.params;
  const { storageCode, name, description } = req.body;
  try {
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
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/storage-locations/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM storage_locations WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Storage location not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Purchase Orders endpoints
app.get('/api/purchase-orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM purchase_orders ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

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

app.post('/api/purchase-orders', async (req, res) => {
  let { 
    id, items, total, status, sellerId, sellerName, createdBy, 
    expectedDeliveryDate, notes, paymentMethod, creditDays, dueDate 
  } = req.body;
  try {
    // ถ้าไม่ได้ส่ง id ให้ generate id ใหม่
    if (!id) {
      id = await generatePurchaseOrderId();
    }
    if (!createdBy) {
      createdBy = 'unknown';
    }
    const result = await pool.query(
      `INSERT INTO purchase_orders (
        id, items, total, status, sellerId, sellerName, createdby, 
        expectedDeliveryDate, notes, paymentMethod, creditDays, dueDate, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()) RETURNING *`,
      [
        id, JSON.stringify(items), total, status, sellerId, sellerName, createdBy,
        expectedDeliveryDate, notes, paymentMethod, creditDays, dueDate
      ]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/purchase-orders/:id', async (req, res) => {
  const { id } = req.params;
  const { 
    items, total, status, sellerId, sellerName, createdBy, 
    expectedDeliveryDate, notes, paymentMethod, creditDays, dueDate 
  } = req.body;
  try {
    const result = await pool.query(
      `UPDATE purchase_orders SET 
        items = $1, total = $2, status = $3, sellerId = $4, sellerName = $5, createdby = $6,
        expectedDeliveryDate = $7, notes = $8, paymentMethod = $9, creditDays = $10, dueDate = $11, updated_at = NOW()
      WHERE id = $12 RETURNING *`,
      [
        JSON.stringify(items), total, status, sellerId, sellerName, createdBy,
        expectedDeliveryDate, notes, paymentMethod, creditDays, dueDate, id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Purchase order not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

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
  const { id, items, total, paymentMethod, timestamp, receivedAmount, changeAmount, canceled } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO sales (id, items, total, paymentMethod, timestamp, receivedAmount, changeAmount, canceled) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [id, JSON.stringify(items), total, paymentMethod, timestamp, receivedAmount, changeAmount, canceled || false]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
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

app.get('/', (req, res) => {
  res.send('POS API is running!');
});

const PORT = 3001;
app.listen(PORT, () => console.log(`API running on port ${PORT}`)); 