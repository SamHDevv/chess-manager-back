import "reflect-metadata";
import { DataSource } from "typeorm";
import dotenv from "dotenv";
import * as path from "path";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // In development we want TypeORM to auto-sync schema so new columns from
  // entities are created automatically. In production keep synchronize=false.
  synchronize: process.env.NODE_ENV !== "production",
  logging: true,
  entities: [path.join(__dirname, "../entities/*.{js,ts}")],
  migrations: [path.join(__dirname, "../migrations/*.{js,ts}")],
  subscribers: [],
});
