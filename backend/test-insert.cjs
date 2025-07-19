const { Pool } = require('pg');
const pool = new Pool({
  user: 'posuser',
  host: 'localhost',
  database: 'posdb',
  password: 'pospassword',
  port: 5432,
});

(async () => {
  await pool.query(
    'INSERT INTO sales (id, items, total, paymentmethod, receivedamount, changeamount, canceled) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    ['testnode', '[{"id":1,"price":1,"quantity":1}]', 1, 'cash', 10, 9, false]
  );
  const result = await pool.query('SELECT * FROM sales WHERE id = $1', ['testnode']);
  console.log(result.rows[0]);
  await pool.end();
})(); 