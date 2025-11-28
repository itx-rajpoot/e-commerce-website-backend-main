const mongoose = require('mongoose');

const sliderSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
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
  buttonText: {
    type: String,
    required: true,
    trim: true
  },
  buttonLink: {
    type: String,
    required: true,
    trim: true
  },
  active: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Slider', sliderSchema);