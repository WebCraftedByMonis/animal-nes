import { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.animalwellness.shop";

  async function fetchData<T>(endpoint: string): Promise<T[]> {
    try {
      const res = await fetch(`${baseUrl}/api/${endpoint}`, { 
        next: { revalidate: 3600 }
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || json || [];
    } catch (error) {
      console.error(`Failed to fetch ${endpoint}:`, error);
      return [];
    }
  }

  // Fetch dynamic content
  const [
    products,
    partners,
    companies,
    news,
    vacancies,
    jobPosts,
    applicants,
  ] = await Promise.all([
    fetchData<any>("product"),
    fetchData<any>("partner"), 
    fetchData<any>("company"),
    fetchData<any>("animal-news"),
    fetchData<any>("vacancyForm"),
    fetchData<any>("traditionaljobpost"),
    fetchData<any>("jobApplicant"),
  ]);

  // High-priority static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: "daily", 
      priority: 0.9,
    },
    {
      url: `${baseUrl}/findDoctor`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/jobvacancy`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/traditionaljobposts`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/Veternarians`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/VeterinaryAssistants`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/Students`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/Sales`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/Companies`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/buy`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/animal-news`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/Applicants`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ];

  // Dynamic product pages
  const productPages: MetadataRoute.Sitemap = products
    .filter((product: any) => product.id && product.isActive !== false)
    .map((product: any) => ({
      url: `${baseUrl}/products/${product.id}`,
      lastModified: product.updatedAt ? new Date(product.updatedAt) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  // Veterinary partner pages  
  const partnerPages: MetadataRoute.Sitemap = partners
    .filter((partner: any) => partner.id)
    .map((partner: any) => ({
      url: `${baseUrl}/Veternarians/${partner.id}`,
      lastModified: partner.updatedAt ? new Date(partner.updatedAt) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

  // Company pages
  const companyPages: MetadataRoute.Sitemap = companies
    .filter((company: any) => company.id)
    .map((company: any) => ({
      url: `${baseUrl}/Companies/${company.id}`,
      lastModified: company.updatedAt ? new Date(company.updatedAt) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));

  // Animal news pages
  const newsPages: MetadataRoute.Sitemap = news
    .filter((article: any) => article.id)
    .map((article: any) => ({
      url: `${baseUrl}/animal-news/${article.id}`,
      lastModified: article.updatedAt ? new Date(article.updatedAt) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

  // Job vacancy pages
  const vacancyPages: MetadataRoute.Sitemap = vacancies
    .filter((vacancy: any) => vacancy.id)
    .map((vacancy: any) => ({
      url: `${baseUrl}/jobvacancy/${vacancy.id}`,
      lastModified: vacancy.updatedAt ? new Date(vacancy.updatedAt) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  // Traditional job post pages
  const jobPostPages: MetadataRoute.Sitemap = jobPosts
    .filter((job: any) => job.id)
    .map((job: any) => ({
      url: `${baseUrl}/traditionaljobposts/${job.id}`,
      lastModified: job.updatedAt ? new Date(job.updatedAt) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  // Buy/animal listing pages
  const animalPages: MetadataRoute.Sitemap = products
    .filter((product: any) => product.id && product.category === "animals")
    .map((product: any) => ({
      url: `${baseUrl}/buy/${product.id}`,
      lastModified: product.updatedAt ? new Date(product.updatedAt) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  return [
    ...staticPages,
    ...productPages,
    ...partnerPages,
    ...companyPages,
    ...newsPages,
    ...vacancyPages,
    ...jobPostPages,
    ...animalPages,
  ].sort((a, b) => (b.priority || 0) - (a.priority || 0));
}