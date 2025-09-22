export type SearchEstateResult = {
  title: string;
  price: number;
  address: string;
  url: string;
  summary: string;
  tags: string[];
  phone?: string;
  imageUrl?: string;
};

export type StagehandListing = {
  title: string;
  address?: string;
  price: number;
  priceRaw: string;
  beds?: number;
  imageUrl?: string;
  phone?: string;
  source: string;
};
