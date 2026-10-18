// server.js
const express = require('express');
const logger = require('./middleware/logger'); // Import the logger middleware
const cors = require('cors'); // Import the CORS middleware

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:5173', 'https://myapp.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
})); // Use the CORS middleware
app.use(logger); // Use the logger middleware

// In-memory data store
let books = [
  {
    id: 1,
    title: 'Weep Not, Child',
    author: 'Ngugi wa Thiong\'o',
    isbn: '978-0143106692',
    price: 1200,
    category: 'fiction',
    inStock: true,
    createdAt: '2026-01-15T08:00:00Z'
  },
  {
    id: 2,
    title: 'Dust',
    author: 'Yvonne Adhiambo Owuor',
    isbn: '978-0345802545',
    price: 1800,
    category: 'fiction',
    inStock: true,
    createdAt: '2026-01-20T10:30:00Z'
  },
  {
    id: 3,
    title: 'Born a Crime',
    author: 'Trevor Noah',
    isbn: '978-0399588181',
    price: 1500,
    category: 'biography',
    inStock: false,
    createdAt: '2026-02-01T14:00:00Z'
  },
  {
    id: 4,
    title: 'The River Between',
    author: 'Ngugi wa Thiong\'o',
    isbn: '978-0143106715',
    price: 1100,
    category: 'fiction',
    inStock: true,
    createdAt: '2026-02-10T09:00:00Z'
  },
  {
    id: 5,
    title: 'Americanah',
    author: 'Chimamanda Ngozi Adichie',
    isbn: '978-0307455925',
    price: 1650,
    category: 'fiction',
    inStock: true,
    createdAt: '2026-02-15T11:00:00Z'
  }
];

let nextId = 6;

// ---------------------
// ROUTES
// ---------------------

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'Bookstore API',
    version: '1.0.0',
    endpoints: {
      books: '/api/books',
      singleBook: '/api/books/:id',
      stats: '/api/books/stats'
    }
  });
});

// GET /api/books -- Get all books (with optional filtering)
app.get('/api/books', (req, res) => {
  let results = [...books];

  // Filter by category
  if (req.query.category) {
    results = results.filter(b => b.category.toLowerCase() === req.query.category.toLowerCase());
  }

  // Filter by availability
  if (req.query.inStock !== undefined) {
    const inStock = req.query.inStock === 'true';
    results = results.filter(b => b.inStock === inStock);
  }

  // Search by title or author
  if (req.query.search) {
    const term = req.query.search.toLowerCase();
    results = results.filter(b =>
      b.title.toLowerCase().includes(term) ||
      b.author.toLowerCase().includes(term)
    );
  }

  // Sort
  if (req.query.sort === 'price') {
    results.sort((a, b) => a.price - b.price);
  } else if (req.query.sort === 'price_desc') {
    results.sort((a, b) => b.price - a.price);
  } else if (req.query.sort === 'title') {
    results.sort((a, b) => a.title.localeCompare(b.title));
  }

  res.json({
    count: results.length,
    books: results
  });
});

// GET /api/books/stats -- Get aggregate statistics (must come before /api/books/:id)
app.get('/api/books/stats', (req, res) => {
  const totalBooks = books.length;
  const inStockCount = books.filter(b => b.inStock).length;
  const outOfStockCount = totalBooks - inStockCount;
  const averagePrice = totalBooks > 0
    ? books.reduce((sum, b) => sum + b.price, 0) / totalBooks
    : 0;

  const categoryCounts = books.reduce((counts, b) => {
    counts[b.category] = (counts[b.category] || 0) + 1;
    return counts;
  }, {});

  res.json({
    totalBooks,
    inStockCount,
    outOfStockCount,
    averagePrice: Math.round(averagePrice * 100) / 100,
    categoryCounts
  });
});

// GET /api/books/:id -- Get a single book
app.get('/api/books/:id', (req, res) => {
  const book = books.find(b => b.id === parseInt(req.params.id));

  if (!book) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Book with ID ${req.params.id} does not exist`
    });
  }

  res.json(book);
});

// POST /api/books -- Create a new book
app.post('/api/books', (req, res) => {
  const { title, author, isbn, price, category, inStock } = req.body;

  // Validation
  const errors = [];

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    errors.push('title is required and must be a non-empty string');
  }

  if (!author || typeof author !== 'string' || author.trim().length === 0) {
    errors.push('author is required and must be a non-empty string');
  }

  if (!isbn || typeof isbn !== 'string') {
    errors.push('isbn is required and must be a string');
  }

  if (price === undefined || typeof price !== 'number' || price <= 0) {
    errors.push('price is required and must be a positive number');
  }

  if (!category || typeof category !== 'string') {
    errors.push('category is required and must be a string');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation Error',
      messages: errors
    });
  }

  // Check for duplicate ISBN
  const existingBook = books.find(b => b.isbn === isbn);
  if (existingBook) {
    return res.status(409).json({
      error: 'Conflict',
      message: `A book with ISBN ${isbn} already exists`
    });
  }

  const newBook = {
    id: nextId++,
    title: title.trim(),
    author: author.trim(),
    isbn,
    price,
    category: category.toLowerCase(),
    inStock: inStock !== undefined ? inStock : true,
    createdAt: new Date().toISOString()
  };

  books.push(newBook);

  res.status(201).json(newBook);
});

// PUT /api/books/:id -- Update a book
app.put('/api/books/:id', (req, res) => {
  const bookIndex = books.findIndex(b => b.id === parseInt(req.params.id));

  if (bookIndex === -1) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Book with ID ${req.params.id} does not exist`
    });
  }

  const { title, author, isbn, price, category, inStock } = req.body;

  // Validation
  const errors = [];

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    errors.push('title is required and must be a non-empty string');
  }

  if (!author || typeof author !== 'string' || author.trim().length === 0) {
    errors.push('author is required and must be a non-empty string');
  }

  if (!isbn || typeof isbn !== 'string') {
    errors.push('isbn is required and must be a string');
  }

  if (price === undefined || typeof price !== 'number' || price <= 0) {
    errors.push('price is required and must be a positive number');
  }

  if (!category || typeof category !== 'string') {
    errors.push('category is required and must be a string');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation Error',
      messages: errors
    });
  }

  // Update the book (preserve the original id and createdAt)
  books[bookIndex] = {
    ...books[bookIndex],
    title: title.trim(),
    author: author.trim(),
    isbn,
    price,
    category: category.toLowerCase(),
    inStock: inStock !== undefined ? inStock : books[bookIndex].inStock,
    updatedAt: new Date().toISOString()
  };

  res.json(books[bookIndex]);
});

// PATCH /api/books/:id -- Partially update a book
app.patch('/api/books/:id', (req, res) => {
  const bookIndex = books.findIndex(b => b.id === parseInt(req.params.id));

  if (bookIndex === -1) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Book with ID ${req.params.id} does not exist`
    });
  }

  const { title, author, isbn, price, category, inStock } = req.body;

  // Validation -- only validate fields that were actually provided
  const errors = [];

  if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
    errors.push('title must be a non-empty string');
  }

  if (author !== undefined && (typeof author !== 'string' || author.trim().length === 0)) {
    errors.push('author must be a non-empty string');
  }

  if (isbn !== undefined && typeof isbn !== 'string') {
    errors.push('isbn must be a string');
  }

  if (price !== undefined && (typeof price !== 'number' || price <= 0)) {
    errors.push('price must be a positive number');
  }

  if (category !== undefined && typeof category !== 'string') {
    errors.push('category must be a string');
  }

  if (inStock !== undefined && typeof inStock !== 'boolean') {
    errors.push('inStock must be a boolean');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation Error',
      messages: errors
    });
  }

  // Check for duplicate ISBN on another book
  if (isbn !== undefined) {
    const existingBook = books.find(b => b.isbn === isbn && b.id !== books[bookIndex].id);
    if (existingBook) {
      return res.status(409).json({
        error: 'Conflict',
        message: `A book with ISBN ${isbn} already exists`
      });
    }
  }

  books[bookIndex] = {
    ...books[bookIndex],
    ...req.body,
    ...(title !== undefined && { title: title.trim() }),
    ...(author !== undefined && { author: author.trim() }),
    ...(category !== undefined && { category: category.toLowerCase() }),
    id: books[bookIndex].id, // Never let the client change the ID
    updatedAt: new Date().toISOString()
  };

  res.json(books[bookIndex]);
});

// DELETE /api/books/:id -- Delete a book
app.delete('/api/books/:id', (req, res) => {
  const bookIndex = books.findIndex(b => b.id === parseInt(req.params.id));

  if (bookIndex === -1) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Book with ID ${req.params.id} does not exist`
    });
  }

  books.splice(bookIndex, 1);

  // 204 No Content -- successful deletion, nothing to send back
  res.status(204).send();
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.url}`
  });
});

app.listen(PORT, () => {
  console.log(`Bookstore API running at http://localhost:${PORT}`);
});