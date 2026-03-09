// The Undivided — Database Manager
// Handles sql.js initialization, persistence, and access

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'undivided.db');

let db = null;

async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    console.log('loaded existing database from', DB_PATH);
  } else {
    // Create fresh database with schema
    db = new SQL.Database();
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    db.run(schema);
    saveDatabase();
    console.log('created fresh database');
  }

  db.run('PRAGMA foreign_keys = ON');
  return db;
}

function getDb() {
  if (!db) throw new Error('database not initialized');
  return db;
}

function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Helper: run a query and return affected rows info
function run(sql, params = []) {
  const d = getDb();
  d.run(sql, params);
  const result = d.exec('SELECT last_insert_rowid() as id, changes() as changes');
  return {
    lastID: result[0]?.values[0][0] || 0,
    changes: result[0]?.values[0][1] || 0
  };
}

// Helper: get all rows from a query
function all(sql, params = []) {
  const d = getDb();
  const result = d.exec(sql, params);
  if (!result.length) return [];
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

// Helper: get one row
function get(sql, params = []) {
  const rows = all(sql, params);
  return rows[0] || null;
}

module.exports = { initDatabase, getDb, saveDatabase, run, all, get };
