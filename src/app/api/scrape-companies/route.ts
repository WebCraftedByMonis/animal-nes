import { NextRequest, NextResponse } from 'next/server';
import { scrapeGoogleMaps } from '@/lib/gmaps-scraper';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ScrapeRequest {
  businessType: string;
  city: string;
  maxResults?: number;
  headless?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: ScrapeRequest = await request.json();

    // Validation
    if (!body.businessType || !body.city) {
      return NextResponse.json(
        { error: 'Business type and city are required' },
        { status: 400 }
      );
    }

    if (body.businessType.length < 2 || body.city.length < 2) {
      return NextResponse.json(
        { error: 'Business type and city must be at least 2 characters long' },
        { status: 400 }
      );
    }

    const maxResults = body.maxResults || 20;
    if (maxResults < 1 || maxResults > 50) {
      return NextResponse.json(
        { error: 'Max results must be between 1 and 50' },
        { status: 400 }
      );
    }

    console.log(`Starting scrape for ${body.businessType} in ${body.city}`);

    // Scrape companies from Google Maps
    const scrapedCompanies = await scrapeGoogleMaps(body.businessType, body.city, {
      maxResults,
      headless: body.headless !== false
    });

    // Save companies to database
    const savedCompanies = [];
    const errors = [];

    for (const company of scrapedCompanies) {
      try {
        // Check if company already exists
        const existingCompany = await prisma.company.findFirst({
          where: {
            companyName: company.name,
          }
        });

        if (existingCompany) {
          console.log(`Company already exists: ${company.name}`);
          errors.push({
            name: company.name,
            error: 'Company already exists in database'
          });
          continue;
        }

        // Create company with image if logo was scraped
        const companyData: any = {
          companyName: company.name,
          mobileNumber: company.phone,
          address: company.address,
          email: company.email,
          rating: company.rating,
          reviews: company.reviews,
          website: company.website,
          city: company.city,
        };

        // Create company and image in a transaction
        const savedCompany = await prisma.$transaction(async (tx) => {
          const newCompany = await tx.company.create({
            data: companyData
          });

          // If logo was uploaded to Cloudinary, save it
          if (company.logoUrl && company.logoPublicId) {
            await tx.companyImage.create({
              data: {
                url: company.logoUrl,
                alt: `${company.name} logo`,
                publicId: company.logoPublicId,
                companyId: newCompany.id,
              }
            });
          }

          return newCompany;
        });

        savedCompanies.push(savedCompany);
        console.log(`✅ Saved company: ${company.name}`);

      } catch (error: any) {
        console.error(`Error saving company ${company.name}:`, error);
        errors.push({
          name: company.name,
          error: error.message || 'Failed to save to database'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully scraped and saved ${savedCompanies.length} companies`,
      data: {
        businessType: body.businessType,
        city: body.city,
        totalScraped: scrapedCompanies.length,
        totalSaved: savedCompanies.length,
        savedCompanies: savedCompanies.map(c => ({
          id: c.id,
          name: c.companyName,
          phone: c.mobileNumber,
          address: c.address,
          email: c.email,
          rating: c.rating,
          reviews: c.reviews,
          website: c.website,
          city: c.city,
        })),
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error('Scraping error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: 'Scraping failed',
          details: error.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred during scraping' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Google Maps Company Scraper API',
    usage: 'POST /api/scrape-companies with { businessType, city, maxResults?, headless? }',
    example: {
      businessType: 'veterinary clinics',
      city: 'Lahore',
      maxResults: 20,
      headless: true
    }
  });
}
