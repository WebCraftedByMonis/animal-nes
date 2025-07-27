# Animal Wellness Shop 🐾

A comprehensive marketplace for veterinary products and animal care services, built with modern web technologies.

![Animal Wellness Shop](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Prisma](https://img.shields.io/badge/Prisma-5.0-2D3748)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1)

## 🌐 Live Demo

Visit the live application: [www.animalwellness.shop](https://www.animalwellness.shop)

Admin Dashboard: [www.animalwellness.shop/dashboard](https://www.animalwellness.shop/dashboard)

## 📋 Overview

Animal Wellness Shop is a full-stack e-commerce platform that serves as a complete marketplace for the veterinary and pet care industry. It combines e-commerce functionality with content management and job placement features.

### Key Features

- **🛒 E-commerce Marketplace**
  - Comprehensive catalog of veterinary products
  - Advanced search and filtering capabilities
  - Shopping cart with session persistence
  - Secure checkout process
  - Real-time inventory management

- **📰 Blog Platform**
  - Animal care articles and news
  - SEO-optimized content pages
  - Category-based navigation
  - Rich text editor for content creation

- **💼 Job Board**
  - Veterinary job listings
  - Application management system
  - Applicant tracking for employers
  - Resume upload functionality
  - Application status tracking

- **👨‍💼 Admin Dashboard**
  - Product inventory management
  - Order processing and tracking
  - User management
  - Blog content management
  - Job listings moderation
  - Analytics and reporting

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **React Hook Form** - Form management
- **Framer Motion** - Animations

### Backend
- **Next.js API Routes** - RESTful API endpoints
- **Prisma ORM** - Database management
- **MySQL** - Primary database
- **NextAuth.js** - Authentication
- **Zod** - Schema validation

### Infrastructure
- **Vercel** - Deployment and hosting
- **Cloudinary** - Image optimization
- **SendGrid** - Email notifications

## 🚀 Getting Started

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/animal-nes.git
cd animal-nes
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env.local
```

4. Configure your `.env.local` file
```env
DATABASE_URL="mysql://user:password@localhost:3306/animalwellness"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

5. Run database migrations
```bash
npx prisma migrate dev
```

6. Seed the database (optional)
```bash
npx prisma db seed
```

7. Start the development server
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## 📁 Project Structure

```
animal-nes/
├── app/                    # Next.js 14 app directory
│   ├── (shop)/            # Public shopping pages
│   ├── dashboard/         # Admin dashboard
│   ├── api/              # API routes
│   └── auth/             # Authentication pages
├── components/            # Reusable React components
├── lib/                   # Utility functions
├── prisma/               # Database schema and migrations
├── public/               # Static assets
└── types/                # TypeScript type definitions
```

## 🔧 Key Features Implementation

### Authentication & Authorization
- Role-based access control (Admin, Vendor, Customer)
- Secure session management
- Protected API routes

### Performance Optimizations
- Image optimization with Next.js Image component
- Lazy loading for product listings
- Database query optimization with Prisma
- Static generation for blog pages
- 95+ Lighthouse performance score

### Security Features
- Input validation and sanitization
- SQL injection prevention via Prisma
- XSS protection
- CSRF protection
- Secure authentication flow

## 📱 Responsive Design

The application is fully responsive and optimized for:
- Desktop (1920px+)
- Laptop (1024px - 1919px)
- Tablet (768px - 1023px)
- Mobile (320px - 767px)

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e
```

## 📈 Performance Metrics

- **Lighthouse Score**: 95+
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.5s
- **Core Web Vitals**: All green

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 👤 Author

**Monis Raza**
- GitHub: [@yourusername]([https://github.com/yourusername](https://github.com/WebCraftedByMonis/))
- LinkedIn: [Your LinkedIn]([https://linkedin.com/in/yourusername](https://www.linkedin.com/in/m-monis-raza-707508335?utm_source=share&utm_campaign=share_via&utm_conte))

---

Built with ❤️ using Next.js and TypeScript
