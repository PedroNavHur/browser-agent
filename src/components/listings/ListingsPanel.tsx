"use client";

import { useMutation, useQuery } from "convex/react";
import Image from "next/image";
import { api } from "@/lib/convexApi";

const FALLBACK_IMAGE = "https://images.buscalo.dev/placeholder/apartment.jpg";

type Listing = {
  id: string;
  title: string;
  address: string;
  price: number;
  phone?: string;
  imageUrl?: string;
  url: string;
};

type ListingsPanelProps = {
  onFavorited?: (listingId: string) => void;
};

export function ListingsPanel({ onFavorited }: ListingsPanelProps) {
  const listings = useQuery(api.listings.listListings, {}) ?? [];
  const favorites = useQuery(api.listings.listFavorites, {}) ?? [];
  const favoriteListing = useMutation(api.listings.favoriteListing);

  const handleFavorite = async (listingId: string) => {
    await favoriteListing({ listingId });
    onFavorited?.(listingId);
  };

  return (
    <section className="card h-full bg-base-100 shadow-xl">
      <div className="card-body flex h-full flex-col gap-6">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="card-title">Live listings</h2>
            <p className="text-sm opacity-70">
              Listings captured via Buscalo tools. Favorite the ones you like.
            </p>
          </div>
          <span className="badge badge-outline">{listings.length} active</span>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {listings.length === 0 ? (
            <div className="rounded-box border border-dashed border-base-300 p-4 text-sm opacity-70">
              Ask Buscalo to pull some listings and they'll appear here.
            </div>
          ) : (
            listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onFavorite={handleFavorite}
              />
            ))
          )}
        </div>

        <FavoritesList favorites={favorites} />
      </div>
    </section>
  );
}

type ListingCardProps = {
  listing: Listing;
  onFavorite: (listingId: string) => void;
};

function ListingCard({ listing, onFavorite }: ListingCardProps) {
  return (
    <article className="flex gap-3 rounded-box border border-base-300 bg-base-200/60 p-3">
      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-box bg-base-300">
        <Image
          src={listing.imageUrl ?? FALLBACK_IMAGE}
          alt={listing.title}
          fill
          className="object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <a
            href={listing.url}
            target="_blank"
            rel="noreferrer"
            className="font-semibold hover:underline"
          >
            {listing.title}
          </a>
          <span className="font-semibold text-primary">
            ${listing.price.toLocaleString("en-US")}
          </span>
        </div>
        <p className="text-sm opacity-80">{listing.address}</p>
        {listing.phone ? (
          <p className="text-xs opacity-60">☎ {listing.phone}</p>
        ) : null}
        <div className="mt-2 flex items-center gap-2">
          <button
            className="btn btn-sm btn-primary"
            type="button"
            onClick={() => onFavorite(listing.id)}
          >
            Favorite
          </button>
        </div>
      </div>
    </article>
  );
}

type FavoritesListProps = {
  favorites: Listing[];
};

function FavoritesList({ favorites }: FavoritesListProps) {
  return (
    <footer className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Favorites</h3>
        <span className="badge badge-outline">{favorites.length}</span>
      </div>
      <div className="space-y-3">
        {favorites.length === 0 ? (
          <p className="text-sm opacity-70">
            Favorited listings will move here for quick reference.
          </p>
        ) : (
          favorites.map((favorite) => (
            <article
              key={favorite.id}
              className="flex gap-3 rounded-box border border-base-200 bg-base-200/40 p-3"
            >
              <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-box bg-base-300">
                <Image
                  src={favorite.imageUrl ?? FALLBACK_IMAGE}
                  alt={favorite.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <a
                  href={favorite.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium hover:underline"
                >
                  {favorite.title}
                </a>
                <span className="text-sm opacity-80">{favorite.address}</span>
                {favorite.phone ? (
                  <span className="text-xs opacity-60">☎ {favorite.phone}</span>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>
    </footer>
  );
}
