import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;

const PORT = Number(process.env.PORT || 3000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const MAX_BODY_BYTES = 8 * 1024 * 1024;
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(rootDir, "data");
const dbPath = path.join(dataDir, "marketplace.db");

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".svg", "image/svg+xml"],
  [".ico", "image/x-icon"],
]);

const seedCategories = [
  ["Informatique", "Ordinateurs, accessoires et reseaux"],
  ["Telephonie", "Smartphones, accessoires et objets connectes"],
  ["Maison", "Equipements utiles pour la maison et le bureau"],
  ["Mode", "Articles de style, chaussures et montres"],
  ["Industrie", "Equipements techniques et professionnels"],
];

const seedProducts = [
  {
    name: "Station de travail Atlas Pro 15",
    sku: "IT-LAP-1501",
    brand: "Atlas",
    category: "Informatique",
    price: 5900000,
    oldPrice: 6800000,
    stock: 18,
    rating: 4.7,
    reviews: 126,
    image:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1000&q=80",
    shortDescription: "Ordinateur portable professionnel pour productivite, analyse et creation.",
    description:
      "Une station de travail compacte avec ecran 15 pouces, chassis aluminium, stockage SSD rapide et autonomie adaptee aux longues journees de travail.",
    specs: ["Ecran 15 pouces IPS", "SSD 1 To", "RAM 32 Go", "Wi-Fi 6", "Clavier retroeclaire"],
    tags: ["ordinateur", "portable", "travail", "ssd"],
  },
  {
    name: "Serveur Ethernet Serie BGW312",
    sku: "NET-BGW312",
    brand: "BridgeWave",
    category: "Industrie",
    price: 1100000,
    oldPrice: 1250000,
    stock: 42,
    rating: 4.5,
    reviews: 38,
    image:
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1000&q=80",
    shortDescription: "Serveur de donnees Ethernet serie pour integration reseau industriel.",
    description:
      "Convertit des liaisons serie vers Ethernet afin de connecter des equipements industriels a un reseau TCP/IP. Adapte aux environnements de supervision, mesure et automatisation.",
    specs: ["Ethernet RJ45", "RS232/RS485", "TCP/IP", "Modbus TCP", "Alimentation 12-24 VDC"],
    tags: ["ethernet", "rs485", "modbus", "serveur"],
  },
  {
    name: "Smartphone Nova X",
    sku: "TEL-NOVAX",
    brand: "Nova",
    category: "Telephonie",
    price: 2850000,
    oldPrice: 3200000,
    stock: 30,
    rating: 4.6,
    reviews: 284,
    image:
      "https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=1000&q=80",
    shortDescription: "Smartphone performant avec grand ecran OLED et charge rapide.",
    description:
      "Concu pour les usages quotidiens intensifs: photographie, navigation, streaming, messagerie et applications professionnelles.",
    specs: ["Ecran OLED 6.5 pouces", "Stockage 256 Go", "5G", "Charge rapide", "Double SIM"],
    tags: ["smartphone", "telephone", "5g"],
  },
  {
    name: "Montre connectee Pulse Fit",
    sku: "TEL-PULSEFIT",
    brand: "Pulse",
    category: "Telephonie",
    price: 650000,
    oldPrice: 820000,
    stock: 75,
    rating: 4.4,
    reviews: 93,
    image:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80",
    shortDescription: "Suivi activite, notifications, cardio et autonomie longue duree.",
    description:
      "Une montre connectee simple a utiliser pour suivre l'activite, recevoir les notifications essentielles et surveiller les donnees de sante.",
    specs: ["Cardiofrequencemetre", "Etancheite 5 ATM", "Autonomie 7 jours", "Bluetooth", "Bracelet silicone"],
    tags: ["montre", "fitness", "bluetooth"],
  },
  {
    name: "Chaussures Urban Runner",
    sku: "MOD-URBANR",
    brand: "Stride",
    category: "Mode",
    price: 380000,
    oldPrice: 510000,
    stock: 120,
    rating: 4.3,
    reviews: 411,
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=80",
    shortDescription: "Chaussures legeres pour marche, ville et sport doux.",
    description:
      "Semelle confortable, tige respirante et design polyvalent pour alterner entre deplacements quotidiens et activites sportives legeres.",
    specs: ["Tige textile", "Semelle EVA", "Pointures 39-45", "Poids leger", "Usage ville/sport"],
    tags: ["chaussures", "mode", "sport"],
  },
  {
    name: "Camera securite HomeView 360",
    sku: "HOM-CAM360",
    brand: "HomeView",
    category: "Maison",
    price: 340000,
    oldPrice: 430000,
    stock: 64,
    rating: 4.2,
    reviews: 74,
    image:
      "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1000&q=80",
    shortDescription: "Camera Wi-Fi motorisee pour surveillance maison et bureau.",
    description:
      "Vision nocturne, rotation 360 degres, detection de mouvement et consultation a distance depuis une application mobile.",
    specs: ["Wi-Fi 2.4 GHz", "Vision nocturne", "Rotation 360 degres", "Audio bidirectionnel", "Carte microSD"],
    tags: ["camera", "wifi", "securite"],
  },
];

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function parseJsonList(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return String(value)
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function rowToProduct(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    brand: row.brand,
    category: row.category,
    price: Number(row.price),
    oldPrice: row.old_price === null || row.old_price === undefined ? null : Number(row.old_price),
    stock: Number(row.stock),
    rating: Number(row.rating),
    reviews: Number(row.reviews),
    image: row.image,
    videoUrl: row.video_url || "",
    shortDescription: row.short_description,
    description: row.description,
    specs: parseJsonList(row.specs),
    tags: parseJsonList(row.tags),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPgPlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

class PostgresDatabase {
  kind = "postgresql";

  constructor(connectionString) {
    this.pool = new Pool({
      connectionString,
      ssl: process.env.PGSSL === "disable" ? false : { rejectUnauthorized: false },
    });
  }

  async all(sql, params = []) {
    const { rows } = await this.pool.query(toPgPlaceholders(sql), params);
    return rows;
  }

  async get(sql, params = []) {
    const rows = await this.all(sql, params);
    return rows[0] || null;
  }

  async run(sql, params = [], options = {}) {
    const returning = options.returnId ? " RETURNING id" : "";
    const result = await this.pool.query(toPgPlaceholders(`${sql}${returning}`), params);
    return { changes: result.rowCount, lastInsertRowid: result.rows[0]?.id };
  }

  async exec(sql) {
    await this.pool.query(sql);
  }

  async transaction(callback) {
    const client = await this.pool.connect();
    const session = {
      all: async (sql, params = []) => (await client.query(toPgPlaceholders(sql), params)).rows,
      get: async (sql, params = []) => {
        const { rows } = await client.query(toPgPlaceholders(sql), params);
        return rows[0] || null;
      },
      run: async (sql, params = [], options = {}) => {
        const returning = options.returnId ? " RETURNING id" : "";
        const result = await client.query(toPgPlaceholders(`${sql}${returning}`), params);
        return { changes: result.rowCount, lastInsertRowid: result.rows[0]?.id };
      },
    };

    try {
      await client.query("BEGIN");
      const value = await callback(session);
      await client.query("COMMIT");
      return value;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

class SqliteDatabase {
  kind = "sqlite";

  constructor(filePath) {
    this.filePath = filePath;
  }

  async connect() {
    mkdirSync(dataDir, { recursive: true });
    const { DatabaseSync } = await import("node:sqlite");
    this.db = new DatabaseSync(this.filePath);
    this.db.exec("PRAGMA foreign_keys = ON");
    this.db.exec("PRAGMA journal_mode = WAL");
  }

  async all(sql, params = []) {
    return this.db.prepare(sql).all(...params);
  }

  async get(sql, params = []) {
    return this.db.prepare(sql).get(...params) || null;
  }

  async run(sql, params = []) {
    const result = this.db.prepare(sql).run(...params);
    return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
  }

  async exec(sql) {
    this.db.exec(sql);
  }

  async transaction(callback) {
    const session = {
      all: (sql, params = []) => this.db.prepare(sql).all(...params),
      get: (sql, params = []) => this.db.prepare(sql).get(...params) || null,
      run: (sql, params = []) => {
        const result = this.db.prepare(sql).run(...params);
        return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
      },
    };

    try {
      this.db.exec("BEGIN IMMEDIATE");
      const value = await callback(session);
      this.db.exec("COMMIT");
      return value;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
}

async function createDatabase() {
  if (process.env.DATABASE_URL) {
    const database = new PostgresDatabase(process.env.DATABASE_URL);
    await database.get("SELECT 1 AS ok");
    return database;
  }

  const database = new SqliteDatabase(dbPath);
  await database.connect();
  return database;
}

function sqliteSchema() {
  return `
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      sku TEXT NOT NULL UNIQUE,
      brand TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      old_price REAL,
      stock INTEGER NOT NULL DEFAULT 0,
      rating REAL NOT NULL DEFAULT 0,
      reviews INTEGER NOT NULL DEFAULT 0,
      image TEXT NOT NULL DEFAULT '',
      video_url TEXT NOT NULL DEFAULT '',
      short_description TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      specs TEXT NOT NULL DEFAULT '[]',
      tags TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      total REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'nouvelle',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      unit_price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      line_total REAL NOT NULL,
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id)
    );
  `;
}

function postgresSchema() {
  return `
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      sku TEXT NOT NULL UNIQUE,
      brand TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL,
      price DOUBLE PRECISION NOT NULL DEFAULT 0,
      old_price DOUBLE PRECISION,
      stock INTEGER NOT NULL DEFAULT 0,
      rating DOUBLE PRECISION NOT NULL DEFAULT 0,
      reviews INTEGER NOT NULL DEFAULT 0,
      image TEXT NOT NULL DEFAULT '',
      video_url TEXT NOT NULL DEFAULT '',
      short_description TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      specs TEXT NOT NULL DEFAULT '[]',
      tags TEXT NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      order_number TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      total DOUBLE PRECISION NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'nouvelle',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      unit_price DOUBLE PRECISION NOT NULL,
      quantity INTEGER NOT NULL,
      line_total DOUBLE PRECISION NOT NULL
    );
  `;
}

async function initializeDatabase(db) {
  await db.exec(db.kind === "postgresql" ? postgresSchema() : sqliteSchema());
  await ensureProductVideoColumn(db);

  const categoryCount = Number((await db.get("SELECT COUNT(*) AS total FROM categories")).total);
  if (categoryCount === 0) {
    for (const [name, description] of seedCategories) {
      await insertCategory(db, name, description);
    }
  }

  const productCount = Number((await db.get("SELECT COUNT(*) AS total FROM products")).total);
  if (productCount === 0) {
    for (const product of seedProducts) {
      await insertProduct(db, normalizeProductInput(product), { seedSlug: slugify(product.name) });
    }
  }

  await migrateSeedProductPricesToAriary(db);
}

async function ensureProductVideoColumn(db) {
  if (db.kind === "postgresql") {
    await db.exec("ALTER TABLE products ADD COLUMN IF NOT EXISTS video_url TEXT NOT NULL DEFAULT ''");
    return;
  }

  const columns = await db.all("PRAGMA table_info(products)");
  if (!columns.some((column) => column.name === "video_url")) {
    await db.exec("ALTER TABLE products ADD COLUMN video_url TEXT NOT NULL DEFAULT ''");
  }
}

async function migrateSeedProductPricesToAriary(db) {
  for (const product of seedProducts) {
    await db.run("UPDATE products SET price = ?, old_price = ?, updated_at = CURRENT_TIMESTAMP WHERE sku = ? AND price < 100000", [
      product.price,
      product.oldPrice,
      product.sku,
    ]);
  }
}

async function insertCategory(db, name, description = "") {
  if (!name) return;
  if (db.kind === "postgresql") {
    await db.run("INSERT INTO categories (name, description) VALUES (?, ?) ON CONFLICT (name) DO NOTHING", [
      name,
      description,
    ]);
    return;
  }
  await db.run("INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)", [name, description]);
}

function normalizeCategoryInput(input) {
  const name = String(input.name ?? "").trim();
  if (!name) {
    const error = new Error("Le nom de la categorie est obligatoire");
    error.status = 400;
    throw error;
  }
  return {
    name,
    description: String(input.description ?? "").trim(),
  };
}

async function listCategories(db) {
  const categories = await db.all(
    `SELECT c.id, c.name, c.description, COUNT(p.id) AS products
     FROM categories c
     LEFT JOIN products p ON p.category = c.name
     GROUP BY c.id, c.name, c.description
     ORDER BY c.name ASC`,
  );
  return categories.map((category) => ({ ...category, id: Number(category.id), products: Number(category.products) }));
}

async function getCategory(db, id) {
  const rows = await db.all(
    `SELECT c.id, c.name, c.description, COUNT(p.id) AS products
     FROM categories c
     LEFT JOIN products p ON p.category = c.name
     WHERE c.id = ?
     GROUP BY c.id, c.name, c.description`,
    [id],
  );
  const category = rows[0];
  return category ? { ...category, id: Number(category.id), products: Number(category.products) } : null;
}

async function findCategoryByName(db, name) {
  return db.get("SELECT * FROM categories WHERE lower(name) = lower(?)", [name]);
}

async function createCategory(db, input) {
  const existing = await findCategoryByName(db, input.name);
  if (existing) {
    const error = new Error("Cette categorie existe deja");
    error.status = 409;
    throw error;
  }
  const result = await db.run("INSERT INTO categories (name, description) VALUES (?, ?)", [input.name, input.description], {
    returnId: true,
  });
  return getCategory(db, Number(result.lastInsertRowid));
}

async function updateCategory(db, id, input) {
  const current = await getCategory(db, id);
  if (!current) return null;

  const duplicate = await findCategoryByName(db, input.name);
  if (duplicate && Number(duplicate.id) !== id) {
    const error = new Error("Une autre categorie utilise deja ce nom");
    error.status = 409;
    throw error;
  }

  await db.transaction(async (tx) => {
    await tx.run("UPDATE categories SET name = ?, description = ? WHERE id = ?", [input.name, input.description, id]);
    await tx.run("UPDATE products SET category = ? WHERE category = ?", [input.name, current.name]);
  });

  return getCategory(db, id);
}

async function deleteCategory(db, id, reassignTo = "") {
  const current = await getCategory(db, id);
  if (!current) return null;

  if (current.products > 0) {
    const target = reassignTo.trim();
    if (!target) {
      const error = new Error(`Cette categorie contient ${current.products} article(s)`);
      error.status = 400;
      error.products = current.products;
      throw error;
    }
    if (target.toLowerCase() === current.name.toLowerCase()) {
      const error = new Error("La categorie de remplacement doit etre differente");
      error.status = 400;
      throw error;
    }
    await insertCategory(db, target, "Categorie creee automatiquement lors d'une suppression");
    await db.transaction(async (tx) => {
      await tx.run("UPDATE products SET category = ? WHERE category = ?", [target, current.name]);
      await tx.run("DELETE FROM categories WHERE id = ?", [id]);
    });
  } else {
    await db.run("DELETE FROM categories WHERE id = ?", [id]);
  }

  return { ok: true, movedProducts: current.products, reassignTo: current.products > 0 ? reassignTo : null };
}

function normalizeProductInput(input, current = {}) {
  const name = String(input.name ?? current.name ?? "").trim();
  if (!name) {
    const error = new Error("Le nom du produit est obligatoire");
    error.status = 400;
    throw error;
  }

  const sku = String(input.sku ?? current.sku ?? "").trim() || `SKU-${Date.now()}`;
  const baseSlug = slugify(input.slug || name);

  return {
    name,
    slug: current.id ? current.slug : `${baseSlug}-${Date.now().toString(36)}`,
    sku,
    brand: String(input.brand ?? current.brand ?? "").trim(),
    category: String(input.category ?? current.category ?? "Maison").trim(),
    price: Number(input.price ?? current.price ?? 0),
    oldPrice: input.oldPrice === "" ? null : Number(input.oldPrice ?? current.oldPrice ?? 0) || null,
    stock: Math.max(0, Number.parseInt(input.stock ?? current.stock ?? 0, 10) || 0),
    rating: Math.min(5, Math.max(0, Number(input.rating ?? current.rating ?? 0) || 0)),
    reviews: Math.max(0, Number.parseInt(input.reviews ?? current.reviews ?? 0, 10) || 0),
    image: String(input.image ?? current.image ?? "").trim(),
    videoUrl: String(input.videoUrl ?? input.video_url ?? current.videoUrl ?? "").trim(),
    shortDescription: String(input.shortDescription ?? input.short_description ?? current.shortDescription ?? "").trim(),
    description: String(input.description ?? current.description ?? "").trim(),
    specs: parseJsonList(input.specs ?? current.specs),
    tags: parseJsonList(input.tags ?? current.tags),
  };
}

async function insertProduct(db, input, options = {}) {
  await insertCategory(db, input.category);
  const result = await db.run(
    `INSERT INTO products (
      name, slug, sku, brand, category, price, old_price, stock, rating, reviews,
      image, video_url, short_description, description, specs, tags
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.name,
      options.seedSlug || input.slug,
      input.sku,
      input.brand,
      input.category,
      input.price,
      input.oldPrice,
      input.stock,
      input.rating,
      input.reviews,
      input.image,
      input.videoUrl,
      input.shortDescription,
      input.description,
      JSON.stringify(input.specs),
      JSON.stringify(input.tags),
    ],
    { returnId: true },
  );
  return Number(result.lastInsertRowid);
}

async function updateProduct(db, id, input) {
  await insertCategory(db, input.category);
  await db.run(
    `UPDATE products
     SET name = ?, sku = ?, brand = ?, category = ?, price = ?, old_price = ?, stock = ?,
         rating = ?, reviews = ?, image = ?, video_url = ?, short_description = ?, description = ?,
         specs = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      input.name,
      input.sku,
      input.brand,
      input.category,
      input.price,
      input.oldPrice,
      input.stock,
      input.rating,
      input.reviews,
      input.image,
      input.videoUrl,
      input.shortDescription,
      input.description,
      JSON.stringify(input.specs),
      JSON.stringify(input.tags),
      id,
    ],
  );
}

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function notFound(res) {
  json(res, 404, { error: "Ressource introuvable" });
}

function requireAdmin(req, res) {
  if (!ADMIN_PASSWORD) return true;
  if (req.headers["x-admin-password"] === ADMIN_PASSWORD) return true;
  json(res, 401, { error: "Mot de passe administrateur requis" });
  return false;
}

async function readBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) {
      const error = new Error("Image ou donnees trop volumineuses. Taille maximum: 8 Mo");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString("utf-8");
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("Corps JSON invalide");
    error.status = 400;
    throw error;
  }
}

async function listProducts(db, url) {
  const search = url.searchParams.get("search")?.trim();
  const category = url.searchParams.get("category")?.trim();
  const minPriceRaw = url.searchParams.get("minPrice");
  const maxPriceRaw = url.searchParams.get("maxPrice");
  const minPrice = minPriceRaw === null || minPriceRaw === "" ? null : Number(minPriceRaw);
  const maxPrice = maxPriceRaw === null || maxPriceRaw === "" ? null : Number(maxPriceRaw);
  const sort = url.searchParams.get("sort") || "newest";
  const where = [];
  const params = [];

  if (search) {
    const term = `%${search.toLowerCase()}%`;
    where.push(`(
      lower(name) LIKE ? OR lower(brand) LIKE ? OR lower(sku) LIKE ? OR
      lower(short_description) LIKE ? OR lower(description) LIKE ? OR lower(tags) LIKE ?
    )`);
    params.push(term, term, term, term, term, term);
  }

  if (category && category !== "Toutes") {
    where.push("category = ?");
    params.push(category);
  }

  if (minPrice !== null && Number.isFinite(minPrice)) {
    where.push("price >= ?");
    params.push(minPrice);
  }

  if (maxPrice !== null && Number.isFinite(maxPrice)) {
    where.push("price <= ?");
    params.push(maxPrice);
  }

  const sortMap = {
    newest: "created_at DESC",
    price_asc: "price ASC",
    price_desc: "price DESC",
    rating: "rating DESC, reviews DESC",
    stock: "stock DESC",
    name: "name ASC",
  };

  const sql = `
    SELECT * FROM products
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY ${sortMap[sort] || sortMap.newest}
  `;

  return (await db.all(sql, params)).map(rowToProduct);
}

async function getProduct(db, id) {
  return rowToProduct(await db.get("SELECT * FROM products WHERE id = ?", [id]));
}

async function deleteOrder(db, id) {
  const order = await db.get("SELECT * FROM orders WHERE id = ?", [id]);
  if (!order) return null;

  let restoredItems = 0;
  await db.transaction(async (tx) => {
    const items = await tx.all("SELECT product_id, quantity FROM order_items WHERE order_id = ?", [id]);
    for (const item of items) {
      await tx.run("UPDATE products SET stock = stock + ? WHERE id = ?", [Number(item.quantity), Number(item.product_id)]);
      restoredItems += Number(item.quantity);
    }
    await tx.run("DELETE FROM orders WHERE id = ?", [id]);
  });

  return {
    ok: true,
    orderNumber: order.order_number,
    restoredItems,
  };
}

async function handleApi(db, req, res, url) {
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/health") {
    json(res, 200, {
      ok: true,
      database: db.kind,
      storage: db.kind === "postgresql" ? "DATABASE_URL" : dbPath,
      adminProtected: Boolean(ADMIN_PASSWORD),
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/config") {
    json(res, 200, { passwordRequired: Boolean(ADMIN_PASSWORD) });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/categories") {
    json(res, 200, await listCategories(db));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/categories") {
    if (!requireAdmin(req, res)) return;
    json(res, 201, await createCategory(db, normalizeCategoryInput(await readBody(req))));
    return;
  }

  const categoryMatch = url.pathname.match(/^\/api\/categories\/(\d+)$/);
  if (req.method === "PUT" && categoryMatch) {
    if (!requireAdmin(req, res)) return;
    const category = await updateCategory(db, Number(categoryMatch[1]), normalizeCategoryInput(await readBody(req)));
    category ? json(res, 200, category) : notFound(res);
    return;
  }

  if (req.method === "DELETE" && categoryMatch) {
    if (!requireAdmin(req, res)) return;
    const result = await deleteCategory(db, Number(categoryMatch[1]), url.searchParams.get("reassign") || "");
    result ? json(res, 200, result) : notFound(res);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/products") {
    json(res, 200, await listProducts(db, url));
    return;
  }

  const productMatch = url.pathname.match(/^\/api\/products\/(\d+)$/);
  if (req.method === "GET" && productMatch) {
    const product = await getProduct(db, Number(productMatch[1]));
    product ? json(res, 200, product) : notFound(res);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/products") {
    if (!requireAdmin(req, res)) return;
    const input = normalizeProductInput(await readBody(req));
    const id = await insertProduct(db, input);
    json(res, 201, await getProduct(db, id));
    return;
  }

  if (req.method === "PUT" && productMatch) {
    if (!requireAdmin(req, res)) return;
    const id = Number(productMatch[1]);
    const current = await getProduct(db, id);
    if (!current) return notFound(res);

    const input = normalizeProductInput(await readBody(req), current);
    await updateProduct(db, id, input);
    json(res, 200, await getProduct(db, id));
    return;
  }

  if (req.method === "DELETE" && productMatch) {
    if (!requireAdmin(req, res)) return;
    const id = Number(productMatch[1]);
    const result = await db.run("DELETE FROM products WHERE id = ?", [id]);
    if (result.changes === 0) return notFound(res);
    json(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/stats") {
    if (!requireAdmin(req, res)) return;
    const productCount = Number((await db.get("SELECT COUNT(*) AS total FROM products")).total);
    const categoryCount = Number((await db.get("SELECT COUNT(*) AS total FROM categories")).total);
    const lowStock = Number((await db.get("SELECT COUNT(*) AS total FROM products WHERE stock <= 5")).total);
    const orderCount = Number((await db.get("SELECT COUNT(*) AS total FROM orders")).total);
    const revenue = Number((await db.get("SELECT COALESCE(SUM(total), 0) AS total FROM orders")).total);
    json(res, 200, { productCount, categoryCount, lowStock, orderCount, revenue });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/orders") {
    if (!requireAdmin(req, res)) return;
    json(res, 200, await db.all("SELECT * FROM orders ORDER BY created_at DESC LIMIT 50"));
    return;
  }

  const orderMatch = url.pathname.match(/^\/api\/orders\/(\d+)$/);
  if (req.method === "DELETE" && orderMatch) {
    if (!requireAdmin(req, res)) return;
    const result = await deleteOrder(db, Number(orderMatch[1]));
    result ? json(res, 200, result) : notFound(res);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/orders") {
    const body = await readBody(req);
    const items = Array.isArray(body.items) ? body.items : [];
    const customer = body.customer || {};
    const customerName = String(customer.name || "").trim();
    const customerEmail = String(customer.email || "").trim();
    const customerPhone = String(customer.phone || "").trim();
    const address = String(customer.address || "").trim();

    if (!customerName || !customerEmail || items.length === 0) {
      json(res, 400, { error: "Client et panier obligatoires" });
      return;
    }

    const orderItems = [];
    let total = 0;

    for (const item of items) {
      const quantity = Math.max(1, Number.parseInt(item.quantity, 10) || 1);
      const product = await getProduct(db, Number(item.productId || item.id));
      if (!product) {
        json(res, 400, { error: `Produit introuvable: ${item.productId || item.id}` });
        return;
      }
      if (product.stock < quantity) {
        json(res, 400, { error: `Stock insuffisant pour ${product.name}` });
        return;
      }
      const lineTotal = product.price * quantity;
      total += lineTotal;
      orderItems.push({ product, quantity, lineTotal });
    }

    const orderNumber = `CMD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID()
      .slice(0, 8)
      .toUpperCase()}`;

    await db.transaction(async (tx) => {
      const result = await tx.run(
        `INSERT INTO orders (
          order_number, customer_name, customer_email, customer_phone, address, total
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [orderNumber, customerName, customerEmail, customerPhone, address, total],
        { returnId: true },
      );

      const orderId = Number(result.lastInsertRowid);

      for (const item of orderItems) {
        await tx.run(
          `INSERT INTO order_items (
            order_id, product_id, product_name, unit_price, quantity, line_total
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [orderId, item.product.id, item.product.name, item.product.price, item.quantity, item.lineTotal],
        );
        await tx.run("UPDATE products SET stock = stock - ? WHERE id = ?", [item.quantity, item.product.id]);
      }
    });

    json(res, 201, { orderNumber, total });
    return;
  }

  notFound(res);
}

function serveStatic(req, res, url) {
  const pathname = decodeURIComponent(url.pathname);
  let requested = pathname === "/" ? "/index.html" : pathname;
  requested = requested.replace(/\\/g, "/");

  const firstSegment = requested.split("/").filter(Boolean)[0];
  const allowed = requested === "/index.html" || firstSegment === "assets";
  if (!allowed) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const filePath = path.join(rootDir, requested);
  const relative = path.relative(rootDir, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative) || !existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes.get(ext) || "application/octet-stream";
  const file = readFileSync(filePath);
  res.writeHead(200, {
    "Content-Type": contentType,
    "Content-Length": file.length,
  });
  res.end(file);
}

async function start() {
  const db = await createDatabase();
  await initializeDatabase(db);

  const server = createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    try {
      if (url.pathname.startsWith("/api/")) {
        await handleApi(db, req, res, url);
        return;
      }
      serveStatic(req, res, url);
    } catch (error) {
      const status = error.status || 500;
      json(res, status, { error: error.message || "Erreur serveur" });
    }
  });

  server.listen(PORT, () => {
    console.log(`Marketplace demarree: http://localhost:${PORT}`);
    console.log(`Base utilisee: ${db.kind === "postgresql" ? "PostgreSQL" : dbPath}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
