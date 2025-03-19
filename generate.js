const fs = require("fs");
const path = require("path");
const { marked } = require("marked");
const matter = require("gray-matter");
const sharp = require("sharp");

const contentDir = path.join(__dirname, "content");
const outputDir = path.join(__dirname, "public");
const postsDir = path.join(outputDir, "posts");
const imagesDir = path.join(outputDir, "images");
const templatePath = path.join(__dirname, "templates", "post-template.html");

const siteConfig = {
    siteName: "My Blog",
    siteUrl: "https://yourdomain.com",
    defaultAuthor: "Your Name",
    defaultImage: "/images/default-featured.jpg"
};

// Ensure directories exist
[postsDir, imagesDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Process images and return optimized path
async function processImage(imagePath) {
    try {
        let imageBuffer;
        
        // Check if image is a URL
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
            const response = await fetch(imagePath);
            imageBuffer = await response.arrayBuffer();
        } else {
            // Local file
            imageBuffer = fs.readFileSync(imagePath);
        }

        const ext = path.extname(imagePath);
        const basename = path.basename(imagePath, ext)
            .replace(/[^a-z0-9]/gi, '-') // Sanitize filename
            .toLowerCase();
        const outputPath = path.join(imagesDir, `${basename}.webp`);
        
        await sharp(imageBuffer)
            .resize({
                width: 800,    // Max width
                height: 400,   // Max height
                fit: 'cover',  // Maintain aspect ratio and cover area
                position: 'center' // Center the image
            })
            .webp({ quality: 80 })
            .toFile(outputPath);
        
        return `/images/${basename}.webp`;
    } catch (error) {
        console.error(`Error processing image ${imagePath}:`, error);
        return imagePath; // Return original path if processing fails
    }
}

const POSTS_PER_PAGE = 5;

// Add this function to format dates
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Add pagination function
function paginatePosts(posts, currentPage = 1) {
    const totalPosts = posts.length;
    const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);
    const start = (currentPage - 1) * POSTS_PER_PAGE;
    const paginatedPosts = posts.slice(start, start + POSTS_PER_PAGE);

    return {
        posts: paginatedPosts,
        pagination: {
            currentPage,
            totalPages,
            prevPage: currentPage > 1 ? `/page/${currentPage - 1}` : null,
            nextPage: currentPage < totalPages ? `/page/${currentPage + 1}` : null,
            pageNumbers: Array.from({ length: totalPages }, (_, i) => ({
                number: i + 1,
                isActive: i + 1 === currentPage
            }))
        }
    };
}

// Generate posts
async function generatePosts() {
    const postTemplate = fs.readFileSync(templatePath, "utf8");
    const posts = [];

    for (const file of fs.readdirSync(contentDir)) {
        if (!file.endsWith(".md")) continue;

        const filePath = path.join(contentDir, file);
        const source = fs.readFileSync(filePath, "utf8");
        const { data: frontmatter, content } = matter(source);
        
        // Create URL-friendly slug
        const slug = frontmatter.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");

        // Process markdown content
        let htmlContent = await marked(content, { async: true });

        // Replace image paths with optimized versions
        const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
        const imagePromises = [];
        htmlContent = htmlContent.replace(imageRegex, (match, alt, imagePath) => {
            const fullImagePath = path.join(contentDir, imagePath);
            if (fs.existsSync(fullImagePath)) {
                imagePromises.push(processImage(fullImagePath));
                return `![${alt}](processing...)`;
            }
            return match;
        });

        // Wait for image processing
        const optimizedImages = await Promise.all(imagePromises);
        htmlContent = htmlContent.replace(/!\[[^\]]*\]\(processing\.\.\.\)/g, () => {
            return `![](${optimizedImages.shift()})`;
        });

        // Generate HTML with cache headers
        const finalHTML = postTemplate
            .replace(/{{siteName}}/g, siteConfig.siteName)
            .replace(/{{title}}/g, frontmatter.title) 
            .replace(/{{description}}/g, frontmatter.description)
            .replace(/{{author}}/g, frontmatter.author)
            .replace(/{{keywords}}/g, frontmatter.keywords || '')
            .replace(/{{featuredImage}}/g, frontmatter.featuredImage || siteConfig.defaultImage)
            .replace(/{{url}}/g, `${siteConfig.siteUrl}/posts/${slug}`)
            .replace(/{{isoDate}}/g, new Date(frontmatter.date).toISOString())
            .replace("{{content}}", htmlContent)
            .replace("</head>", `
                <meta http-equiv="Cache-Control" content="public, max-age=31536000">
                <link rel="preload" as="style" href="/assets/styles.css">
                <link rel="preload" as="style" href="/assets/dark-mode.css">
                </head>
            `);

        // Save HTML file
        fs.writeFileSync(path.join(postsDir, `${slug}.html`), finalHTML);
        
        posts.push({
            title: frontmatter.title,
            date: frontmatter.date,
            slug,
            path: `/posts/${slug}`
        });

        console.log(`Generated: ${slug}`);
    }

    // Sort posts by date
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Generate paginated index pages
    const indexTemplate = fs.readFileSync(
        path.join(__dirname, "templates", "index-template.html"),
        "utf8"
    );

    // Generate main index page and pagination pages
    for (let page = 1; page <= Math.ceil(posts.length / POSTS_PER_PAGE); page++) {
        const { posts: paginatedPosts, pagination } = paginatePosts(posts, page);
        
        const pageContent = indexTemplate
            .replace("{{posts}}", generatePostsList(paginatedPosts))
            .replace("{{pagination}}", generatePagination(pagination))
            .replace("{{currentYear}}", new Date().getFullYear());

        if (page === 1) {
            fs.writeFileSync(path.join(outputDir, "index.html"), pageContent);
        }
        
        const pageDir = path.join(outputDir, "page", String(page));
        fs.mkdirSync(pageDir, { recursive: true });
        fs.writeFileSync(path.join(pageDir, "index.html"), pageContent);
    }

    // Generate posts index
    fs.writeFileSync(
        path.join(outputDir, "posts.json"), 
        JSON.stringify(posts, null, 2)
    );
}

function generatePostsList(posts) {
    return posts.map(post => `
        <article class="post-item">
            <a href="${post.path}" class="post-title">
                <h3>${post.title}</h3>
            </a>
            <div class="post-date">${formatDate(post.date)}</div>
        </article>
    `).join('');
}

function generatePagination({ currentPage, totalPages, prevPage, nextPage, pageNumbers }) {
    return `
        <nav class="pagination">
            ${prevPage ? `<a href="${prevPage}">← Previous</a>` : '<span class="disabled">← Previous</span>'}
            ${pageNumbers.map(({ number, isActive }) => `
                <a href="/page/${number}" class="${isActive ? 'active' : ''}">${number}</a>
            `).join('')}
            ${nextPage ? `<a href="${nextPage}">Next →</a>` : '<span class="disabled">Next →</span>'}
        </nav>
    `;
}

// Add this function to generate sitemap
function generateSitemap(posts) {
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${siteConfig.siteUrl}</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <priority>1.0</priority>
    </url>
    ${posts.map(post => `
    <url>
        <loc>${siteConfig.siteUrl}/posts/${post.slug}</loc>
        <lastmod>${new Date(post.date).toISOString()}</lastmod>
        <priority>0.8</priority>
    </url>
    `).join('')}
</urlset>`;

    fs.writeFileSync(path.join(outputDir, 'sitemap.xml'), sitemap);
}

// Add to your main generation process
/* await generatePosts();
generateSitemap(posts); */

async function main() {
    try {
        await generatePosts();
        const posts = JSON.parse(fs.readFileSync(path.join(outputDir, 'posts.json'), 'utf8'));
        generateSitemap(posts);
        
        // Generate robots.txt
        const robotsTxt = `User-agent: *
Allow: /
Sitemap: ${siteConfig.siteUrl}/sitemap.xml`;
        fs.writeFileSync(path.join(outputDir, 'robots.txt'), robotsTxt);
        
        console.log("✅ Static site generated successfully!");
    } catch (error) {
        console.error("❌ Error generating site:", error);
        process.exit(1);
    }
}

main();

/* generatePosts().then(() => {
    console.log("✅ Static site generated successfully!");
}); */
