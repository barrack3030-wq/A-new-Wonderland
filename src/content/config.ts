import { z, defineCollection } from 'astro:content';

const destinationsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    image: z.string(),
    imageAlt: z.string().optional(),
    location: z.string(),
    category: z.string(),
    highlights: z.array(z.string()).optional(),
    activities: z.array(z.string()).optional(),
    bestTime: z.string().optional(),
    travelTips: z.array(z.string()).optional(),
    gallery: z.array(z.string()).optional(),
    relatedDestinations: z.array(z.string()).optional(),
  }),
});

const packagesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    image: z.string(),
    imageAlt: z.string().optional(),
    duration: z.string(),
    destination: z.string(),
    activities: z.array(z.string()).optional(),
    included: z.array(z.string()).optional(),
    excluded: z.array(z.string()).optional(),
    itinerary: z.array(z.object({
      day: z.string(),
      title: z.string(),
      description: z.string()
    })).optional(),
    gallery: z.array(z.string()).optional(),
  }),
});

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    image: z.string(),
    imageAlt: z.string().optional(),
    author: z.string(),
    pubDate: z.date(),
    tags: z.array(z.string()).optional(),
  }),
});

export const collections = {
  'destinations': destinationsCollection,
  'packages': packagesCollection,
  'blog': blogCollection,
};
