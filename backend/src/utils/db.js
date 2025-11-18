import postgres from 'postgres';
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
console.log("DATABASE_URL:", connectionString);

const sql = postgres(connectionString, {
  ssl: 'require'
});

export default sql;
