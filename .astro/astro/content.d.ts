declare module 'astro:content' {
	interface RenderResult {
		Content: import('astro/runtime/server/index.js').AstroComponentFactory;
		headings: import('astro').MarkdownHeading[];
		remarkPluginFrontmatter: Record<string, any>;
	}
	interface Render {
		'.md': Promise<RenderResult>;
	}

	export interface RenderedContent {
		html: string;
		metadata?: {
			imagePaths: Array<string>;
			[key: string]: unknown;
		};
	}
}

declare module 'astro:content' {
	type Flatten<T> = T extends { [K: string]: infer U } ? U : never;

	export type CollectionKey = keyof AnyEntryMap;
	export type CollectionEntry<C extends CollectionKey> = Flatten<AnyEntryMap[C]>;

	export type ContentCollectionKey = keyof ContentEntryMap;
	export type DataCollectionKey = keyof DataEntryMap;

	type AllValuesOf<T> = T extends any ? T[keyof T] : never;
	type ValidContentEntrySlug<C extends keyof ContentEntryMap> = AllValuesOf<
		ContentEntryMap[C]
	>['slug'];

	/** @deprecated Use `getEntry` instead. */
	export function getEntryBySlug<
		C extends keyof ContentEntryMap,
		E extends ValidContentEntrySlug<C> | (string & {}),
	>(
		collection: C,
		// Note that this has to accept a regular string too, for SSR
		entrySlug: E,
	): E extends ValidContentEntrySlug<C>
		? Promise<CollectionEntry<C>>
		: Promise<CollectionEntry<C> | undefined>;

	/** @deprecated Use `getEntry` instead. */
	export function getDataEntryById<C extends keyof DataEntryMap, E extends keyof DataEntryMap[C]>(
		collection: C,
		entryId: E,
	): Promise<CollectionEntry<C>>;

	export function getCollection<C extends keyof AnyEntryMap, E extends CollectionEntry<C>>(
		collection: C,
		filter?: (entry: CollectionEntry<C>) => entry is E,
	): Promise<E[]>;
	export function getCollection<C extends keyof AnyEntryMap>(
		collection: C,
		filter?: (entry: CollectionEntry<C>) => unknown,
	): Promise<CollectionEntry<C>[]>;

	export function getEntry<
		C extends keyof ContentEntryMap,
		E extends ValidContentEntrySlug<C> | (string & {}),
	>(entry: {
		collection: C;
		slug: E;
	}): E extends ValidContentEntrySlug<C>
		? Promise<CollectionEntry<C>>
		: Promise<CollectionEntry<C> | undefined>;
	export function getEntry<
		C extends keyof DataEntryMap,
		E extends keyof DataEntryMap[C] | (string & {}),
	>(entry: {
		collection: C;
		id: E;
	}): E extends keyof DataEntryMap[C]
		? Promise<DataEntryMap[C][E]>
		: Promise<CollectionEntry<C> | undefined>;
	export function getEntry<
		C extends keyof ContentEntryMap,
		E extends ValidContentEntrySlug<C> | (string & {}),
	>(
		collection: C,
		slug: E,
	): E extends ValidContentEntrySlug<C>
		? Promise<CollectionEntry<C>>
		: Promise<CollectionEntry<C> | undefined>;
	export function getEntry<
		C extends keyof DataEntryMap,
		E extends keyof DataEntryMap[C] | (string & {}),
	>(
		collection: C,
		id: E,
	): E extends keyof DataEntryMap[C]
		? Promise<DataEntryMap[C][E]>
		: Promise<CollectionEntry<C> | undefined>;

	/** Resolve an array of entry references from the same collection */
	export function getEntries<C extends keyof ContentEntryMap>(
		entries: {
			collection: C;
			slug: ValidContentEntrySlug<C>;
		}[],
	): Promise<CollectionEntry<C>[]>;
	export function getEntries<C extends keyof DataEntryMap>(
		entries: {
			collection: C;
			id: keyof DataEntryMap[C];
		}[],
	): Promise<CollectionEntry<C>[]>;

	export function render<C extends keyof AnyEntryMap>(
		entry: AnyEntryMap[C][string],
	): Promise<RenderResult>;

	export function reference<C extends keyof AnyEntryMap>(
		collection: C,
	): import('astro/zod').ZodEffects<
		import('astro/zod').ZodString,
		C extends keyof ContentEntryMap
			? {
					collection: C;
					slug: ValidContentEntrySlug<C>;
				}
			: {
					collection: C;
					id: keyof DataEntryMap[C];
				}
	>;
	// Allow generic `string` to avoid excessive type errors in the config
	// if `dev` is not running to update as you edit.
	// Invalid collection names will be caught at build time.
	export function reference<C extends string>(
		collection: C,
	): import('astro/zod').ZodEffects<import('astro/zod').ZodString, never>;

	type ReturnTypeOrOriginal<T> = T extends (...args: any[]) => infer R ? R : T;
	type InferEntrySchema<C extends keyof AnyEntryMap> = import('astro/zod').infer<
		ReturnTypeOrOriginal<Required<ContentConfig['collections'][C]>['schema']>
	>;

	type ContentEntryMap = {
		"blog": {
"en/5-reasons-why-banggai-is-a-hidden-paradise.md": {
	id: "en/5-reasons-why-banggai-is-a-hidden-paradise.md";
  slug: "en/5-reasons-why-banggai-is-a-hidden-paradise";
  body: string;
  collection: "blog";
  data: InferEntrySchema<"blog">
} & { render(): Render[".md"] };
"en/diving-guide-in-paisu-pok-lake.md": {
	id: "en/diving-guide-in-paisu-pok-lake.md";
  slug: "en/diving-guide-in-paisu-pok-lake";
  body: string;
  collection: "blog";
  data: InferEntrySchema<"blog">
} & { render(): Render[".md"] };
"en/exploring-piala-waterfall.md": {
	id: "en/exploring-piala-waterfall.md";
  slug: "en/exploring-piala-waterfall";
  body: string;
  collection: "blog";
  data: InferEntrySchema<"blog">
} & { render(): Render[".md"] };
"es/5-reasons-why-banggai-is-a-hidden-paradise.md": {
	id: "es/5-reasons-why-banggai-is-a-hidden-paradise.md";
  slug: "es/5-reasons-why-banggai-is-a-hidden-paradise";
  body: string;
  collection: "blog";
  data: InferEntrySchema<"blog">
} & { render(): Render[".md"] };
"es/diving-guide-in-paisu-pok-lake.md": {
	id: "es/diving-guide-in-paisu-pok-lake.md";
  slug: "es/diving-guide-in-paisu-pok-lake";
  body: string;
  collection: "blog";
  data: InferEntrySchema<"blog">
} & { render(): Render[".md"] };
"es/exploring-piala-waterfall.md": {
	id: "es/exploring-piala-waterfall.md";
  slug: "es/exploring-piala-waterfall";
  body: string;
  collection: "blog";
  data: InferEntrySchema<"blog">
} & { render(): Render[".md"] };
"fr/5-reasons-why-banggai-is-a-hidden-paradise.md": {
	id: "fr/5-reasons-why-banggai-is-a-hidden-paradise.md";
  slug: "fr/5-reasons-why-banggai-is-a-hidden-paradise";
  body: string;
  collection: "blog";
  data: InferEntrySchema<"blog">
} & { render(): Render[".md"] };
"fr/diving-guide-in-paisu-pok-lake.md": {
	id: "fr/diving-guide-in-paisu-pok-lake.md";
  slug: "fr/diving-guide-in-paisu-pok-lake";
  body: string;
  collection: "blog";
  data: InferEntrySchema<"blog">
} & { render(): Render[".md"] };
"fr/exploring-piala-waterfall.md": {
	id: "fr/exploring-piala-waterfall.md";
  slug: "fr/exploring-piala-waterfall";
  body: string;
  collection: "blog";
  data: InferEntrySchema<"blog">
} & { render(): Render[".md"] };
"id/5-reasons-why-banggai-is-a-hidden-paradise.md": {
	id: "id/5-reasons-why-banggai-is-a-hidden-paradise.md";
  slug: "id/5-reasons-why-banggai-is-a-hidden-paradise";
  body: string;
  collection: "blog";
  data: InferEntrySchema<"blog">
} & { render(): Render[".md"] };
"id/diving-guide-in-paisu-pok-lake.md": {
	id: "id/diving-guide-in-paisu-pok-lake.md";
  slug: "id/diving-guide-in-paisu-pok-lake";
  body: string;
  collection: "blog";
  data: InferEntrySchema<"blog">
} & { render(): Render[".md"] };
"id/exploring-piala-waterfall.md": {
	id: "id/exploring-piala-waterfall.md";
  slug: "id/exploring-piala-waterfall";
  body: string;
  collection: "blog";
  data: InferEntrySchema<"blog">
} & { render(): Render[".md"] };
"zh/5-reasons-why-banggai-is-a-hidden-paradise.md": {
	id: "zh/5-reasons-why-banggai-is-a-hidden-paradise.md";
  slug: "zh/5-reasons-why-banggai-is-a-hidden-paradise";
  body: string;
  collection: "blog";
  data: InferEntrySchema<"blog">
} & { render(): Render[".md"] };
"zh/diving-guide-in-paisu-pok-lake.md": {
	id: "zh/diving-guide-in-paisu-pok-lake.md";
  slug: "zh/diving-guide-in-paisu-pok-lake";
  body: string;
  collection: "blog";
  data: InferEntrySchema<"blog">
} & { render(): Render[".md"] };
"zh/exploring-piala-waterfall.md": {
	id: "zh/exploring-piala-waterfall.md";
  slug: "zh/exploring-piala-waterfall";
  body: string;
  collection: "blog";
  data: InferEntrySchema<"blog">
} & { render(): Render[".md"] };
};
"destinations": {
"en/bontolan-beach.md": {
	id: "en/bontolan-beach.md";
  slug: "en/bontolan-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"en/bukit-teletubbies.md": {
	id: "en/bukit-teletubbies.md";
  slug: "en/bukit-teletubbies";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"en/goa-buloling.md": {
	id: "en/goa-buloling.md";
  slug: "en/goa-buloling";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"en/kamumu-waterfall.md": {
	id: "en/kamumu-waterfall.md";
  slug: "en/kamumu-waterfall";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"en/kawalu-bay.md": {
	id: "en/kawalu-bay.md";
  slug: "en/kawalu-bay";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"en/kilo-5-beach.md": {
	id: "en/kilo-5-beach.md";
  slug: "en/kilo-5-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"en/laumarang-waterfall.md": {
	id: "en/laumarang-waterfall.md";
  slug: "en/laumarang-waterfall";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"en/long-beach.md": {
	id: "en/long-beach.md";
  slug: "en/long-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"en/mandel-beach.md": {
	id: "en/mandel-beach.md";
  slug: "en/mandel-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"en/mbuang-mbuang-island.md": {
	id: "en/mbuang-mbuang-island.md";
  slug: "en/mbuang-mbuang-island";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"en/mokokawa-waterfall.md": {
	id: "en/mokokawa-waterfall.md";
  slug: "en/mokokawa-waterfall";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"en/oyama-beach.md": {
	id: "en/oyama-beach.md";
  slug: "en/oyama-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"en/paisu-batango-lake.md": {
	id: "en/paisu-batango-lake.md";
  slug: "en/paisu-batango-lake";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"en/paisu-pok-lake.md": {
	id: "en/paisu-pok-lake.md";
  slug: "en/paisu-pok-lake";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"en/piala-waterfall.md": {
	id: "en/piala-waterfall.md";
  slug: "en/piala-waterfall";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"en/poganda-beach.md": {
	id: "en/poganda-beach.md";
  slug: "en/poganda-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"en/pompon-beach.md": {
	id: "en/pompon-beach.md";
  slug: "en/pompon-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"en/pulau-dua-balantak.md": {
	id: "en/pulau-dua-balantak.md";
  slug: "en/pulau-dua-balantak";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"en/salodik-waterfall.md": {
	id: "en/salodik-waterfall.md";
  slug: "en/salodik-waterfall";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"en/teduang-beach.md": {
	id: "en/teduang-beach.md";
  slug: "en/teduang-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"es/bontolan-beach.md": {
	id: "es/bontolan-beach.md";
  slug: "es/bontolan-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"es/bukit-teletubbies.md": {
	id: "es/bukit-teletubbies.md";
  slug: "es/bukit-teletubbies";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"es/goa-buloling.md": {
	id: "es/goa-buloling.md";
  slug: "es/goa-buloling";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"es/kamumu-waterfall.md": {
	id: "es/kamumu-waterfall.md";
  slug: "es/kamumu-waterfall";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"es/kawalu-bay.md": {
	id: "es/kawalu-bay.md";
  slug: "es/kawalu-bay";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"es/kilo-5-beach.md": {
	id: "es/kilo-5-beach.md";
  slug: "es/kilo-5-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"es/laumarang-waterfall.md": {
	id: "es/laumarang-waterfall.md";
  slug: "es/laumarang-waterfall";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"es/long-beach.md": {
	id: "es/long-beach.md";
  slug: "es/long-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"es/mandel-beach.md": {
	id: "es/mandel-beach.md";
  slug: "es/mandel-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"es/mbuang-mbuang-island.md": {
	id: "es/mbuang-mbuang-island.md";
  slug: "es/mbuang-mbuang-island";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"es/mokokawa-waterfall.md": {
	id: "es/mokokawa-waterfall.md";
  slug: "es/mokokawa-waterfall";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"es/oyama-beach.md": {
	id: "es/oyama-beach.md";
  slug: "es/oyama-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"es/paisu-batango-lake.md": {
	id: "es/paisu-batango-lake.md";
  slug: "es/paisu-batango-lake";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"es/paisu-pok-lake.md": {
	id: "es/paisu-pok-lake.md";
  slug: "es/paisu-pok-lake";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"es/piala-waterfall.md": {
	id: "es/piala-waterfall.md";
  slug: "es/piala-waterfall";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"es/poganda-beach.md": {
	id: "es/poganda-beach.md";
  slug: "es/poganda-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"es/pompon-beach.md": {
	id: "es/pompon-beach.md";
  slug: "es/pompon-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"es/pulau-dua-balantak.md": {
	id: "es/pulau-dua-balantak.md";
  slug: "es/pulau-dua-balantak";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"es/salodik-waterfall.md": {
	id: "es/salodik-waterfall.md";
  slug: "es/salodik-waterfall";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"es/teduang-beach.md": {
	id: "es/teduang-beach.md";
  slug: "es/teduang-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"fr/bontolan-beach.md": {
	id: "fr/bontolan-beach.md";
  slug: "fr/bontolan-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"fr/bukit-teletubbies.md": {
	id: "fr/bukit-teletubbies.md";
  slug: "fr/bukit-teletubbies";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"fr/goa-buloling.md": {
	id: "fr/goa-buloling.md";
  slug: "fr/goa-buloling";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"fr/kamumu-waterfall.md": {
	id: "fr/kamumu-waterfall.md";
  slug: "fr/kamumu-waterfall";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"fr/kawalu-bay.md": {
	id: "fr/kawalu-bay.md";
  slug: "fr/kawalu-bay";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"fr/kilo-5-beach.md": {
	id: "fr/kilo-5-beach.md";
  slug: "fr/kilo-5-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"fr/laumarang-waterfall.md": {
	id: "fr/laumarang-waterfall.md";
  slug: "fr/laumarang-waterfall";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"fr/long-beach.md": {
	id: "fr/long-beach.md";
  slug: "fr/long-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"fr/mandel-beach.md": {
	id: "fr/mandel-beach.md";
  slug: "fr/mandel-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"fr/mbuang-mbuang-island.md": {
	id: "fr/mbuang-mbuang-island.md";
  slug: "fr/mbuang-mbuang-island";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"fr/mokokawa-waterfall.md": {
	id: "fr/mokokawa-waterfall.md";
  slug: "fr/mokokawa-waterfall";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"fr/oyama-beach.md": {
	id: "fr/oyama-beach.md";
  slug: "fr/oyama-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"fr/paisu-batango-lake.md": {
	id: "fr/paisu-batango-lake.md";
  slug: "fr/paisu-batango-lake";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"fr/paisu-pok-lake.md": {
	id: "fr/paisu-pok-lake.md";
  slug: "fr/paisu-pok-lake";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"fr/piala-waterfall.md": {
	id: "fr/piala-waterfall.md";
  slug: "fr/piala-waterfall";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"fr/poganda-beach.md": {
	id: "fr/poganda-beach.md";
  slug: "fr/poganda-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"fr/pompon-beach.md": {
	id: "fr/pompon-beach.md";
  slug: "fr/pompon-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"fr/pulau-dua-balantak.md": {
	id: "fr/pulau-dua-balantak.md";
  slug: "fr/pulau-dua-balantak";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"fr/salodik-waterfall.md": {
	id: "fr/salodik-waterfall.md";
  slug: "fr/salodik-waterfall";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"fr/teduang-beach.md": {
	id: "fr/teduang-beach.md";
  slug: "fr/teduang-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"id/bontolan-beach.md": {
	id: "id/bontolan-beach.md";
  slug: "id/bontolan-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"id/bukit-teletubbies.md": {
	id: "id/bukit-teletubbies.md";
  slug: "id/bukit-teletubbies";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"id/goa-buloling.md": {
	id: "id/goa-buloling.md";
  slug: "id/goa-buloling";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"id/kamumu-waterfall.md": {
	id: "id/kamumu-waterfall.md";
  slug: "id/kamumu-waterfall";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"id/kawalu-bay.md": {
	id: "id/kawalu-bay.md";
  slug: "id/kawalu-bay";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"id/kilo-5-beach.md": {
	id: "id/kilo-5-beach.md";
  slug: "id/kilo-5-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"id/laumarang-waterfall.md": {
	id: "id/laumarang-waterfall.md";
  slug: "id/laumarang-waterfall";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"id/long-beach.md": {
	id: "id/long-beach.md";
  slug: "id/long-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"id/mandel-beach.md": {
	id: "id/mandel-beach.md";
  slug: "id/mandel-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"id/mbuang-mbuang-island.md": {
	id: "id/mbuang-mbuang-island.md";
  slug: "id/mbuang-mbuang-island";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"id/mokokawa-waterfall.md": {
	id: "id/mokokawa-waterfall.md";
  slug: "id/mokokawa-waterfall";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"id/oyama-beach.md": {
	id: "id/oyama-beach.md";
  slug: "id/oyama-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"id/paisu-batango-lake.md": {
	id: "id/paisu-batango-lake.md";
  slug: "id/paisu-batango-lake";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"id/paisu-pok-lake.md": {
	id: "id/paisu-pok-lake.md";
  slug: "id/paisu-pok-lake";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"id/piala-waterfall.md": {
	id: "id/piala-waterfall.md";
  slug: "id/piala-waterfall";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"id/poganda-beach.md": {
	id: "id/poganda-beach.md";
  slug: "id/poganda-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"id/pompon-beach.md": {
	id: "id/pompon-beach.md";
  slug: "id/pompon-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"id/pulau-dua-balantak.md": {
	id: "id/pulau-dua-balantak.md";
  slug: "id/pulau-dua-balantak";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"id/salodik-waterfall.md": {
	id: "id/salodik-waterfall.md";
  slug: "id/salodik-waterfall";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"id/teduang-beach.md": {
	id: "id/teduang-beach.md";
  slug: "id/teduang-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"zh/bontolan-beach.md": {
	id: "zh/bontolan-beach.md";
  slug: "zh/bontolan-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"zh/bukit-teletubbies.md": {
	id: "zh/bukit-teletubbies.md";
  slug: "zh/bukit-teletubbies";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"zh/goa-buloling.md": {
	id: "zh/goa-buloling.md";
  slug: "zh/goa-buloling";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"zh/kamumu-waterfall.md": {
	id: "zh/kamumu-waterfall.md";
  slug: "zh/kamumu-waterfall";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"zh/kawalu-bay.md": {
	id: "zh/kawalu-bay.md";
  slug: "zh/kawalu-bay";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"zh/kilo-5-beach.md": {
	id: "zh/kilo-5-beach.md";
  slug: "zh/kilo-5-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"zh/laumarang-waterfall.md": {
	id: "zh/laumarang-waterfall.md";
  slug: "zh/laumarang-waterfall";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"zh/long-beach.md": {
	id: "zh/long-beach.md";
  slug: "zh/long-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"zh/mandel-beach.md": {
	id: "zh/mandel-beach.md";
  slug: "zh/mandel-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"zh/mbuang-mbuang-island.md": {
	id: "zh/mbuang-mbuang-island.md";
  slug: "zh/mbuang-mbuang-island";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"zh/mokokawa-waterfall.md": {
	id: "zh/mokokawa-waterfall.md";
  slug: "zh/mokokawa-waterfall";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"zh/oyama-beach.md": {
	id: "zh/oyama-beach.md";
  slug: "zh/oyama-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"zh/paisu-batango-lake.md": {
	id: "zh/paisu-batango-lake.md";
  slug: "zh/paisu-batango-lake";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"zh/paisu-pok-lake.md": {
	id: "zh/paisu-pok-lake.md";
  slug: "zh/paisu-pok-lake";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"zh/piala-waterfall.md": {
	id: "zh/piala-waterfall.md";
  slug: "zh/piala-waterfall";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"zh/poganda-beach.md": {
	id: "zh/poganda-beach.md";
  slug: "zh/poganda-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"zh/pompon-beach.md": {
	id: "zh/pompon-beach.md";
  slug: "zh/pompon-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"zh/pulau-dua-balantak.md": {
	id: "zh/pulau-dua-balantak.md";
  slug: "zh/pulau-dua-balantak";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"zh/salodik-waterfall.md": {
	id: "zh/salodik-waterfall.md";
  slug: "zh/salodik-waterfall";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
"zh/teduang-beach.md": {
	id: "zh/teduang-beach.md";
  slug: "zh/teduang-beach";
  body: string;
  collection: "destinations";
  data: InferEntrySchema<"destinations">
} & { render(): Render[".md"] };
};
"packages": {
"en/banggai-wonderland.md": {
	id: "en/banggai-wonderland.md";
  slug: "en/banggai-wonderland";
  body: string;
  collection: "packages";
  data: InferEntrySchema<"packages">
} & { render(): Render[".md"] };
"en/luwuk--salakan-escape.md": {
	id: "en/luwuk--salakan-escape.md";
  slug: "en/luwuk--salakan-escape";
  body: string;
  collection: "packages";
  data: InferEntrySchema<"packages">
} & { render(): Render[".md"] };
"en/luwuk-stopover.md": {
	id: "en/luwuk-stopover.md";
  slug: "en/luwuk-stopover";
  body: string;
  collection: "packages";
  data: InferEntrySchema<"packages">
} & { render(): Render[".md"] };
"en/ultimate-banggai.md": {
	id: "en/ultimate-banggai.md";
  slug: "en/ultimate-banggai";
  body: string;
  collection: "packages";
  data: InferEntrySchema<"packages">
} & { render(): Render[".md"] };
"es/banggai-wonderland.md": {
	id: "es/banggai-wonderland.md";
  slug: "es/banggai-wonderland";
  body: string;
  collection: "packages";
  data: InferEntrySchema<"packages">
} & { render(): Render[".md"] };
"es/luwuk--salakan-escape.md": {
	id: "es/luwuk--salakan-escape.md";
  slug: "es/luwuk--salakan-escape";
  body: string;
  collection: "packages";
  data: InferEntrySchema<"packages">
} & { render(): Render[".md"] };
"es/luwuk-stopover.md": {
	id: "es/luwuk-stopover.md";
  slug: "es/luwuk-stopover";
  body: string;
  collection: "packages";
  data: InferEntrySchema<"packages">
} & { render(): Render[".md"] };
"es/ultimate-banggai.md": {
	id: "es/ultimate-banggai.md";
  slug: "es/ultimate-banggai";
  body: string;
  collection: "packages";
  data: InferEntrySchema<"packages">
} & { render(): Render[".md"] };
"fr/banggai-wonderland.md": {
	id: "fr/banggai-wonderland.md";
  slug: "fr/banggai-wonderland";
  body: string;
  collection: "packages";
  data: InferEntrySchema<"packages">
} & { render(): Render[".md"] };
"fr/luwuk--salakan-escape.md": {
	id: "fr/luwuk--salakan-escape.md";
  slug: "fr/luwuk--salakan-escape";
  body: string;
  collection: "packages";
  data: InferEntrySchema<"packages">
} & { render(): Render[".md"] };
"fr/luwuk-stopover.md": {
	id: "fr/luwuk-stopover.md";
  slug: "fr/luwuk-stopover";
  body: string;
  collection: "packages";
  data: InferEntrySchema<"packages">
} & { render(): Render[".md"] };
"fr/ultimate-banggai.md": {
	id: "fr/ultimate-banggai.md";
  slug: "fr/ultimate-banggai";
  body: string;
  collection: "packages";
  data: InferEntrySchema<"packages">
} & { render(): Render[".md"] };
"id/banggai-wonderland.md": {
	id: "id/banggai-wonderland.md";
  slug: "id/banggai-wonderland";
  body: string;
  collection: "packages";
  data: InferEntrySchema<"packages">
} & { render(): Render[".md"] };
"id/luwuk--salakan-escape.md": {
	id: "id/luwuk--salakan-escape.md";
  slug: "id/luwuk--salakan-escape";
  body: string;
  collection: "packages";
  data: InferEntrySchema<"packages">
} & { render(): Render[".md"] };
"id/luwuk-stopover.md": {
	id: "id/luwuk-stopover.md";
  slug: "id/luwuk-stopover";
  body: string;
  collection: "packages";
  data: InferEntrySchema<"packages">
} & { render(): Render[".md"] };
"id/ultimate-banggai.md": {
	id: "id/ultimate-banggai.md";
  slug: "id/ultimate-banggai";
  body: string;
  collection: "packages";
  data: InferEntrySchema<"packages">
} & { render(): Render[".md"] };
"zh/banggai-wonderland.md": {
	id: "zh/banggai-wonderland.md";
  slug: "zh/banggai-wonderland";
  body: string;
  collection: "packages";
  data: InferEntrySchema<"packages">
} & { render(): Render[".md"] };
"zh/luwuk--salakan-escape.md": {
	id: "zh/luwuk--salakan-escape.md";
  slug: "zh/luwuk--salakan-escape";
  body: string;
  collection: "packages";
  data: InferEntrySchema<"packages">
} & { render(): Render[".md"] };
"zh/luwuk-stopover.md": {
	id: "zh/luwuk-stopover.md";
  slug: "zh/luwuk-stopover";
  body: string;
  collection: "packages";
  data: InferEntrySchema<"packages">
} & { render(): Render[".md"] };
"zh/ultimate-banggai.md": {
	id: "zh/ultimate-banggai.md";
  slug: "zh/ultimate-banggai";
  body: string;
  collection: "packages";
  data: InferEntrySchema<"packages">
} & { render(): Render[".md"] };
};

	};

	type DataEntryMap = {
		
	};

	type AnyEntryMap = ContentEntryMap & DataEntryMap;

	export type ContentConfig = typeof import("../../src/content/config.js");
}
