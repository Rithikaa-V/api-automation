export const seedUsers = [
  { email: 'admin@example.test', password: 'Password123!', role: 'admin' },
  { email: 'customer@example.test', password: 'Password123!', role: 'customer' },
] as const;

// Every name starts with "Seeded" so tests can tell seed rows from the records they create.
export const seedProducts = [
  { name: 'Seeded API Test Product', description: 'Seed data for API quality tests', price: 24.5, stock: 15 },
  { name: 'Seeded Mechanical Keyboard', description: 'Tenkeyless, brown switches', price: 89.99, stock: 40 },
  { name: 'Seeded USB-C Hub', description: '7-in-1 hub with HDMI and card reader', price: 34, stock: 120 },
  { name: 'Seeded Wireless Mouse', description: '2.4 GHz receiver, 12 month battery', price: 24.99, stock: 75 },
  { name: 'Seeded 27in Monitor', description: '1440p IPS panel', price: 249, stock: 18 },
  { name: 'Seeded Laptop Stand', description: 'Aluminium, foldable', price: 39.5, stock: 60 },
  { name: 'Seeded Webcam 1080p', description: 'Fixed focus, built-in microphone', price: 59.9, stock: 33 },
  { name: 'Seeded Desk Lamp', description: 'Out of stock on purpose', price: 19.99, stock: 0 },
  { name: 'Seeded Noise-Cancelling Headset', description: 'Over-ear, wired and Bluetooth', price: 129, stock: 22 },
  { name: 'Seeded Ergonomic Chair', description: 'Mesh back, adjustable lumbar support', price: 319, stock: 6 },
  { name: 'Seeded Cable Organiser', description: 'Pack of 10 velcro ties', price: 7.25, stock: 300 },
  // The literal % is used by the search tests to check LIKE wildcards are escaped.
  { name: 'Seeded 100% Cotton Tee', description: 'Plain crew neck', price: 15, stock: 80 },
  { name: 'Seeded Free Sample', description: 'Zero price boundary case', price: 0, stock: 500 },
] as const;
