import puppeteer, { Browser, Page } from 'puppeteer';
import axios from 'axios';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CompanyData {
  name: string;
  phone?: string;
  address?: string;
  email?: string;
  rating?: number;
  reviews?: number;
  website?: string;
  city: string;
  businessType: string;
  logoUrl?: string;
  logoPublicId?: string;
}

interface ScraperOptions {
  headless?: boolean;
  maxResults?: number;
}

class GoogleMapsScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private options: ScraperOptions;

  constructor(options: ScraperOptions = {}) {
    this.options = {
      headless: true,
      maxResults: 20,
      ...options
    };
  }

  private async randomDelay(min: number = 2000, max: number = 5000): Promise<void> {
    const delay = Math.random() * (max - min) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private async initBrowser(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: this.options.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ]
    });

    this.page = await this.browser.newPage();
    this.page.setDefaultTimeout(60000);
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await this.page.setViewport({ width: 1366, height: 768 });

    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });
  }

  private async searchGoogleMaps(businessType: string, city: string): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    const searchQuery = `${businessType} ${city}`;
    const url = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;

    console.log(`Searching for: ${searchQuery}`);

    try {
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch (error) {
      await this.page.goto(url, { waitUntil: 'load', timeout: 20000 });
    }

    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
      await this.page.waitForFunction(() => {
        const links = document.querySelectorAll('a[href*="/maps/place/"]');
        return links.length > 0 && Array.from(links).some(link =>
          link.textContent && link.textContent.trim().length > 5
        );
      }, { timeout: 15000 });
    } catch (e) {
      console.log('Warning: Timeout waiting for business content');
    }

    await this.randomDelay();
  }

  private async extractBusinessName(): Promise<string> {
    if (!this.page) return '';

    return await this.page.evaluate(() => {
      const nameSelectors = [
        'h1.DUwDvf.lfPIob',
        'h1.DUwDvf',
        'h1[data-attrid="title"]',
        'h1',
      ];

      for (const selector of nameSelectors) {
        const nameElement = document.querySelector(selector);
        if (nameElement && nameElement.textContent && nameElement.textContent.trim() !== 'Results') {
          const extractedName = nameElement.textContent.trim();
          if (extractedName.length > 2 && !extractedName.toLowerCase().includes('result')) {
            return extractedName;
          }
        }
      }

      return '';
    });
  }

  private async extractPhone(): Promise<string | undefined> {
    if (!this.page) return undefined;

    try {
      return await this.page.evaluate(() => {
        const phoneSelectors = [
          '[data-item-id*="phone"]',
          '[aria-label*="Phone"]',
          'button[data-item-id*="phone"]',
          '[href^="tel:"]',
        ];

        for (const selector of phoneSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            const text = element.textContent || element.getAttribute('aria-label') || '';
            const phoneMatch = text.match(/[\+]?[\d\s\-\(\)]{7,15}/);
            if (phoneMatch) {
              return phoneMatch[0].trim();
            }
          }
        }

        const telLinks = document.querySelectorAll('a[href^="tel:"]');
        for (const link of telLinks) {
          const href = link.getAttribute('href');
          if (href) {
            return href.replace('tel:', '').trim();
          }
        }

        return undefined;
      });
    } catch (error) {
      return undefined;
    }
  }

  private async extractAddress(): Promise<string | undefined> {
    if (!this.page) return undefined;

    try {
      return await this.page.evaluate(() => {
        const addressSelectors = [
          '[data-item-id*="address"]',
          '[aria-label*="Address"]',
          'button[data-item-id="address"]',
          '.Io6YTe',
        ];

        for (const selector of addressSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent) {
            const text = element.textContent.trim();
            if (text.length > 5 && !text.includes('Phone') && !text.includes('Website')) {
              return text;
            }
          }
        }
        return undefined;
      });
    } catch (error) {
      return undefined;
    }
  }

  private async extractRating(): Promise<number | undefined> {
    if (!this.page) return undefined;

    try {
      return await this.page.evaluate(() => {
        const ratingSelectors = [
          '[jsaction*="rating"] span',
          '.ceNzKf',
          'span[role="img"][aria-label*="stars"]'
        ];

        for (const selector of ratingSelectors) {
          const ratingElement = document.querySelector(selector);
          if (ratingElement) {
            const ratingText = ratingElement.textContent || ratingElement.getAttribute('aria-label') || '';
            const ratingMatch = ratingText.match(/(\d\.\d)/);
            if (ratingMatch) {
              return parseFloat(ratingMatch[1]);
            }
          }
        }
        return undefined;
      });
    } catch (error) {
      return undefined;
    }
  }

  private async extractReviews(): Promise<number | undefined> {
    if (!this.page) return undefined;

    try {
      return await this.page.evaluate(() => {
        const bodyText = document.body.textContent || '';
        const reviewMatch = bodyText.match(/\((\d{1,5}(?:,\d{3})*)\)/);
        if (reviewMatch) {
          return parseInt(reviewMatch[1].replace(/,/g, ''));
        }
        return undefined;
      });
    } catch (error) {
      return undefined;
    }
  }

  private async extractWebsite(): Promise<string | undefined> {
    if (!this.page) return undefined;

    try {
      return await this.page.evaluate(() => {
        const websiteSelectors = [
          'a[href*="://"][data-value*="website"]',
          'a[href*="://"][aria-label*="website" i]',
          'a[href*="://"][data-item-id*="authority"]',
          '[data-item-id="authority"] a[href*="://"]',
        ];

        for (const selector of websiteSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            const href = element.getAttribute('href');
            if (href && href.startsWith('http') && !href.includes('google.com') && !href.includes('maps')) {
              const url = href.split('?')[0];
              if (url.length <= 200 && url.match(/^https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)) {
                return url;
              }
            }
          }
        }
        return undefined;
      });
    } catch (error) {
      return undefined;
    }
  }

  private async extractLogoUrl(): Promise<string | undefined> {
    if (!this.page) return undefined;

    try {
      return await this.page.evaluate(() => {
        const imgSelectors = [
          'img[src*="googleusercontent"]',
          'button[data-item-id*="image"] img',
          'div[role="img"]',
          'img[alt]:not([alt=""])',
        ];

        for (const selector of imgSelectors) {
          const img = document.querySelector(selector);
          if (img && img instanceof HTMLImageElement) {
            const src = img.src;
            if (src && src.startsWith('http') && !src.includes('maps/vt')) {
              return src;
            }
          }
        }
        return undefined;
      });
    } catch (error) {
      return undefined;
    }
  }

  private async downloadAndUploadLogo(imageUrl: string, companyName: string): Promise<{ url: string; publicId: string } | undefined> {
    try {
      console.log(`Downloading logo from: ${imageUrl}`);

      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000
      });

      const buffer = Buffer.from(response.data);
      const base64Image = `data:${response.headers['content-type']};base64,${buffer.toString('base64')}`;

      console.log(`Uploading logo to Cloudinary for: ${companyName}`);

      const uploadResult = await cloudinary.uploader.upload(base64Image, {
        folder: 'company_logos',
        public_id: `logo_${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
        transformation: [
          { width: 500, height: 500, crop: 'limit' },
          { quality: 'auto', fetch_format: 'auto' }
        ]
      });

      console.log(`Logo uploaded successfully: ${uploadResult.secure_url}`);

      return {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id
      };
    } catch (error) {
      console.error(`Error downloading/uploading logo: ${error}`);
      return undefined;
    }
  }

  async scrapeCompanies(businessType: string, city: string): Promise<CompanyData[]> {
    try {
      await this.initBrowser();
      await this.searchGoogleMaps(businessType, city);

      const companies: CompanyData[] = [];
      const maxResults = this.options.maxResults || 20;

      for (let i = 0; i < maxResults; i++) {
        try {
          console.log(`\n=== PROCESSING COMPANY ${i + 1} ===`);

          const currentBusinessElements = await this.page!.$$('a[href*="/maps/place/"]');

          if (i >= currentBusinessElements.length) {
            console.log('No more companies available');
            break;
          }

          const businessNameBefore = await currentBusinessElements[i].evaluate(el => {
            return el.getAttribute('aria-label') || el.textContent?.trim() || '';
          });

          if (companies.some(c => c.name === businessNameBefore)) {
            console.log('Skipping duplicate company');
            continue;
          }

          await currentBusinessElements[i].click();
          console.log('Clicked on company element');

          await Promise.race([
            this.page!.waitForSelector('h1', { timeout: 8000 }),
            this.page!.waitForSelector('[role="main"] h1', { timeout: 8000 }),
          ]).catch(() => null);

          await new Promise(resolve => setTimeout(resolve, 3000));

          const name = await this.extractBusinessName();
          if (!name || name === 'Results' || name.length < 2) {
            console.log(`Invalid company name: "${name}"`);
            continue;
          }

          const phone = await this.extractPhone();
          const address = await this.extractAddress();
          const rating = await this.extractRating();
          const reviews = await this.extractReviews();
          const website = await this.extractWebsite();
          const logoUrl = await this.extractLogoUrl();

          let logoData: { url: string; publicId: string } | undefined;
          if (logoUrl) {
            logoData = await this.downloadAndUploadLogo(logoUrl, name);
          }

          const companyData: CompanyData = {
            name,
            phone,
            address,
            rating,
            reviews,
            website,
            city,
            businessType,
            logoUrl: logoData?.url,
            logoPublicId: logoData?.publicId,
          };

          companies.push(companyData);
          console.log(`✅ Scraped: ${name}`);
          console.log(`  Phone: ${phone || 'N/A'}`);
          console.log(`  Address: ${address || 'N/A'}`);
          console.log(`  Rating: ${rating || 'N/A'}`);
          console.log(`  Reviews: ${reviews || 'N/A'}`);
          console.log(`  Website: ${website || 'N/A'}`);
          console.log(`  Logo: ${logoData ? 'Uploaded' : 'N/A'}`);

          await this.randomDelay();

        } catch (error) {
          console.log(`Error processing company ${i + 1}:`, error);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
      }

      console.log(`\n✅ Successfully scraped ${companies.length} companies`);
      return companies;

    } catch (error) {
      console.error('Error during scraping:', error);
      throw error;
    } finally {
      await this.close();
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

export { GoogleMapsScraper };

export async function scrapeGoogleMaps(
  businessType: string,
  city: string,
  options?: ScraperOptions
): Promise<CompanyData[]> {
  const scraper = new GoogleMapsScraper(options);
  return await scraper.scrapeCompanies(businessType, city);
}
