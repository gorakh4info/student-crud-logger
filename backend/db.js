const sql = require("mssql/msnodesqlv8");

const BASE_CONFIG = {
  server: "(localdb)\\MSSQLLocalDB",
  driver: "msnodesqlv8",
  options: {
    trustedConnection: true,
    trustServerCertificate: true,
    encrypt: true,
  },
};

let pool = null;

const connect = async () => {
  if (pool) return pool;

  // Create the database if it does not exist yet
  const master = await new sql.ConnectionPool({
    ...BASE_CONFIG,
    database: "master",
  }).connect();

  await master.request().query(`
    IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'StudInfo')
      CREATE DATABASE StudInfo
  `);
  await master.close();

  // Connect to StudInfo and create the StudentFees table if needed
  pool = await new sql.ConnectionPool({
    ...BASE_CONFIG,
    database: "StudInfo",
  }).connect();

  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM sysobjects WHERE name = 'StudentFees' AND xtype = 'U'
    )
    CREATE TABLE StudentFees (
      Id    INT IDENTITY(1,1) PRIMARY KEY,
      Name  NVARCHAR(100)   NOT NULL,
      Age   INT             NOT NULL,
      Email NVARCHAR(200)   NOT NULL,
      Fees  DECIMAL(10, 2)  NOT NULL
    )
  `);

  return pool;
};

module.exports = { sql, connect };
