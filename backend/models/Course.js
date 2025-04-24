const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Course description is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Course category is required'],
    trim: true
  },
  image: {
    type: String,
    required: [true, 'Course image is required']
  },
  highlights: {
    type: [String],
    required: [true, 'At least one highlight is required']
  },
  whatYoullLearn: {
    type: [String],
    required: [true, 'At least one learning point is required']
  },
  careerOpportunities: {
    type: [String],
    required: [true, 'At least one career opportunity is required']
  },
  whyChooseThisCourse: {
    type: [String],
    required: [true, 'At least one reason to choose this course is required']
  },
  price: {
    type: Number,
    required: [true, 'Course price is required'],
    min: [0, 'Price cannot be negative']
  },
  offerPrice: {
    type: Number
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
courseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (!this.slug) {
    this.slug = this.title.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-');
  }
  next();
});

// Add a pre-save hook to validate category against Category model
courseSchema.pre('save', async function(next) {
  if (this.isModified('category')) {
    const Category = mongoose.model('Category');
    const categoryExists = await Category.findOne({ name: this.category });
    if (!categoryExists) {
      throw new Error(`Category "${this.category}" does not exist`);
    }
  }
  next();
});

module.exports = mongoose.model('Course', courseSchema);