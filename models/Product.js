const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  image: {
<<<<<<< HEAD
    type: String, // This will store the filename or URL when using Cloudinary
    required: true
  },
  imagePublicId: {
    type: String, // Cloudinary public_id (optional)
  },
=======
    type: String, // This will store the filename
    required: true
  },
>>>>>>> bca34f2452cecc9fe5804b568e05e10cb379f836
  category: {
    type: String,
    required: true,
    trim: true
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  featured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);