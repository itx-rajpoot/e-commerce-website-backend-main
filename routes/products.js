const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { adminAuth } = require('../middleware/auth');
const Product = require('../models/Product');
const Category = require('../models/Category');
const cloudinary = require('../utils/cloudinary');

const router = express.Router();

// Configure multer for file uploads - use memoryStorage to be serverless-friendly
// Use memory storage for serverless compatibility (upload buffer to Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get all products
router.get('/', async (req, res) => {
  try {
    const { category, featured, search } = req.query;
    let filter = {};

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (featured === 'true') {
      filter.featured = true;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get featured products
router.get('/featured', async (req, res) => {
  try {
    const products = await Product.find({ featured: true }).sort({ createdAt: -1 }).limit(8);
    res.json(products);
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new product
router.post('/', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category, stock, featured } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Product image is required' });
    }

    const product = new Product({
      name,
      description,
      price: parseFloat(price),
      image: '',
      category,
      stock: parseInt(stock),
      featured: featured === 'true'
    });

    // If Cloudinary is configured, upload the buffer and set secure URL
    if (process.env.CLOUDINARY_URL && cloudinary && req.file && req.file.buffer) {
      try {
        const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        const uploadResult = await cloudinary.uploader.upload(dataUri, { folder: 'ecommerce/products' });
        product.image = uploadResult.secure_url;
        product.imagePublicId = uploadResult.public_id;
      } catch (err) {
        console.error('Cloudinary upload error:', err);
        // Fallback: write to disk if possible
        try {
          const uploadPath = 'uploads/products/';
          if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
          const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(req.file.originalname)}`;
          const fullPath = path.join(uploadPath, uniqueName);
          fs.writeFileSync(fullPath, req.file.buffer);
          product.image = uniqueName;
        } catch (fsErr) {
          console.error('Failed to write uploaded file to disk as fallback:', fsErr);
        }
      }
    } else {
      // No Cloudinary configured - save file locally
      try {
        const uploadPath = 'uploads/products/';
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(req.file.originalname)}`;
        const fullPath = path.join(uploadPath, uniqueName);
        fs.writeFileSync(fullPath, req.file.buffer);
        product.image = uniqueName;
      } catch (fsErr) {
        console.error('Failed to save file locally:', fsErr);
        return res.status(500).json({ message: 'Failed to save image' });
      }
    }

    await product.save();
    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update product
router.put('/:id', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category, stock, featured } = req.body;

    const updateData = {
      name,
      description,
      price: parseFloat(price),
      category,
      stock: parseInt(stock),
      featured: featured === 'true'
    };

    // If new image is uploaded, update the image field and delete old image
    if (req.file) {
      const oldProduct = await Product.findById(id);
      if (oldProduct && oldProduct.image) {
        // If image was stored locally (no public id), delete old local file
        if (!oldProduct.imagePublicId) {
          const oldImagePath = `uploads/products/${oldProduct.image}`;
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        } else if (process.env.CLOUDINARY_URL && cloudinary) {
          // If image was on Cloudinary, attempt to delete it
          try {
            await cloudinary.uploader.destroy(oldProduct.imagePublicId);
          } catch (err) {
            console.warn('Failed to delete old image from Cloudinary:', err.message || err);
          }
        }
      }

      // Handle new upload buffer -> Cloudinary or local fallback
      if (process.env.CLOUDINARY_URL && cloudinary && req.file && req.file.buffer) {
        try {
          const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
          const uploadResult = await cloudinary.uploader.upload(dataUri, { folder: 'ecommerce/products' });
          updateData.image = uploadResult.secure_url;
          updateData.imagePublicId = uploadResult.public_id;
        } catch (err) {
          console.error('Cloudinary upload error on update:', err);
          // fallback to write buffer to disk
          try {
            const uploadPath = 'uploads/products/';
            if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
            const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(req.file.originalname)}`;
            const fullPath = path.join(uploadPath, uniqueName);
            fs.writeFileSync(fullPath, req.file.buffer);
            updateData.image = uniqueName;
          } catch (fsErr) {
            console.error('Failed to save uploaded file to disk as fallback on update:', fsErr);
          }
        }
      } else {
        // No Cloudinary - save locally
        try {
          const uploadPath = 'uploads/products/';
          if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
          const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(req.file.originalname)}`;
          const fullPath = path.join(uploadPath, uniqueName);
          fs.writeFileSync(fullPath, req.file.buffer);
          updateData.image = uniqueName;
        } catch (fsErr) {
          console.error('Failed to save uploaded file locally on update:', fsErr);
        }
      }
    }

    const product = await Product.findByIdAndUpdate(id, updateData, { new: true });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete product
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Delete image file or Cloudinary asset
    if (product.image) {
      if (product.imagePublicId && process.env.CLOUDINARY_URL && cloudinary) {
        try {
          await cloudinary.uploader.destroy(product.imagePublicId);
        } catch (err) {
          console.warn('Failed to delete product image from Cloudinary:', err.message || err);
        }
      } else {
        const imagePath = `uploads/products/${product.image}`;
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
    }

    await Product.findByIdAndDelete(id);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get categories
router.get('/categories/all', async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create category (admin only)
router.post('/categories', adminAuth, async (req, res) => {
  try {
    const { name, description } = req.body;

    const category = new Category({
      name,
      description
    });

    await category.save();
    res.status(201).json(category);
  } catch (error) {
    console.error('Create category error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Category already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;