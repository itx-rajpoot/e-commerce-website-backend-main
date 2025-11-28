const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { adminAuth } = require('../middleware/auth');
const Slider = require('../models/Slider');
const cloudinary = require('../utils/cloudinary');


const router = express.Router();

// Use memory storage for serverless compatibility
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

// Get all sliders
router.get('/', async (req, res) => {
  try {
    const sliders = await Slider.find().sort({ order: 1, createdAt: -1 });
    res.json(sliders);
  } catch (error) {
    console.error('Get sliders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get active sliders for frontend
router.get('/active', async (req, res) => {
  try {
    const sliders = await Slider.find({ active: true }).sort({ order: 1 });
    res.json(sliders);
  } catch (error) {
    console.error('Get active sliders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new slider
router.post('/', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const { title, description, buttonText, buttonLink, active, order } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Image is required' });
    }

    const slider = new Slider({
      title,
      description,
      image: '',
      buttonText,
      buttonLink,
      active: active === 'true',
      order: order || 0
    });

    // Upload buffer to Cloudinary if configured
    if (process.env.CLOUDINARY_URL && cloudinary && req.file && req.file.buffer) {
      try {
        const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        const uploadResult = await cloudinary.uploader.upload(dataUri, { folder: 'ecommerce/sliders' });
        slider.image = uploadResult.secure_url;
        slider.imagePublicId = uploadResult.public_id;
      } catch (err) {
        console.error('Cloudinary upload error for slider:', err);
        // Fallback: write to disk
        try {
          const uploadPath = 'uploads/sliders/';
          if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
          const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(req.file.originalname)}`;
          const fullPath = path.join(uploadPath, uniqueName);
          fs.writeFileSync(fullPath, req.file.buffer);
          slider.image = uniqueName;
        } catch (fsErr) {
          console.error('Failed to write uploaded slider file to disk as fallback:', fsErr);
        }
      }
    } else {
      // No Cloudinary configured - save file locally
      try {
        const uploadPath = 'uploads/sliders/';
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(req.file.originalname)}`;
        const fullPath = path.join(uploadPath, uniqueName);
        fs.writeFileSync(fullPath, req.file.buffer);
        slider.image = uniqueName;
      } catch (fsErr) {
        console.error('Failed to save slider file locally:', fsErr);
        return res.status(500).json({ message: 'Failed to save image' });
      }
    }

    await slider.save();
    res.status(201).json(slider);
  } catch (error) {
    console.error('Create slider error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update slider
router.put('/:id', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, buttonText, buttonLink, active, order } = req.body;

    const updateData = {
      title,
      description,
      buttonText,
      buttonLink,
      active: active === 'true',
      order: order || 0
    };

    // If new image is uploaded, update the image field and delete old image
    if (req.file) {
      const oldSlider = await Slider.findById(id);
      if (oldSlider && oldSlider.image) {
        if (!oldSlider.imagePublicId) {
          const oldImagePath = `uploads/sliders/${oldSlider.image}`;
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        } else if (process.env.CLOUDINARY_URL && cloudinary) {
          try {
            await cloudinary.uploader.destroy(oldSlider.imagePublicId);
          } catch (err) {
            console.warn('Failed to delete old slider image from Cloudinary:', err.message || err);
          }
        }
      }

      // Handle new upload (buffer -> cloudinary or local fallback)
      if (process.env.CLOUDINARY_URL && cloudinary && req.file && req.file.buffer) {
        try {
          const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
          const uploadResult = await cloudinary.uploader.upload(dataUri, { folder: 'ecommerce/sliders' });
          updateData.image = uploadResult.secure_url;
          updateData.imagePublicId = uploadResult.public_id;
        } catch (err) {
          console.error('Cloudinary upload error on slider update:', err);
        }
      } else {
        try {
          const uploadPath = 'uploads/sliders/';
          if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
          const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(req.file.originalname)}`;
          const fullPath = path.join(uploadPath, uniqueName);
          fs.writeFileSync(fullPath, req.file.buffer);
          updateData.image = uniqueName;
        } catch (fsErr) {
          console.error('Failed to save slider file locally on update:', fsErr);
        }
      }
    }

    const slider = await Slider.findByIdAndUpdate(id, updateData, { new: true });
    
    if (!slider) {
      return res.status(404).json({ message: 'Slider not found' });
    }

    res.json(slider);
  } catch (error) {
    console.error('Update slider error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete slider
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const slider = await Slider.findById(id);
    if (!slider) {
      return res.status(404).json({ message: 'Slider not found' });
    }

    // Delete image file or Cloudinary asset
    if (slider.image) {
      if (slider.imagePublicId && process.env.CLOUDINARY_URL && cloudinary) {
        try {
          await cloudinary.uploader.destroy(slider.imagePublicId);
        } catch (err) {
          console.warn('Failed to delete slider image from Cloudinary:', err.message || err);
        }
      } else {
        const imagePath = `uploads/sliders/${slider.image}`;
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
    }

    await Slider.findByIdAndDelete(id);
    res.json({ message: 'Slider deleted successfully' });
  } catch (error) {
    console.error('Delete slider error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update slider order
router.patch('/:id/order', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { order } = req.body;

    const slider = await Slider.findByIdAndUpdate(id, { order }, { new: true });
    
    if (!slider) {
      return res.status(404).json({ message: 'Slider not found' });
    }

    res.json(slider);
  } catch (error) {
    console.error('Update slider order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;