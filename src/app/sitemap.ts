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
      const data = json.data || json;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(`Failed to fetch ${endpoint}:`, error);
      return [];
    }
  }

  // Custom fetcher for sell-animal API which returns { items: [...], total: N }
  async function fetchSellAnimals(): Promise<any[]> {
    try {
      const res = await fetch(`${baseUrl}/api/sell-animal?limit=1000&status=ACCEPTED`, {
        next: { revalidate: 3600 }
      });
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json.items) ? json.items : [];
    } catch (error) {
      console.error("Failed to fetch sell-animal:", error);
      return [];
    }
  }

  // Fetch dynamic content
  const [
    products,
    vetPartners,
    salesPartners,
    vaPartners,
    studentPartners,
    companies,
    news,
    vacancies,
    jobPosts,
    facultyPartners,
    farmerPartners,
    dynamicForms,
    sellAnimals,
  ] = await Promise.all([
    fetchData<any>("product"),
    fetchData<any>("partner?partnerTypeGroup=veterinarian"),
    fetchData<any>("partner?partnerTypeGroup=sales"),
    fetchData<any>("partner?partnerTypeGroup=veterinary_assistant"),
    fetchData<any>("partner?partnerTypeGroup=student"),
    fetchData<any>("company"),
    fetchData<any>("animal-news"),
    fetchData<any>("vacancyForm"),
    fetchData<any>("traditionaljobpost"),
    fetchData<any>("partner?partnerTypeGroup=faculty"),
    fetchData<any>("partner?partnerTypeGroup=farmer"),
    fetchData<any>("dynamic-forms"),
    fetchSellAnimals(),
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
    {
      url: `${baseUrl}/Faculty`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/Farmers`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/master-trainer`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/forms`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
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

  // Veterinarian partner pages
  const vetPages: MetadataRoute.Sitemap = vetPartners
    .filter((p: any) => p.id)
    .map((p: any) => ({
      url: `${baseUrl}/Veternarians/${p.id}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

  // Sales partner pages
  const salesPages: MetadataRoute.Sitemap = salesPartners
    .filter((p: any) => p.id)
    .map((p: any) => ({
      url: `${baseUrl}/Sales/${p.id}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

  // Veterinary assistant pages
  const vaPages: MetadataRoute.Sitemap = vaPartners
    .filter((p: any) => p.id)
    .map((p: any) => ({
      url: `${baseUrl}/VeterinaryAssistants/${p.id}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

  // Student pages
  const studentPages: MetadataRoute.Sitemap = studentPartners
    .filter((p: any) => p.id)
    .map((p: any) => ({
      url: `${baseUrl}/Students/${p.id}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.5,
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

  // Buy/animal listing pages (from sell-animal API, not products)
  const animalPages: MetadataRoute.Sitemap = sellAnimals
    .filter((a: any) => a.id)
    .map((a: any) => ({
      url: `${baseUrl}/buy/${a.id}`,
      lastModified: a.updatedAt ? new Date(a.updatedAt) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  // Faculty pages
  const facultyPages: MetadataRoute.Sitemap = facultyPartners
    .filter((partner: any) => partner.id)
    .map((partner: any) => ({
      url: `${baseUrl}/Faculty/${partner.id}`,
      lastModified: partner.updatedAt ? new Date(partner.updatedAt) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

  // Farmer pages
  const farmerPages: MetadataRoute.Sitemap = farmerPartners
    .filter((partner: any) => partner.id)
    .map((partner: any) => ({
      url: `${baseUrl}/Farmers/${partner.id}`,
      lastModified: partner.updatedAt ? new Date(partner.updatedAt) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

  // Dynamic form pages
  const formPages: MetadataRoute.Sitemap = dynamicForms
    .filter((form: any) => form.slug && form.isActive !== false)
    .map((form: any) => ({
      url: `${baseUrl}/forms/${form.slug}`,
      lastModified: form.updatedAt ? new Date(form.updatedAt) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

  return [
    ...staticPages,
    ...productPages,
    ...vetPages,
    ...salesPages,
    ...vaPages,
    ...studentPages,
    ...companyPages,
    ...newsPages,
    ...vacancyPages,
    ...jobPostPages,
    ...animalPages,
    ...facultyPages,
    ...farmerPages,
    ...formPages,
  ].sort((a, b) => (b.priority || 0) - (a.priority || 0));
}
