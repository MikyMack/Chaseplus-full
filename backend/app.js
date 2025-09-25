require('dotenv').config({ path: './backend/.env' });
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cloudinary = require('./config/cloudinary');
const upload = require('./config/multer-config');
const authRoutes = require('./routes/authRoutes');
const Course = require('./models/Course')
const Blog = require('./models/blogs')
const Category = require('./models/Category');

const authMiddleware = require('./middleware/auth');

const authController = require('./controllers/authController');
const app = express();

// Error handlers should be after all routes
app.use(express.static(path.join(__dirname, '../assets')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({ mongoUrl: process.env.MONGO_URI })
    })
);

app.use('/api/auth', authRoutes);

app.get('/login', (req, res) => {
    res.render('login', { title: 'Admin Login' });
});

app.get('/logout', authController.logout);

app.get('/', async (req, res) => {
    try {
        const courses = await Course.find({ isActive: true })
            .populate('category', 'name')
            .lean()
            .sort({ createdAt: -1 });
            
        const categories = await Category.find({ isActive: true }).sort({ createdAt: -1 });
        
        const blogs = await Blog.find({ isPublished: true })
            .sort({ createdAt: -1 })
            .limit(3)
            .lean();

        const preparedCourses = courses.map(course => ({
            _id: course._id.toString(),
            title: course.title,
            category: course.category ? course.category.name : null
        }));
        
        res.render('index', { 
            title: 'Chaseplus',
            courses: courses,
            categories: categories,
            blogs: blogs,
            coursesJson: JSON.stringify(preparedCourses)
        });
    } catch (err) {
        console.error('Error rendering index page:', err);
        res.status(500).send('Error loading page');
    }
});

app.get('/api/courses-by-category', async (req, res) => {
    try {
        const categoryName = req.query.category;
        const courses = await Course.find({ 
            isActive: true,
            category: categoryName // Changed from 'category.name' to just 'category'
        })
        .select('_id title')
        .lean();

        res.json(courses);
    } catch (err) {
        console.error('Error fetching courses by category:', err);
        res.status(500).json({ error: 'Error loading courses' });
    }
});

app.get('/courses', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 9; // Number of courses per page
        const skip = (page - 1) * limit;

        // Build search query
        let searchQuery = { isActive: true };
        if (req.query.search) {
            searchQuery.$or = [
                { title: { $regex: req.query.search, $options: 'i' } },
                { category: { $regex: req.query.search, $options: 'i' } }
            ];
        }
        const totalCourses = await Course.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalCourses / limit);

        const courses = await Course.find({ ...searchQuery, isActive: true })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.render('courses', {
            title: 'Chaseplus',
            courses: courses,
            currentPage: page,
            totalPages: totalPages,
            searchQuery: req.query.search || ''
        });
    } catch (err) {
        console.error('Error rendering course page:', err);
        res.status(500).send('Error loading page');
    }
});

app.get('/course-details/:id', async (req, res) => {
    try {
        const courseId = req.params.id;
        const course = await Course.findById(courseId).populate('category');

        if (!course) {
            return res.status(404).render('error', {
                title: '404 Not Found',
                message: 'Course not found',
                error: { status: 404 }
            });
        }

        res.render('courseDetails', {
            title: 'Course Details',
            course: course
        });
    } catch (err) {
        console.error('Error rendering course details page:', err);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error loading course details',
            error: err
        });
    }
});

app.get('/about',async (req, res) => {
    try {
        const courses = await Course.find({ isActive: true })
            .populate('category', 'name')
            .lean()
            .sort({ createdAt: -1 });
        res.render('about', { title: 'Chaseplus',courses });
    } catch (err) {
        console.error('Error rendering about page:', err);
        res.status(500).send('Error loading page');
    }
});

app.get('/contact', async (req, res) => {
    try {
        const courses = await Course.find({ isActive: true })
        .populate('category', 'name')
        .lean()
        .sort({ createdAt: -1 });
        res.render('contact', { title: 'Chaseplus',courses });
    } catch (err) {
        console.error('Error rendering contact page:', err);
        res.status(500).send('Error loading page');
    }
});

app.get('/blogs', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 9;

        const totalBlogs = await Blog.countDocuments({ isActive: true });
        const totalPages = Math.ceil(totalBlogs / limit);

        const blogs = await Blog.find({ isPublished: true })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const courses = await Course.find({ isActive: true })
            .populate('category', 'name')
            .lean()
            .sort({ createdAt: -1 });

        res.render('blogs', { 
            title: 'Chaseplus',
            courses,
            blogs,
            currentPage: page,
            totalPages
        });
    } catch (err) {
        console.error('Error rendering blogs page:', err);
        res.status(500).send('Error loading page');
    }
});

app.get('/blog-details/:id', async (req, res) => {
    try {
        const blogId = req.params.id;
        const blog = await Blog.findById(blogId);

        if (!blog) {
            return res.status(404).render('error', {
                title: '404 Not Found', 
                message: 'Blog not found',
                error: { status: 404 }
            });
        }

        res.render('blogDetails', {
            title: 'Blog Details',
            blog: blog
        });
    } catch (err) {
        console.error('Error rendering blog details page:', err);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error loading blog details',
            error: err
        });
    }
});

app.get('/admin-dashboard', authMiddleware, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const searchQuery = req.query.search || '';

        const query = {};
        if (searchQuery) {
            query.title = { $regex: searchQuery, $options: 'i' };
        }

        const totalCourses = await Course.countDocuments(query);
        const totalPages = Math.ceil(totalCourses / limit);

        const courses = await Course.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const categories = await Category.find();

        res.render('admin-dashboard', {
            title: 'Admin Dashboard',
            courses: courses,
            currentPage: page,
            totalPages: totalPages,
            limit: limit,
            searchQuery: searchQuery,
            totalCourses: totalCourses,
            categories: categories
        });
    } catch (err) {
        console.error('Error rendering admin dashboard:', err);
        res.status(500).render('error', {
            title: 'Error', 
            message: 'Error loading admin dashboard',
            error: err
        });
    }
});

app.post('/admin/courses/add', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            throw new Error('Course image is required');
        }
        const result = await cloudinary.uploader.upload(req.file.path);

        // Parse comma-separated strings into arrays
        const highlights = req.body.highlights ? JSON.parse(req.body.highlights) : [];
        const whatYoullLearn = req.body.whatYoullLearn ? JSON.parse(req.body.whatYoullLearn) : [];
        const careerOpportunities = req.body.careerOpportunities ? JSON.parse(req.body.careerOpportunities) : [];
        const whyChooseThisCourse = req.body.whyChooseThisCourse ? JSON.parse(req.body.whyChooseThisCourse) : [];

        // Validation
        if (!highlights.length || !whatYoullLearn.length || 
            !careerOpportunities.length || !whyChooseThisCourse.length) {
            throw new Error('All array fields must have at least one item');
        }

        const newCourse = new Course({
            title: req.body.title,
            description: req.body.description,
            category: req.body.category,
            image: result.secure_url,
            duration:req.body.duration,
            highlights: highlights,
            whatYoullLearn: whatYoullLearn,
            careerOpportunities: careerOpportunities,
            whyChooseThisCourse: whyChooseThisCourse,
            price: parseFloat(req.body.price),
            offerPrice: req.body.offerPrice ? parseFloat(req.body.offerPrice) : undefined,
            isActive: true
        });

        await newCourse.validate();
        await newCourse.save();
        
        res.redirect('/admin-dashboard');
    } catch (err) {
        console.error('Error adding course:', err);
        res.status(500).json({ 
            error: 'Error adding course',
            details: err.message 
        });
    }
});

app.put('/admin/courses/:id', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        const courseId = req.params.id;
        const existingCourse = await Course.findById(courseId);
        if (!existingCourse) {
            return res.status(404).json({ error: 'Course not found' });
        }

        let imageUrl = existingCourse.image;
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path);
            imageUrl = result.secure_url;
        }

        const highlights = req.body.highlights ? JSON.parse(req.body.highlights) : existingCourse.highlights;
        const whatYoullLearn = req.body.whatYoullLearn ? JSON.parse(req.body.whatYoullLearn) : existingCourse.whatYoullLearn;
        const careerOpportunities = req.body.careerOpportunities ? JSON.parse(req.body.careerOpportunities) : existingCourse.careerOpportunities;
        const whyChooseThisCourse = req.body.whyChooseThisCourse ? JSON.parse(req.body.whyChooseThisCourse) : existingCourse.whyChooseThisCourse;

        if (!highlights.length || !whatYoullLearn.length || !careerOpportunities.length || !whyChooseThisCourse.length) {
            throw new Error('All array fields must have at least one item');
        }

        const updates = {
            title: req.body.title || existingCourse.title,
            description: req.body.description || existingCourse.description,
            category: req.body.category || existingCourse.category,
            duration: req.body.duration || existingCourse.duration,
            image: imageUrl,
            highlights: highlights,
            whatYoullLearn: whatYoullLearn,
            careerOpportunities: careerOpportunities,
            whyChooseThisCourse: whyChooseThisCourse,
            price: req.body.price ? parseFloat(req.body.price) : existingCourse.price,
            offerPrice: req.body.offerPrice ? parseFloat(req.body.offerPrice) : existingCourse.offerPrice
        };

        const updatedCourse = await Course.findByIdAndUpdate(courseId, updates, { new: true, runValidators: true });
        res.json({ success: true, course: updatedCourse });
    } catch (err) {
        console.error('Error updating course:', err);
        res.status(500).json({ error: 'Error updating course', details: err.message });
    }
});

app.patch('/admin/courses/:id/toggle-status', authMiddleware, async (req, res) => {
    try {
        const courseId = req.params.id;
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }
        course.isActive = !course.isActive;
        await course.save();
        res.json({ success: true, isActive: course.isActive });
    } catch (err) {
        console.error('Error toggling course status:', err);
        res.status(500).json({ error: 'Error updating course status' });
    }
});

app.delete('/admin/courses/:id', authMiddleware, async (req, res) => {
    try {
        const courseId = req.params.id;
        const result = await Course.findByIdAndDelete(courseId);
        if (!result) {
            return res.status(404).json({ error: 'Course not found' });
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting course:', err);
        res.status(500).json({ error: 'Error deleting course' });
    }
});

// Category routes

app.get('/admin-category', authMiddleware, async (req, res) => {
    try {
        const categories = await Category.find();
        res.render('admin-category', { 
            title: 'Category Management',
            categories
        });
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({ error: 'Error fetching categories' });
    }
});

app.post('/admin/categories', authMiddleware, async (req, res) => {
    try {
        const { name, description } = req.body;
        const category = new Category({
            name,
            description
        });
        await category.save();
        res.json({ success: true, category });
    } catch (err) {
        console.error('Error creating category:', err);
        res.status(500).json({ error: 'Error creating category', details: err.message });
    }
});

app.put('/admin/categories/:id', authMiddleware, async (req, res) => {
    try {
        const categoryId = req.params.id;
        const updates = {
            name: req.body.name,
            description: req.body.description
        };

        const updatedCategory = await Category.findByIdAndUpdate(
            categoryId, 
            updates,
            { new: true, runValidators: true }
        );

        if (!updatedCategory) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.json({ success: true, category: updatedCategory });
    } catch (err) {
        console.error('Error updating category:', err);
        res.status(500).json({ error: 'Error updating category', details: err.message });
    }
});

app.patch('/admin/categories/:id/toggle-status', authMiddleware, async (req, res) => {
    try {
        const categoryId = req.params.id;
        const category = await Category.findById(categoryId);
        
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        category.isActive = !category.isActive;
        await category.save();
        
        res.json({ success: true, isActive: category.isActive });
    } catch (err) {
        console.error('Error toggling category status:', err);
        res.status(500).json({ error: 'Error updating category status' });
    }
});

app.delete('/admin/categories/:id', authMiddleware, async (req, res) => {
    try {
        const categoryId = req.params.id;
        const result = await Category.findByIdAndDelete(categoryId);
        
        if (!result) {
            return res.status(404).json({ error: 'Category not found' });
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting category:', err);
        res.status(500).json({ error: 'Error deleting category' });
    }
});


app.get('/admin-blogs', authMiddleware, async (req, res) => {
    try {
        const blogs = await Blog.find().sort({ createdAt: -1 });
        res.render('admin-blogs', { 
            title: 'Manage Blogs',
            blogs: blogs
        });
    } catch (err) {
        console.error('Error fetching blogs:', err);
        res.status(500).json({ error: 'Error fetching blogs' });
    }
});

app.post('/admin/blogs', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        // Validate required fields
        const requiredFields = ['title', 'category', 'date', 'description', 'content', 'metaTitle', 'metaDescription', 'author'];
        for (const field of requiredFields) {
            if (!req.body[field]) {
                throw new Error(`${field} is required`);
            }
        }

        if (!req.file) {
            throw new Error('Blog image is required');
        }
        const result = await cloudinary.uploader.upload(req.file.path);

        const blogData = {
            title: req.body.title,
            category: req.body.category,
            date: req.body.date,
            description: req.body.description,
            content: req.body.content,
            imageUrl: result.secure_url,
            metaTitle: req.body.metaTitle,
            metaDescription: req.body.metaDescription,
            author: req.body.author,
            isPublished: req.body.isPublished === 'on' ? true : false
        };

        const blog = new Blog(blogData);
        await blog.validate();
        await blog.save();
        
        res.json({ success: true, blog });
    } catch (err) {
        console.error('Error creating blog:', err);
        res.status(500).json({ 
            error: 'Error creating blog',
            details: err.message 
        });
    }
});

app.put('/admin/blogs/:id', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        const blogId = req.params.id;
        const existingBlog = await Blog.findById(blogId);
        
        if (!existingBlog) {
            return res.status(404).json({ error: 'Blog not found' });
        }

        // Validate required fields
        const requiredFields = ['title', 'category', 'date', 'description', 'content', 'metaTitle', 'metaDescription', 'author'];
        for (const field of requiredFields) {
            if (!req.body[field]) {
                throw new Error(`${field} is required`);
            }
        }

        let imageUrl = existingBlog.imageUrl;
        if (req.file) {
            // Delete old image from Cloudinary
            if (existingBlog.imageUrl) {
                const publicId = existingBlog.imageUrl.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(`blog-images/${publicId}`);
            }
            
            // Upload new image
            const result = await cloudinary.uploader.upload(req.file.path);
            imageUrl = result.secure_url;
        }

        const updates = {
            title: req.body.title,
            category: req.body.category,
            date: req.body.date,
            description: req.body.description,
            content: req.body.content,
            imageUrl: imageUrl,
            metaTitle: req.body.metaTitle,
            metaDescription: req.body.metaDescription,
            author: req.body.author,
            isPublished: req.body.isPublished === 'on' ? true : false
        };

        const updatedBlog = await Blog.findByIdAndUpdate(
            blogId,
            updates,
            { new: true, runValidators: true }
        );

        res.json({ success: true, blog: updatedBlog });
    } catch (err) {
        console.error('Error updating blog:', err);
        res.status(500).json({ error: 'Error updating blog', details: err.message });
    }
});

app.patch('/admin/blogs/:id/toggle-status', authMiddleware, async (req, res) => {
    try {
        const blogId = req.params.id;
        const blog = await Blog.findById(blogId);
        
        if (!blog) {
            return res.status(404).json({ error: 'Blog not found' });
        }

        blog.isPublished = !blog.isPublished;
        await blog.save();
        
        res.json({ success: true, isPublished: blog.isPublished });
    } catch (err) {
        console.error('Error toggling blog status:', err);
        res.status(500).json({ error: 'Error updating blog status' });
    }
});

app.delete('/admin/blogs/:id', authMiddleware, async (req, res) => {
    try {
        const blogId = req.params.id;
        const blog = await Blog.findById(blogId);
        
        if (!blog) {
            return res.status(404).json({ error: 'Blog not found' });
        }

        // Delete image from Cloudinary
        if (blog.imageUrl) {
            const publicId = blog.imageUrl.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`blog-images/${publicId}`);
        }

        // Delete blog from database
        await Blog.findByIdAndDelete(blogId);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting blog:', err);
        res.status(500).json({ error: 'Error deleting blog' });
    }
});



// Error handlers
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', {
        title: 'Error',
        message: 'Something went wrong!',
        error: err
    });
});

app.use((req, res) => {
    res.status(404).render('error', {
        title: '404 Not Found',
        message: 'Page not found',
        error: { status: 404 }
    });
});

module.exports = app;