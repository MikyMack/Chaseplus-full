const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Blog title is required'],
    trim: true,
  },
  category: {
    type: String,
    required: [true, 'Blog category is required'],
    trim: true
  },
  date: {
    type: Date,
    required: [true, 'Blog date is required']
  },
  description: {
    type: String,
    required: [true, 'Blog description is required'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Blog content is required']
  },
  imageUrl: {
    type: String,
    required:true
  },
  metaTitle: {
    type: String,
    trim: true,
  },
  metaDescription: {
    type: String,
    trim: true,
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  author: {
    type: String,
    required: [true, 'Author name is required']
  },
  views: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true 
});

// Ensure meta fields have defaults if empty
blogSchema.pre('save', function(next) {
  if (!this.metaTitle) this.metaTitle = this.title;
  if (!this.metaDescription) {
    this.metaDescription = this.description.substring(0, 160);
  }
  next();
});

module.exports = mongoose.model('Blog', blogSchema);