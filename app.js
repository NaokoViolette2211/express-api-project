const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();

require('dotenv').config();

const port = process.env.PORT;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

/* Note: app.use()
The `use` functions are the middleware - they get called before an endpoint is hit
*/
app.use(async function(req, res, next) {
  try {
    req.db = await pool.getConnection();
    req.db.connection.config.namedPlaceholders = true; 
    /* NOTE: Ex.
    named placeholder => const query = 'INSERT INTO users (name, email) VALUES (:name, :email)'; 
    regular placeholder => const query = 'INSERT INTO users (name, email) VALUES (?, ?)'; 
    */

    await req.db.query(`SET SESSION sql_mode = "TRADITIONAL"`);
    /* NOTE: 
    "TRADITIONAL" mode is a mode that performs strict error checking when executing SQL, with strict rules regarding syntax errors and data integrity. 
    */

    await req.db.query(`SET time_zone = '-8:00'`);

    await next();

    req.db.release();
  } catch (err) {
    console.log(err);
    if (req.db) req.db.release();
    throw err;
  }
});

app.use(cors());

app.use(express.json());

app.get('/cars', async function(req, res) {
  try {
    console.log('/cars/:id')
    
    const [cars] = await req.db.query(`
    SELECT * FROM cars WHERE deleted_flag = 0`);
    res.json( cars );
    // console.log(cars[0])
  } catch (err) {
    console.log(`error`, err);
  }
});

app.use(async function(req, res, next) {
  try {
    console.log('Middleware after the get /cars');
  
    await next();

  } catch (err) {
    console.log(err);
    res.json({ err });
  }
});

app.post('/cars', async function(req, res) {
  try {
    const { make, model, year } = req.body;
  
    const insert = await req.db.query(
      `INSERT INTO cars (make, model, year, date_created) 
      VALUES (:make, :model, :year, NOW())`,{
        make, model, year
        // make: req.body.make,
        // model: req.body.model,
        // year: req.body.year
      }
    );
    res.json({ success: true, message: 'Cars successfully created', data: null });
    console.log(insert)
  } catch (err) {
    res.json({ success: false, message: err, data: null })
    console.log(`error:`, err)
  }
});

app.delete('/cars/:id', async function(req,res) {
  try {
    console.log('req.params /cars/:id', req.params)
    const deleteRow = await req.db.query(`
    UPDATE cars SET deleted_flag = 1 WHERE id = :id`, {
      id: req.params.id
    });
    res.json({ success: true, message: 'Cars successfully deleted', data: null })
  } catch (err) {
    console.log(err);
    res.json({ success: false, message: err, data: null });
  }
}); 

app.put('/cars/:id', async function(req,res) {
  try {
    const modifyData = await req.db.query(`
    UPDATE cars SET year = :year WHERE id = :id`, {
      id: req.params.id,
      year: req.body.year
    });
    res.json({ success: true, message: 'Cars successfully updated', data: null });
  } catch (err) {
    console.log(err);
    res.json({ success: false, message: err, data: null });
  }
});

app.put('/addcolumn', async (req, res) => {
  try{
    const addColumn = await req.db.query(`
    ALTER TABLE cars ADD COLUMN date_created DATETIME AFTER year`
    );
    res.json({ success: true, message: 'new column successfully added', data: null });
  } catch (err) {
    console.error(err);
    res.json({success: false, message: err, data: null});
  }
})

app.listen(port, () => console.log(`APP listening on http://localhost:${port}`));