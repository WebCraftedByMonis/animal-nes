import { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.animalwellness.shop";

  // helper to fetch JSON safely
  async function fetchData<T>(url: string): Promise<T[]> {
    try {
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || json; // adjust depending on your API shape
    } catch (e) {
      console.error("❌ Failed to fetch", url, e);
      return [];
    }
  }

  // fetch data from your APIs
  const [
    products,
    companies,
    applicants,
    vacancies,
    news,
    partners,
    jobPosts,
  ] = await Promise.all([
    fetchData<any>(`${baseUrl}/api/products`),
    fetchData<any>(`${baseUrl}/api/companies`),
    fetchData<any>(`${baseUrl}/api/jobApplicants`),
    fetchData<any>(`${baseUrl}/api/vacancyForms`),
    fetchData<any>(`${baseUrl}/api/animal-news`),
    fetchData<any>(`${baseUrl}/api/partners`),
    fetchData<any>(`${baseUrl}/api/traditionaljobposts`),
  ]);

  // Static important pages
  const staticPages: MetadataRoute.Sitemap = [
    "",
    "products",
    "companies",
    "jobvacancy",
    "job-posts",
    "applicant",
    "Veternarians",
    "sale",
    "buy",
    "findDoctor",
    "about",
    "contact",
  ].map((path) => ({
    url: `${baseUrl}/${path}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: path === "" ? 1.0 : 0.8,
  }));

  // Dynamic pages
const productPages = products.map((p: any) => ({
  url: `${baseUrl}/products/${p.id}`,  // ✅ enforce ID
  lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
  changeFrequency: "weekly" as const,
  priority: 0.7,
}));

const companyPages = companies.map((c: any) => ({
  url: `${baseUrl}/companies/${c.id}`,  // ✅ enforce ID
  lastModified: c.createdAt ? new Date(c.createdAt) : new Date(),
  changeFrequency: "weekly" as const,
  priority: 0.6,
}));

const applicantPages = applicants.map((a: any) => ({
  url: `${baseUrl}/applicant/${a.id}`,  // ✅ enforce ID
  lastModified: a.dateOfBirth ? new Date(a.dateOfBirth) : new Date(),
  changeFrequency: "monthly" as const,
  priority: 0.5,
}));

const vacancyPages = vacancies.map((v: any) => ({
  url: `${baseUrl}/jobvacancy/${v.id}`,  // ✅ enforce ID
  lastModified: v.updatedAt ? new Date(v.updatedAt) : new Date(),
  changeFrequency: "weekly" as const,
  priority: 0.7,
}));

const newsPages = news.map((n: any) => ({
  url: `${baseUrl}/animal-news/${n.id}`,  // ✅ enforce ID
  lastModified: n.createdAt ? new Date(n.createdAt) : new Date(),
  changeFrequency: "weekly" as const,
  priority: 0.6,
}));

const partnerPages = partners.map((p: any) => ({
  url: `${baseUrl}/veterinary-partners/${p.id}`,  // ✅ enforce ID
  lastModified: p.createdAt ? new Date(p.createdAt) : new Date(),
  changeFrequency: "weekly" as const,
  priority: 0.6,
}));

const jobPostPages = jobPosts.map((j: any) => ({
  url: `${baseUrl}/job-posts/${j.id}`,  // ✅ enforce ID
  lastModified: j.updatedAt ? new Date(j.updatedAt) : new Date(),
  changeFrequency: "weekly" as const,
  priority: 0.7,
}));


  return [
    ...staticPages,
    ...productPages,
    ...companyPages,
    ...applicantPages,
    ...vacancyPages,
    ...newsPages,
    ...partnerPages,
    ...jobPostPages,
  ];
}
